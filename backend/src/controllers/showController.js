import Show from '../models/Show.js';
import ShowSeat from '../models/ShowSeat.js';
import Venue from '../models/Venue.js';
import EventListing from '../models/EventListing.js';
import Booking from '../models/Booking.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { emitBatchSeatUpdate } from '../socket.js';

/**
 * @desc    Get all shows with filters (event, venue, date, status, city)
 * @route   GET /api/shows
 * @access  Public
 */
export const getShows = asyncHandler(async (req, res) => {
  const { eventListing, venue, date, status, city } = req.query;
  const filter = {};

  if (eventListing) filter.eventListing = eventListing;
  if (venue) filter.venue = venue;
  if (status) filter.status = status;

  if (date) {
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
    filter.date = { $gte: startOfDay, $lte: endOfDay };
  }

  let shows = await Show.find(filter)
    .populate('eventListing', 'title type posterUrl isActive')
    .populate('venue', 'name address city categories totalCapacity')
    .sort({ date: 1, startTime: 1 });

  if (city) {
    shows = shows.filter((s) => s.venue?.city?.toLowerCase() === city.toLowerCase());
  }

  res.status(200).json({
    success: true,
    count: shows.length,
    data: shows,
  });
});

/**
 * @desc    Get single show details by ID
 * @route   GET /api/shows/:id
 * @access  Public
 */
export const getShowById = asyncHandler(async (req, res, next) => {
  const show = await Show.findById(req.params.id)
    .populate('eventListing', 'title type description posterUrl organiser')
    .populate('venue', 'name address city categories seatLayout totalCapacity');

  if (!show) {
    return next(new AppError(`Show not found with ID ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: show,
  });
});

/**
 * @desc    Get shows scheduled by currently logged-in organiser
 * @route   GET /api/shows/my-shows
 * @access  Private (Organiser & Admin)
 */
export const getMyShows = asyncHandler(async (req, res) => {
  let eventFilter = {};
  if (req.user.role !== 'admin') {
    const myEvents = await EventListing.find({ organiser: req.user._id }).select('_id');
    const eventIds = myEvents.map((e) => e._id);
    eventFilter = { eventListing: { $in: eventIds } };
  }

  const shows = await Show.find(eventFilter)
    .populate('eventListing', 'title type posterUrl')
    .populate('venue', 'name city totalCapacity')
    .sort({ date: 1, startTime: 1 });

  // Compute seat occupancy stats for each show
  const showIds = shows.map((s) => s._id);
  const seatStats = await ShowSeat.aggregate([
    { $match: { show: { $in: showIds } } },
    {
      $group: {
        _id: { show: '$show', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const statsMap = {};
  seatStats.forEach((st) => {
    const sId = st._id.show.toString();
    if (!statsMap[sId]) statsMap[sId] = { available: 0, held: 0, booked: 0, total: 0 };
    statsMap[sId][st._id.status] = st.count;
    statsMap[sId].total += st.count;
  });

  const showsWithStats = shows.map((s) => ({
    ...s.toObject(),
    occupancy: statsMap[s._id.toString()] || { available: 0, held: 0, booked: 0, total: s.venue?.totalCapacity || 0 },
  }));

  res.status(200).json({
    success: true,
    count: showsWithStats.length,
    data: showsWithStats,
  });
});

/**
 * @desc    Create a new show and automatically instantiate ShowSeat documents for the venue
 * @route   POST /api/shows
 * @access  Private (Organiser & Admin)
 */
export const createShow = asyncHandler(async (req, res, next) => {
  const { eventListing, venue, date, startTime, categoryPricing } = req.body;

  if (!eventListing || !venue || !date || !startTime || !categoryPricing) {
    return next(new AppError('Please provide eventListing, venue, date, startTime, and categoryPricing.', 400));
  }

  // 1. Verify EventListing exists
  const event = await EventListing.findById(eventListing);
  if (!event) {
    return next(new AppError(`Event listing not found with ID ${eventListing}`, 404));
  }

  if (req.user.role !== 'admin' && event.organiser.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only schedule shows for event listings you created.', 403));
  }

  // 2. Verify Venue exists and has a seatLayout
  const venueDoc = await Venue.findById(venue);
  if (!venueDoc) {
    return next(new AppError(`Venue not found with ID ${venue}`, 404));
  }

  if (!venueDoc.seatLayout || venueDoc.seatLayout.length === 0) {
    return next(new AppError('Selected venue has no physical seat layout configured. Please configure seats first.', 400));
  }

  // 3. Create the Show document
  const showDate = new Date(date);
  const newShow = await Show.create({
    eventListing: event._id,
    venue: venueDoc._id,
    date: showDate,
    startTime: startTime.trim(),
    categoryPricing,
    status: 'scheduled',
  });

  // 4. CRITICAL: Instantiate ShowSeat documents for every physical seat in Venue.seatLayout
  const showSeatDocs = venueDoc.seatLayout.map((seat) => ({
    show: newShow._id,
    seatId: seat.seatId,
    category: seat.category,
    status: 'available',
    heldBy: null,
    holdExpiresAt: null,
    booking: null,
    version: 0,
  }));

  await ShowSeat.insertMany(showSeatDocs);
  console.log(`[Show Created] Initialized ${showSeatDocs.length} ShowSeats for Show ${newShow._id} at venue ${venueDoc.name}`);

  const populatedShow = await Show.findById(newShow._id)
    .populate('eventListing', 'title type posterUrl')
    .populate('venue', 'name city totalCapacity categories');

  res.status(201).json({
    success: true,
    message: 'Show created and seat layout successfully initialized',
    data: populatedShow,
    totalSeatsInitialized: showSeatDocs.length,
  });
});

/**
 * @desc    Update show details or category pricing
 * @route   PUT /api/shows/:id
 * @access  Private (Organiser & Admin)
 */
export const updateShow = asyncHandler(async (req, res, next) => {
  const show = await Show.findById(req.params.id).populate('eventListing', 'organiser');
  if (!show) {
    return next(new AppError(`Show not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin' && show.eventListing.organiser.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to modify this show.', 403));
  }

  const { date, startTime, categoryPricing, status } = req.body;

  if (date) show.date = new Date(date);
  if (startTime) show.startTime = startTime.trim();
  if (categoryPricing && Array.isArray(categoryPricing)) show.categoryPricing = categoryPricing;
  if (status && ['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
    show.status = status;
  }

  await show.save();

  res.status(200).json({
    success: true,
    message: 'Show updated successfully',
    data: show,
  });
});

/**
 * @desc    Cancel a show and release non-booked holds
 * @route   PATCH /api/shows/:id/cancel
 * @access  Private (Organiser & Admin)
 */
export const cancelShow = asyncHandler(async (req, res, next) => {
  const show = await Show.findById(req.params.id).populate('eventListing', 'organiser');
  if (!show) {
    return next(new AppError(`Show not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin' && show.eventListing.organiser.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to cancel this show.', 403));
  }

  show.status = 'cancelled';
  await show.save();

  // Release any active unbooked holds for this show
  await ShowSeat.updateMany(
    { show: show._id, status: 'held', booking: null },
    { $set: { status: 'available', heldBy: null, holdExpiresAt: null } }
  );

  const updatedSeats = await ShowSeat.find({ show: show._id }).lean();
  emitBatchSeatUpdate(show._id.toString(), updatedSeats);

  res.status(200).json({
    success: true,
    message: 'Show cancelled successfully and active holds released',
    data: show,
  });
});
