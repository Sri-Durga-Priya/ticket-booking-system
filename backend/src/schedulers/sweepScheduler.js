import cron from 'node-cron';
import mongoose from 'mongoose';
import { emitBatchSeatUpdate, emitWaitlistNotification } from '../socket.js';

let isSweepRunning = false;

/**
 * Sweep expired seat holds and revert them to available
 */
export const sweepExpiredHolds = async () => {
  if (mongoose.connection.readyState !== 1) return; // Skip if DB not connected
  if (isSweepRunning) return;

  isSweepRunning = true;
  try {
    const ShowSeat = mongoose.models.ShowSeat;
    if (!ShowSeat) return;

    const now = new Date();

    // Find held seats that have expired and are NOT tied to an active waitlist offer
    // (Waitlist holds are handled by the waitlist sweep)
    const expiredSeats = await ShowSeat.find({
      status: 'held',
      holdExpiresAt: { $lt: now, $ne: null },
      booking: null,
    }).lean();

    if (!expiredSeats || expiredSeats.length === 0) {
      return;
    }

    // Group expired seats by showId for batch updates and notifications
    const showGroups = {};
    for (const seat of expiredSeats) {
      const showIdStr = seat.show.toString();
      if (!showGroups[showIdStr]) {
        showGroups[showIdStr] = [];
      }
      showGroups[showIdStr].push(seat._id);
    }

    for (const [showId, seatIds] of Object.entries(showGroups)) {
      // Revert status to available
      await ShowSeat.updateMany(
        { _id: { $in: seatIds }, status: 'held', holdExpiresAt: { $lt: now } },
        {
          $set: {
            status: 'available',
            heldBy: null,
            holdExpiresAt: null,
          },
        }
      );

      // Fetch the updated seats to emit to clients
      const updatedSeats = await ShowSeat.find({ _id: { $in: seatIds } }).lean();

      emitBatchSeatUpdate(showId, updatedSeats);
      console.log(`[Sweep] Auto-released ${seatIds.length} expired seat hold(s) for show ${showId}`);
    }
  } catch (error) {
    console.error('[Sweep] Error sweeping expired seat holds:', error.message);
  } finally {
    isSweepRunning = false;
  }
};

/**
 * Sweep expired waitlist offers and cascade to next in line
 */
export const runWaitlistSweep = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const { sweepExpiredWaitlistOffers } = await import('../services/waitlistService.js');
    await sweepExpiredWaitlistOffers();
  } catch (err) {
    console.error('[Scheduler] Waitlist sweep error:', err.message);
  }
};

/**
 * Initialize background cron sweeps
 */
export const startSweepSchedulers = () => {
  // Run seat hold sweep every 10 seconds
  const holdSweepJob = cron.schedule('*/10 * * * * *', () => {
    sweepExpiredHolds();
  });

  // Run waitlist offer sweep every 15 seconds
  const waitlistSweepJob = cron.schedule('*/15 * * * * *', () => {
    runWaitlistSweep();
  });

  console.log('[Scheduler] Background sweep jobs scheduled: Seat Hold Sweep (10s) & Waitlist Offer Sweep (15s)');

  return {
    holdSweepJob,
    waitlistSweepJob,
  };
};
