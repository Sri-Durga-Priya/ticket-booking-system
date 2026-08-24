import crypto from 'crypto';
import Show from '../models/Show.js';
import ShowSeat from '../models/ShowSeat.js';
import Booking from '../models/Booking.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { emitBatchSeatUpdate } from '../socket.js';

/**
 * Generate human-readable booking reference (e.g. TN-7X9K2L1)
 */
export const generateBookingReference = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No confusing 0/O or 1/I
  let ref = 'TN-';
  for (let i = 0; i < 7; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

/**
 * @desc    Place atomic time-boxed holds on one or more seats for a show
 * @route   POST /api/bookings/hold
 * @access  Private (Customer, Organiser, Admin)
 */
export const holdSeats = asyncHandler(async (req, res, next) => {
  const { showId, seatIds } = req.body;
  const customerId = req.user._id;

  if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return next(new AppError('Please provide showId and an array of seatIds to hold.', 400));
  }

  if (seatIds.length > 6) {
    return next(new AppError('You can hold a maximum of 6 seats at a time.', 400));
  }

  // 1. Verify show is scheduled and active
  const show = await Show.findById(showId);
  if (!show || show.status !== 'scheduled') {
    return next(new AppError('Show is not available for booking.', 400));
  }

  const holdTtlMinutes = Number(process.env.HOLD_TTL_MINUTES) || 10;
  const holdExpiresAt = new Date(Date.now() + holdTtlMinutes * 60 * 1000);
  const now = new Date();

  // 2. ATOMIC CONCURRENCY MECHANISM:
  // Attempt to atomically claim each requested seat one-by-one with rollback on any conflict
  const successfullyHeldSeats = [];
  const conflictedSeatIds = [];

  for (const seatId of seatIds) {
    const heldSeat = await ShowSeat.findOneAndUpdate(
      {
        show: show._id,
        seatId: seatId,
        $or: [
          { status: 'available' },
          { status: 'held', heldBy: customerId }, // Customer refreshing/re-holding own seat
          { status: 'held', holdExpiresAt: { $lt: now } }, // Lazy expiry reclamation
        ],
      },
      {
        $set: {
          status: 'held',
          heldBy: customerId,
          holdExpiresAt: holdExpiresAt,
        },
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (heldSeat) {
      successfullyHeldSeats.push(heldSeat);
    } else {
      conflictedSeatIds.push(seatId);
    }
  }

  // 3. If ANY seat failed the atomic check, roll back all holds placed during this batch request
  if (conflictedSeatIds.length > 0) {
    if (successfullyHeldSeats.length > 0) {
      const rollbackIds = successfullyHeldSeats.map((s) => s._id);
      await ShowSeat.updateMany(
        { _id: { $in: rollbackIds }, status: 'held', heldBy: customerId },
        { $set: { status: 'available', heldBy: null, holdExpiresAt: null } }
      );

      const refreshedRollbackSeats = await ShowSeat.find({ _id: { $in: rollbackIds } }).lean();
      emitBatchSeatUpdate(show._id.toString(), refreshedRollbackSeats);
    }

    return next(
      new AppError(
        `409 Conflict — Seat(s) ${conflictedSeatIds.join(', ')} were just held or booked by another customer. Please choose different seats.`,
        409,
        { conflictedSeatIds }
      )
    );
  }

  // 4. Success: Emit real-time update to all viewers of this show
  emitBatchSeatUpdate(show._id.toString(), successfullyHeldSeats);

  res.status(200).json({
    success: true,
    message: `${successfullyHeldSeats.length} seat(s) held successfully for ${holdTtlMinutes} minutes.`,
    data: {
      showId: show._id,
      heldSeats: successfullyHeldSeats,
      holdExpiresAt: holdExpiresAt.toISOString(),
      holdTtlMinutes,
    },
  });
});

/**
 * @desc    Explicitly release customer's seat holds (e.g. checkout cancellation / abandonment)
 * @route   POST /api/bookings/release-hold
 * @access  Private (Customer, Organiser, Admin)
 */
export const releaseHold = asyncHandler(async (req, res, next) => {
  const { showId, seatIds } = req.body;
  const customerId = req.user._id;

  if (!showId) {
    return next(new AppError('showId is required to release holds.', 400));
  }

  const query = {
    show: showId,
    status: 'held',
    heldBy: customerId,
    booking: null,
  };

  if (Array.isArray(seatIds) && seatIds.length > 0) {
    query.seatId = { $in: seatIds };
  }

  const seatsToRelease = await ShowSeat.find(query);
  if (seatsToRelease.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No active holds found for release.',
      releasedCount: 0,
    });
  }

  const releaseIds = seatsToRelease.map((s) => s._id);
  await ShowSeat.updateMany(
    { _id: { $in: releaseIds } },
    { $set: { status: 'available', heldBy: null, holdExpiresAt: null } }
  );

  const updatedSeats = await ShowSeat.find({ _id: { $in: releaseIds } }).lean();
  emitBatchSeatUpdate(showId.toString(), updatedSeats);

  res.status(200).json({
    success: true,
    message: `${releaseIds.length} seat hold(s) released successfully.`,
    releasedCount: releaseIds.length,
  });
});

/**
 * @desc    Confirm checkout: Convert active holds to booked and create confirmed Booking with snapshot pricing
 * @route   POST /api/bookings/checkout
 * @access  Private (Customer, Organiser, Admin)
 */
export const checkout = asyncHandler(async (req, res, next) => {
  const { showId, seatIds, source = 'direct', paymentMethod = 'simulated_card' } = req.body;
  const customerId = req.user._id;

  if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return next(new AppError('Please provide showId and seatIds for checkout.', 400));
  }

  // 1. Fetch Show and live pricing
  const show = await Show.findById(showId).populate('venue', 'name address city categories');
  if (!show || show.status !== 'scheduled') {
    return next(new AppError('Show is no longer active for booking.', 400));
  }

  // Create fast category pricing map
  const priceMap = {};
  show.categoryPricing.forEach((cp) => {
    priceMap[cp.category] = cp.price;
  });

  const now = new Date();

  // 2. Validate that ALL requested seats are held by this user and NOT expired
  const heldSeats = await ShowSeat.find({
    show: show._id,
    seatId: { $in: seatIds },
    status: 'held',
    heldBy: customerId,
    holdExpiresAt: { $gt: now },
    booking: null,
  });

  if (heldSeats.length !== seatIds.length) {
    const foundSeatIds = heldSeats.map((s) => s.seatId);
    const missingSeatIds = seatIds.filter((s) => !foundSeatIds.includes(s));
    return next(
      new AppError(
        `Checkout failed: Seat(s) ${missingSeatIds.join(', ')} hold has expired or was not secured. Please return to the seat map to re-select.`,
        400,
        { missingSeatIds }
      )
    );
  }

  // 3. Snapshot Pricing Calculation (Critical Requirement: SNAPSHOT PRICING NEVER RE-READS LIVE SHOW PRICING)
  const bookedSeatsSnapshot = heldSeats.map((seat) => {
    const snapshotPrice = priceMap[seat.category] || 15;
    return {
      seatId: seat.seatId,
      category: seat.category,
      priceAtBooking: snapshotPrice,
    };
  });

  const totalAmount = bookedSeatsSnapshot.reduce((sum, s) => sum + s.priceAtBooking, 0);
  const bookingReference = generateBookingReference();

  // QR Code Payload (JSON string encoding the booking reference, show, customer, and seat list)
  const qrCodePayload = JSON.stringify({
    ref: bookingReference,
    show: show._id,
    seats: bookedSeatsSnapshot.map((s) => s.seatId),
    customer: customerId,
    total: totalAmount,
    issuedAt: now.toISOString(),
  });

  // 4. Create Confirmed Booking Document
  const booking = await Booking.create({
    customer: customerId,
    show: show._id,
    seats: bookedSeatsSnapshot,
    totalAmount,
    bookingReference,
    qrCodePayload,
    status: 'confirmed',
    source: ['direct', 'waitlist'].includes(source) ? source : 'direct',
    bookedAt: now,
  });

  // 5. Convert ShowSeats from 'held' to 'booked' and attach booking reference
  const seatDbIds = heldSeats.map((s) => s._id);
  await ShowSeat.updateMany(
    { _id: { $in: seatDbIds } },
    {
      $set: {
        status: 'booked',
        heldBy: null,
        holdExpiresAt: null,
        booking: booking._id,
      },
      $inc: { version: 1 },
    }
  );

  // 6. Broadcast 'booked' status to all live viewers
  const updatedBookedSeats = await ShowSeat.find({ _id: { $in: seatDbIds } }).lean();
  emitBatchSeatUpdate(show._id.toString(), updatedBookedSeats);

  // 7. Trigger QR code generation & confirmation email asynchronously (Task 9 hook)
  try {
    const { sendTicketConfirmationEmail } = await import('../services/emailService.js').catch(() => ({}));
    if (typeof sendTicketConfirmationEmail === 'function') {
      sendTicketConfirmationEmail(booking._id).catch((err) => {
        console.warn('[Email] Non-blocking email delivery notice:', err.message);
      });
    }
  } catch (emailErr) {
    console.warn('[Email] Ticket email service notice:', emailErr.message);
  }

  const populatedBooking = await Booking.findById(booking._id)
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl description' },
        { path: 'venue', select: 'name address city' },
      ],
    })
    .populate('customer', 'name email phone');

  res.status(201).json({
    success: true,
    message: 'Booking confirmed successfully! Your tickets are ready.',
    data: populatedBooking,
  });
});

/**
 * @desc    Get booking details by ID
 * @route   GET /api/bookings/:id
 * @access  Private (Owner or Admin)
 */
export const getBookingById = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl description' },
        { path: 'venue', select: 'name address city categories' },
      ],
    })
    .populate('customer', 'name email phone');

  if (!booking) {
    return next(new AppError(`Booking not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin' && booking.customer._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to view this booking.', 403));
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * @desc    Get booking history for currently logged in customer
 * @route   GET /api/bookings/my-bookings
 * @access  Private (Customer, Organiser, Admin)
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id })
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl' },
        { path: 'venue', select: 'name city address' },
      ],
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

/**
 * @desc    Verify booking ticket by reference (Public scanner / verification endpoint)
 * @route   GET /api/bookings/verify/:ref
 * @access  Public
 */
export const verifyBooking = asyncHandler(async (req, res, next) => {
  const ref = req.params.ref?.toUpperCase().trim();

  const booking = await Booking.findOne({ bookingReference: ref })
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl' },
        { path: 'venue', select: 'name address city' },
      ],
    })
    .populate('customer', 'name email');

  if (!booking) {
    return res.status(404).json({
      success: false,
      isValid: false,
      message: `Invalid Ticket: No booking found with reference "${ref}"`,
    });
  }

  const isConfirmed = booking.status === 'confirmed';

  res.status(200).json({
    success: true,
    isValid: isConfirmed,
    status: booking.status,
    data: {
      bookingReference: booking.bookingReference,
      customerName: booking.customer?.name,
      customerEmail: booking.customer?.email,
      eventTitle: booking.show?.eventListing?.title,
      eventType: booking.show?.eventListing?.type,
      venueName: booking.show?.venue?.name,
      venueCity: booking.show?.venue?.city,
      showDate: booking.show?.date,
      startTime: booking.show?.startTime,
      seats: booking.seats,
      totalAmount: booking.totalAmount,
      bookedAt: booking.bookedAt,
      source: booking.source,
      status: booking.status,
    },
  });
});

/**
 * @desc    Cancel a confirmed booking and trigger automatic waitlist cascading
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private (Owner or Admin)
 */
export const cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError(`Booking not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin' && booking.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to cancel this booking.', 403));
  }

  if (booking.status === 'cancelled') {
    return next(new AppError('Booking is already cancelled.', 400));
  }

  // 1. Mark booking as cancelled
  booking.status = 'cancelled';
  await booking.save();

  // 2. Free up associated ShowSeats
  const seatIds = booking.seats.map((s) => s.seatId);
  await ShowSeat.updateMany(
    { show: booking.show, seatId: { $in: seatIds }, booking: booking._id },
    {
      $set: {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
        booking: null,
      },
      $inc: { version: 1 },
    }
  );

  // 3. CRITICAL WAITLIST CASCADE TRIGGER:
  // For each freed seat, check if there is a waiting customer and offer it immediately
  const waitlistOffers = [];
  try {
    const { assignSeatToNextInWaitlist } = await import('../services/waitlistService.js');
    for (const seatObj of booking.seats) {
      const offerResult = await assignSeatToNextInWaitlist(
        booking.show.toString(),
        seatObj.category,
        seatObj.seatId
      );
      if (offerResult) {
        waitlistOffers.push({ seatId: seatObj.seatId, candidateId: offerResult.customer });
      }
    }
  } catch (cascadeErr) {
    console.error('[Cancellation Cascade Error]:', cascadeErr.message);
  }

  // 4. Broadcast batch seat update
  const updatedSeats = await ShowSeat.find({ show: booking.show, seatId: { $in: seatIds } }).lean();
  emitBatchSeatUpdate(booking.show.toString(), updatedSeats);

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully. Seats have been returned to pool / offered to waitlist.',
    waitlistOffersTriggered: waitlistOffers.length,
    data: booking,
  });
});


