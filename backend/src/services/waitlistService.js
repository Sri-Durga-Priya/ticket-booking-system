import crypto from 'crypto';
import { Waitlist, ShowSeat, Show, Booking, User } from '../models/index.js';
import { emitSeatUpdate, emitBatchSeatUpdate, emitToUser } from '../socket.js';
import { sendWaitlistOfferEmail } from './emailService.js';

/**
 * Assign an open/cancelled seat to the next waiting customer in FIFO queue
 * @param {string} showId - ObjectId of the show
 * @param {string} category - Seat category (e.g. VIP, Standard)
 * @param {string} seatId - String seat identifier (e.g. A1)
 */
export const assignSeatToNextInWaitlist = async (showId, category, seatId) => {
  try {
    const now = new Date();
    const offerTtlMinutes = Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 15;
    const offerExpiresAt = new Date(Date.now() + offerTtlMinutes * 60 * 1000);

    // 1. Find the earliest customer in queue for this (show, category)
    const nextCandidate = await Waitlist.findOne({
      show: showId,
      category: category,
      status: 'waiting',
    })
      .sort({ joinedAt: 1 })
      .populate('customer', 'name email');

    if (!nextCandidate) {
      // No one waiting in this category: Release seat back to available
      await ShowSeat.findOneAndUpdate(
        { show: showId, seatId: seatId, booking: null },
        { $set: { status: 'available', heldBy: null, holdExpiresAt: null } }
      );
      emitSeatUpdate(showId.toString(), {
        seatId,
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      });
      console.log(`[Waitlist] No candidates in queue for ${category}. Seat ${seatId} is now available.`);
      return null;
    }

    // 2. Generate secure claim token
    const claimToken = crypto.randomBytes(24).toString('hex');

    // 3. Atomically update Waitlist entry to 'offered'
    const updatedCandidate = await Waitlist.findOneAndUpdate(
      { _id: nextCandidate._id, status: 'waiting' },
      {
        $set: {
          status: 'offered',
          offeredSeat: seatId,
          claimToken: claimToken,
          offerExpiresAt: offerExpiresAt,
        },
      },
      { new: true }
    );

    if (!updatedCandidate) {
      // Race condition safety: Retry with next candidate if another process claimed this entry
      return await assignSeatToNextInWaitlist(showId, category, seatId);
    }

    // 4. Hold the ShowSeat for this waitlist customer exclusively
    await ShowSeat.findOneAndUpdate(
      { show: showId, seatId: seatId },
      {
        $set: {
          status: 'held',
          heldBy: nextCandidate.customer._id,
          holdExpiresAt: offerExpiresAt,
        },
        $inc: { version: 1 },
      }
    );

    // 5. Broadcast real-time seat update to seat map
    emitSeatUpdate(showId.toString(), {
      seatId,
      status: 'held',
      heldBy: nextCandidate.customer._id.toString(),
      holdExpiresAt: offerExpiresAt.toISOString(),
    });

    // 6. Notify the lucky customer directly via Socket.io private room
    const show = await Show.findById(showId).populate('eventListing', 'title type');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const claimLink = `${clientUrl}/claim-offer/${updatedCandidate._id}?token=${claimToken}`;

    emitToUser(nextCandidate.customer._id.toString(), 'waitlist:offered', {
      waitlistId: updatedCandidate._id,
      showId: showId,
      eventTitle: show?.eventListing?.title,
      category: category,
      seatId: seatId,
      claimLink,
      offerExpiresAt: offerExpiresAt.toISOString(),
      ttlMinutes: offerTtlMinutes,
    });

    console.log(`[Waitlist] Offered Seat ${seatId} (${category}) to customer ${nextCandidate.customer.email}. TTL: ${offerTtlMinutes}m`);

    // 7. Send notification email asynchronously
    sendWaitlistOfferEmail({
      customerEmail: nextCandidate.customer.email,
      customerName: nextCandidate.customer.name,
      eventTitle: show?.eventListing?.title || 'Event',
      showDate: show?.date ? new Date(show.date).toLocaleDateString() : '',
      startTime: show?.startTime || '',
      category: category,
      claimLink,
      expiresAt: offerExpiresAt,
    }).catch((e) => console.warn('[Waitlist Email Notice]:', e.message));

    return updatedCandidate;
  } catch (error) {
    console.error('[Waitlist] Error in assignSeatToNextInWaitlist:', error.message);
    throw error;
  }
};

/**
 * Sweep expired waitlist offers and cascade seats to the next customer in FIFO queue
 */
export const sweepExpiredWaitlistOffers = async () => {
  try {
    const now = new Date();

    // Find all waitlist entries where offer expired and seat is still not booked
    const expiredOffers = await Waitlist.find({
      status: 'offered',
      offerExpiresAt: { $lt: now },
    });

    if (expiredOffers.length === 0) return { sweptCount: 0 };

    console.log(`[Waitlist Sweep] Found ${expiredOffers.length} expired waitlist offer(s). Cascading...`);

    for (const offer of expiredOffers) {
      // Mark as expired
      await Waitlist.findByIdAndUpdate(offer._id, { $set: { status: 'expired' } });

      // Cascade the seat to the next person in line
      if (offer.offeredSeat) {
        await assignSeatToNextInWaitlist(offer.show.toString(), offer.category, offer.offeredSeat);
      }
    }

    return { sweptCount: expiredOffers.length };
  } catch (error) {
    console.error('[Waitlist Sweep Error]:', error.message);
    return { sweptCount: 0, error: error.message };
  }
};
