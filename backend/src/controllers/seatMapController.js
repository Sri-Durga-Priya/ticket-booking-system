import Show from '../models/Show.js';
import ShowSeat from '../models/ShowSeat.js';
import Venue from '../models/Venue.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @desc    Get live visual seat map data for a show with lazy hold expiry safety net
 * @route   GET /api/shows/:id/seats
 * @access  Public (Optional Auth to identify "held by me")
 */
export const getShowSeats = asyncHandler(async (req, res, next) => {
  const showId = req.params.id;

  const show = await Show.findById(showId)
    .populate('eventListing', 'title type posterUrl')
    .populate('venue', 'name address city categories seatLayout totalCapacity');

  if (!show) {
    return next(new AppError(`Show not found with ID ${showId}`, 404));
  }

  const now = new Date();
  const currentUserId = req.user?._id?.toString() || null;

  // 1. Lazy Expiry Safety Net: Auto-release any expired holds on read
  const expiredSeats = await ShowSeat.find({
    show: show._id,
    status: 'held',
    holdExpiresAt: { $lt: now, $ne: null },
    booking: null,
  });

  if (expiredSeats.length > 0) {
    const expiredIds = expiredSeats.map((s) => s._id);
    await ShowSeat.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { status: 'available', heldBy: null, holdExpiresAt: null } }
    );
  }

  // 2. Fetch all live ShowSeats
  const showSeats = await ShowSeat.find({ show: show._id }).lean();

  // Create a fast lookup map for live seat status by seatId
  const seatStatusMap = {};
  showSeats.forEach((seat) => {
    const isHeldByMe = currentUserId && seat.heldBy && seat.heldBy.toString() === currentUserId;
    seatStatusMap[seat.seatId] = {
      _id: seat._id,
      seatId: seat.seatId,
      category: seat.category,
      status: seat.status,
      heldBy: seat.heldBy,
      isHeldByMe: Boolean(isHeldByMe),
      holdExpiresAt: seat.holdExpiresAt,
      booking: seat.booking,
    };
  });

  // Create category price lookup
  const priceMap = {};
  show.categoryPricing.forEach((cp) => {
    priceMap[cp.category] = cp.price;
  });

  // Merge physical layout with live status & pricing
  const physicalLayout = show.venue.seatLayout || [];
  const mergedSeats = physicalLayout.map((seat) => {
    const live = seatStatusMap[seat.seatId] || {
      _id: null,
      seatId: seat.seatId,
      category: seat.category,
      status: 'available',
      isHeldByMe: false,
      holdExpiresAt: null,
    };

    return {
      seatId: seat.seatId,
      row: seat.row,
      number: seat.number,
      category: seat.category,
      price: priceMap[seat.category] || 15,
      x: seat.x,
      y: seat.y,
      status: live.status,
      isHeldByMe: live.isHeldByMe,
      heldBy: live.heldBy,
      holdExpiresAt: live.holdExpiresAt,
    };
  });

  // Category counts and availability stats
  const categoryStats = {};
  show.venue.categories.forEach((cat) => {
    categoryStats[cat.name] = {
      name: cat.name,
      colorTag: cat.colorTag,
      price: priceMap[cat.name] || 15,
      total: 0,
      available: 0,
      held: 0,
      booked: 0,
    };
  });

  mergedSeats.forEach((s) => {
    if (!categoryStats[s.category]) {
      categoryStats[s.category] = {
        name: s.category,
        colorTag: '#6366f1',
        price: priceMap[s.category] || 15,
        total: 0,
        available: 0,
        held: 0,
        booked: 0,
      };
    }
    categoryStats[s.category].total += 1;
    if (s.status === 'available') categoryStats[s.category].available += 1;
    else if (s.status === 'held') categoryStats[s.category].held += 1;
    else if (s.status === 'booked') categoryStats[s.category].booked += 1;
  });

  res.status(200).json({
    success: true,
    data: {
      show: {
        _id: show._id,
        eventListing: show.eventListing,
        venue: {
          _id: show.venue._id,
          name: show.venue.name,
          address: show.venue.address,
          city: show.venue.city,
          totalCapacity: show.venue.totalCapacity,
          categories: show.venue.categories,
        },
        date: show.date,
        startTime: show.startTime,
        categoryPricing: show.categoryPricing,
        status: show.status,
      },
      categoryStats: Object.values(categoryStats),
      seats: mergedSeats,
    },
  });
});
