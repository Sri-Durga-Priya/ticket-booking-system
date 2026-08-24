import { Waitlist, Show, ShowSeat, Booking, User } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateBookingReference } from './bookingController.js';
import { emitBatchSeatUpdate } from '../socket.js';
import { sendTicketConfirmationEmail } from '../services/emailService.js';

/**
 * @desc    Join the FIFO waitlist for a sold-out category in a show
 * @route   POST /api/waitlist/join
 * @access  Private (Customer, Organiser, Admin)
 */
export const joinWaitlist = asyncHandler(async (req, res, next) => {
  const { showId, category } = req.body;
  const customerId = req.user._id;

  if (!showId || !category) {
    return next(new AppError('showId and seat category are required to join the waitlist.', 400));
  }

  const show = await Show.findById(showId);
  if (!show || show.status !== 'scheduled') {
    return next(new AppError('Show is not active.', 400));
  }

  // 1. Check if user is already waiting or currently holding an offer for this category
  const existingEntry = await Waitlist.findOne({
    show: show._id,
    customer: customerId,
    category: category,
    status: { $in: ['waiting', 'offered'] },
  });

  if (existingEntry) {
    // Calculate current queue position
    const position = await Waitlist.countDocuments({
      show: show._id,
      category: category,
      status: 'waiting',
      joinedAt: { $lte: existingEntry.joinedAt },
    });

    return res.status(200).json({
      success: true,
      message: `You are already on the waitlist for ${category} (Queue Position: #${position}).`,
      data: {
        waitlistId: existingEntry._id,
        status: existingEntry.status,
        queuePosition: position,
        category: existingEntry.category,
      },
    });
  }

  // 2. Create new waitlist entry
  const now = new Date();
  const waitlistEntry = await Waitlist.create({
    show: show._id,
    customer: customerId,
    category: category,
    status: 'waiting',
    joinedAt: now,
  });

  // 3. Determine FIFO position
  const queuePosition = await Waitlist.countDocuments({
    show: show._id,
    category: category,
    status: 'waiting',
    joinedAt: { $lte: now },
  });

  res.status(201).json({
    success: true,
    message: `Joined waitlist successfully for ${category}! You are #${queuePosition} in line.`,
    data: {
      waitlistId: waitlistEntry._id,
      category: waitlistEntry.category,
      queuePosition: queuePosition,
      status: 'waiting',
      joinedAt: waitlistEntry.joinedAt,
    },
  });
});

/**
 * @desc    Get all waitlist entries for the logged-in customer
 * @route   GET /api/waitlist/my-waitlist
 * @access  Private (Customer, Organiser, Admin)
 */
export const getMyWaitlists = asyncHandler(async (req, res) => {
  const waitlists = await Waitlist.find({ customer: req.user._id })
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl' },
        { path: 'venue', select: 'name city' },
      ],
    })
    .sort({ joinedAt: -1 });

  res.status(200).json({
    success: true,
    count: waitlists.length,
    data: waitlists,
  });
});

/**
 * @desc    Get details of an offered seat claim
 * @route   GET /api/waitlist/offer/:id
 * @access  Private (Customer, Organiser, Admin)
 */
export const getWaitlistOffer = asyncHandler(async (req, res, next) => {
  const waitlistId = req.params.id;

  const entry = await Waitlist.findById(waitlistId)
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl description' },
        { path: 'venue', select: 'name address city categories' },
      ],
    })
    .populate('customer', 'name email');

  if (!entry) {
    return next(new AppError('Waitlist offer not found.', 404));
  }

  if (entry.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to view this waitlist offer.', 403));
  }

  const now = new Date();
  const isExpired = entry.status === 'expired' || (entry.offerExpiresAt && entry.offerExpiresAt < now);

  // Find price for this category
  const priceObj = entry.show?.categoryPricing?.find((cp) => cp.category === entry.category);
  const price = priceObj?.price || 20;

  res.status(200).json({
    success: true,
    data: {
      waitlistId: entry._id,
      status: isExpired && entry.status === 'offered' ? 'expired' : entry.status,
      category: entry.category,
      offeredSeat: entry.offeredSeat,
      offerExpiresAt: entry.offerExpiresAt,
      isExpired,
      price,
      show: entry.show,
    },
  });
});

/**
 * @desc    Claim an offered waitlist seat and confirm booking
 * @route   POST /api/waitlist/claim/:id
 * @access  Private (Customer, Organiser, Admin)
 */
export const claimWaitlistOffer = asyncHandler(async (req, res, next) => {
  const waitlistId = req.params.id;
  const customerId = req.user._id;

  const entry = await Waitlist.findById(waitlistId).populate('show');
  if (!entry) {
    return next(new AppError('Waitlist offer not found.', 404));
  }

  if (entry.customer.toString() !== customerId.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to claim this offer.', 403));
  }

  const now = new Date();
  if (entry.status !== 'offered' || (entry.offerExpiresAt && entry.offerExpiresAt < now)) {
    return next(new AppError('This waitlist offer has expired or was already claimed.', 400));
  }

  const show = entry.show;
  const seatId = entry.offeredSeat;

  // 1. Verify that ShowSeat is still held for this user
  const seatDoc = await ShowSeat.findOne({
    show: show._id,
    seatId: seatId,
    status: 'held',
    heldBy: customerId,
  });

  if (!seatDoc) {
    return next(new AppError('Seat hold is no longer valid. Please check if offer timed out.', 400));
  }

  // 2. Snapshot Pricing
  const priceObj = show.categoryPricing?.find((cp) => cp.category === entry.category);
  const priceAtBooking = priceObj?.price || 20;
  const bookingReference = generateBookingReference();

  // 3. Create Confirmed Booking (source: 'waitlist')
  const qrCodePayload = JSON.stringify({
    ref: bookingReference,
    show: show._id,
    seats: [seatId],
    customer: customerId,
    total: priceAtBooking,
    source: 'waitlist',
    issuedAt: now.toISOString(),
  });

  const booking = await Booking.create({
    customer: customerId,
    show: show._id,
    seats: [
      {
        seatId: seatId,
        category: entry.category,
        priceAtBooking: priceAtBooking,
      },
    ],
    totalAmount: priceAtBooking,
    bookingReference,
    qrCodePayload,
    status: 'confirmed',
    source: 'waitlist',
    bookedAt: now,
  });

  // 4. Update ShowSeat to 'booked'
  seatDoc.status = 'booked';
  seatDoc.heldBy = null;
  seatDoc.holdExpiresAt = null;
  seatDoc.booking = booking._id;
  await seatDoc.save();

  // 5. Update Waitlist entry to 'claimed'
  entry.status = 'claimed';
  entry.booking = booking._id;
  await entry.save();

  // 6. Broadcast 'booked' status to live seat map
  emitBatchSeatUpdate(show._id.toString(), [seatDoc]);

  // 7. Send confirmation email asynchronously
  sendTicketConfirmationEmail(booking._id).catch((e) =>
    console.warn('[Email] Waitlist confirmation notice:', e.message)
  );

  const populatedBooking = await Booking.findById(booking._id)
    .populate({
      path: 'show',
      populate: [
        { path: 'eventListing', select: 'title type posterUrl description' },
        { path: 'venue', select: 'name address city' },
      ],
    })
    .populate('customer', 'name email');

  res.status(200).json({
    success: true,
    message: 'Waitlist offer claimed successfully! Ticket issued.',
    data: populatedBooking,
  });
});

/**
 * @desc    Leave the waitlist voluntarily
 * @route   DELETE /api/waitlist/:id
 * @access  Private (Customer, Organiser, Admin)
 */
export const leaveWaitlist = asyncHandler(async (req, res, next) => {
  const entry = await Waitlist.findById(req.params.id);

  if (!entry) {
    return next(new AppError('Waitlist entry not found.', 404));
  }

  if (entry.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to leave this waitlist.', 403));
  }

  // If leaving while in 'offered' state, cascade the held seat to next person
  if (entry.status === 'offered' && entry.offeredSeat) {
    const { assignSeatToNextInWaitlist } = await import('../services/waitlistService.js');
    await assignSeatToNextInWaitlist(entry.show.toString(), entry.category, entry.offeredSeat);
  }

  entry.status = 'cancelled';
  await entry.save();

  res.status(200).json({
    success: true,
    message: 'Removed from waitlist successfully.',
  });
});
