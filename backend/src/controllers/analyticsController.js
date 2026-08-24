import mongoose from 'mongoose';
import { Booking, Show, ShowSeat, Waitlist, EventListing, Venue } from '../models/index.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @desc    Get comprehensive organiser analytics (Revenue, Occupancy, Category Distribution, Waitlist Conversions)
 * @route   GET /api/analytics
 * @access  Private (Organiser, Admin)
 */
export const getOrganiserAnalytics = asyncHandler(async (req, res) => {
  const isOrganiser = req.user.role === 'organiser';
  const userId = req.user._id;

  // 1. Determine which events and shows belong to this user
  let eventFilter = {};
  if (isOrganiser) {
    eventFilter = { organiser: userId };
  }

  const events = await EventListing.find(eventFilter).select('_id title type posterUrl');
  const eventIds = events.map((e) => e._id);

  // Find all shows linked to these events
  const shows = await Show.find({ eventListing: { $in: eventIds } })
    .populate('eventListing', 'title type posterUrl')
    .populate('venue', 'name city totalCapacity categories seatLayout')
    .lean();

  const showIds = shows.map((s) => s._id);

  // 2. Fetch all confirmed bookings for these shows
  const confirmedBookings = await Booking.find({
    show: { $in: showIds },
    status: 'confirmed',
  }).lean();

  // 3. Compute KPI Summary Metrics
  let totalRevenue = 0;
  let totalTicketsSold = 0;
  let directBookingsCount = 0;
  let waitlistBookingsCount = 0;
  let directRevenue = 0;
  let waitlistRevenue = 0;

  const categoryRevenueMap = {};

  confirmedBookings.forEach((b) => {
    totalRevenue += b.totalAmount || 0;
    const ticketCount = b.seats?.length || 0;
    totalTicketsSold += ticketCount;

    if (b.source === 'waitlist') {
      waitlistBookingsCount += ticketCount;
      waitlistRevenue += b.totalAmount || 0;
    } else {
      directBookingsCount += ticketCount;
      directRevenue += b.totalAmount || 0;
    }

    // Category breakdown
    b.seats?.forEach((seat) => {
      const cat = seat.category || 'Standard';
      const price = seat.priceAtBooking || 0;
      if (!categoryRevenueMap[cat]) {
        categoryRevenueMap[cat] = { category: cat, revenue: 0, ticketsSold: 0 };
      }
      categoryRevenueMap[cat].revenue += price;
      categoryRevenueMap[cat].ticketsSold += 1;
    });
  });

  // 4. Compute Live Seat Occupancy across all shows
  const allShowSeats = await ShowSeat.find({ show: { $in: showIds } }).lean();

  const seatCountsByShow = {};
  showIds.forEach((id) => {
    seatCountsByShow[id.toString()] = { available: 0, held: 0, booked: 0, total: 0 };
  });

  let globalTotalSeats = 0;
  let globalBookedSeats = 0;
  let globalHeldSeats = 0;
  let globalAvailableSeats = 0;

  allShowSeats.forEach((s) => {
    const showIdStr = s.show.toString();
    if (seatCountsByShow[showIdStr]) {
      seatCountsByShow[showIdStr].total += 1;
      globalTotalSeats += 1;

      if (s.status === 'booked') {
        seatCountsByShow[showIdStr].booked += 1;
        globalBookedSeats += 1;
      } else if (s.status === 'held') {
        seatCountsByShow[showIdStr].held += 1;
        globalHeldSeats += 1;
      } else {
        seatCountsByShow[showIdStr].available += 1;
        globalAvailableSeats += 1;
      }
    }
  });

  const overallOccupancyRate =
    globalTotalSeats > 0 ? Math.round((globalBookedSeats / globalTotalSeats) * 100) : 0;

  // 5. Fetch Waitlist Metrics
  const waitlistEntries = await Waitlist.find({ show: { $in: showIds } }).lean();

  let totalWaitlistWaiting = 0;
  let totalWaitlistOffered = 0;
  let totalWaitlistClaimed = 0;
  let totalWaitlistExpired = 0;

  waitlistEntries.forEach((w) => {
    if (w.status === 'waiting') totalWaitlistWaiting += 1;
    else if (w.status === 'offered') totalWaitlistOffered += 1;
    else if (w.status === 'claimed') totalWaitlistClaimed += 1;
    else if (w.status === 'expired') totalWaitlistExpired += 1;
  });

  const totalCompletedOffers = totalWaitlistClaimed + totalWaitlistExpired;
  const waitlistConversionRate =
    totalCompletedOffers > 0 ? Math.round((totalWaitlistClaimed / totalCompletedOffers) * 100) : 0;

  // 6. Per-Show Detailed Analytics Breakdown
  const perShowAnalytics = shows.map((show) => {
    const showIdStr = show._id.toString();
    const seatStats = seatCountsByShow[showIdStr] || { total: 0, booked: 0, available: 0, held: 0 };
    const showCapacity = show.venue?.totalCapacity || seatStats.total || 0;
    const occupancyRate =
      showCapacity > 0 ? Math.round((seatStats.booked / showCapacity) * 100) : 0;

    // Show revenue
    const showBookings = confirmedBookings.filter((b) => b.show.toString() === showIdStr);
    const showRevenue = showBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Show waitlist count
    const showWaitlistCount = waitlistEntries.filter(
      (w) => w.show.toString() === showIdStr && w.status === 'waiting'
    ).length;

    return {
      _id: show._id,
      eventTitle: show.eventListing?.title || 'Untitled Event',
      eventType: show.eventListing?.type || 'movie',
      posterUrl: show.eventListing?.posterUrl,
      venueName: show.venue?.name || 'Main Hall',
      venueCity: show.venue?.city || 'Metropolis',
      date: show.date,
      startTime: show.startTime,
      status: show.status,
      totalCapacity: showCapacity,
      bookedSeats: seatStats.booked,
      availableSeats: seatStats.available,
      heldSeats: seatStats.held,
      occupancyRate,
      revenue: showRevenue,
      waitlistBacklog: showWaitlistCount,
      categoryPricing: show.categoryPricing || [],
    };
  });

  res.status(200).json({
    success: true,
    data: {
      kpis: {
        totalRevenue,
        totalTicketsSold,
        overallOccupancyRate,
        totalShowsCount: shows.length,
        totalEventsCount: events.length,
        waitlistBacklog: totalWaitlistWaiting,
        waitlistConversionRate,
        directRevenue,
        waitlistRevenue,
        directBookingsCount,
        waitlistBookingsCount,
      },
      categoryDistribution: Object.values(categoryRevenueMap),
      waitlistFunnel: {
        waiting: totalWaitlistWaiting,
        offered: totalWaitlistOffered,
        claimed: totalWaitlistClaimed,
        expired: totalWaitlistExpired,
        conversionRate: waitlistConversionRate,
      },
      shows: perShowAnalytics,
    },
  });
});
