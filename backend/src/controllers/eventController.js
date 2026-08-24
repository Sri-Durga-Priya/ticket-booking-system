import EventListing from '../models/EventListing.js';
import Show from '../models/Show.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @desc    Get all active event listings with type and search filters
 * @route   GET /api/events
 * @access  Public
 */
export const getEvents = asyncHandler(async (req, res) => {
  const { type, search, organiser, city, date, timeSlot } = req.query;
  const filter = { isActive: true };

  if (type && ['movie', 'concert'].includes(type)) {
    filter.type = type;
  }

  if (organiser) {
    filter.organiser = organiser;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Build Show-level filter for city, date, and timeSlot
  const showFilter = { status: { $in: ['scheduled', 'ongoing'] } };

  if (city) {
    const { default: Venue } = await import('../models/Venue.js');
    const matchingVenues = await Venue.find({ city: { $regex: new RegExp(`^${city}$`, 'i') } }).select('_id');
    showFilter.venue = { $in: matchingVenues.map((v) => v._id) };
  }

  if (date) {
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
    showFilter.date = { $gte: startOfDay, $lte: endOfDay };
  }

  if (timeSlot) {
    if (timeSlot === 'morning') {
      showFilter.startTime = { $lt: '12:00' };
    } else if (timeSlot === 'afternoon') {
      showFilter.startTime = { $gte: '12:00', $lt: '17:00' };
    } else if (timeSlot === 'evening') {
      showFilter.startTime = { $gte: '17:00', $lt: '21:00' };
    } else if (timeSlot === 'night') {
      showFilter.startTime = { $gte: '21:00' };
    } else {
      showFilter.startTime = { $regex: timeSlot, $options: 'i' };
    }
  }

  // If any show criteria is applied (city, date, timeSlot), match event listings
  if (city || date || timeSlot) {
    const matchingShows = await Show.find(showFilter).select('eventListing');
    const matchingEventIds = [...new Set(matchingShows.map((s) => s.eventListing.toString()))];
    filter._id = { $in: matchingEventIds };
  }

  const events = await EventListing.find(filter)
    .populate('organiser', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Attach show cities, showtimes, and starting prices to each event
  const allShows = await Show.find({
    eventListing: { $in: events.map((e) => e._id) },
    status: { $in: ['scheduled', 'ongoing'] },
  }).populate('venue', 'name city address');

  const eventsWithMetadata = events.map((ev) => {
    const evShows = allShows.filter((s) => s.eventListing.toString() === ev._id.toString());
    const cities = [...new Set(evShows.map((s) => s.venue?.city).filter(Boolean))];
    const prices = evShows.flatMap((s) => s.categoryPricing?.map((p) => p.price) || []).filter((p) => typeof p === 'number');
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    
    // Sort upcoming showtimes
    const upcomingShowtimes = evShows
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((s) => ({
        _id: s._id,
        date: s.date,
        startTime: s.startTime,
        venueName: s.venue?.name,
        city: s.venue?.city,
      }));

    return {
      ...ev,
      cities,
      showCount: evShows.length,
      startingPrice: minPrice,
      showtimes: upcomingShowtimes,
    };
  });

  res.status(200).json({
    success: true,
    count: eventsWithMetadata.length,
    data: eventsWithMetadata,
  });
});

/**
 * @desc    Get single event by ID with its upcoming shows
 * @route   GET /api/events/:id
 * @access  Public
 */
export const getEventById = asyncHandler(async (req, res, next) => {
  const event = await EventListing.findById(req.params.id).populate('organiser', 'name email');
  if (!event) {
    return next(new AppError(`Event listing not found with ID ${req.params.id}`, 404));
  }

  // Find upcoming scheduled shows for this event
  const shows = await Show.find({
    eventListing: event._id,
    status: { $in: ['scheduled', 'ongoing'] },
  })
    .populate('venue', 'name city address categories totalCapacity')
    .sort({ date: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    data: {
      ...event.toObject(),
      shows,
    },
  });
});

/**
 * @desc    Get events created by currently logged-in organiser
 * @route   GET /api/events/my-events
 * @access  Private (Organiser & Admin)
 */
export const getMyEvents = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { organiser: req.user._id };

  const events = await EventListing.find(filter)
    .populate('organiser', 'name email')
    .sort({ createdAt: -1 });

  // Attach show count to each event
  const eventIds = events.map((e) => e._id);
  const showCounts = await Show.aggregate([
    { $match: { eventListing: { $in: eventIds } } },
    { $group: { _id: '$eventListing', count: { $sum: 1 } } },
  ]);

  const showCountMap = {};
  showCounts.forEach((s) => {
    showCountMap[s._id.toString()] = s.count;
  });

  const eventsWithStats = events.map((ev) => ({
    ...ev.toObject(),
    totalShows: showCountMap[ev._id.toString()] || 0,
  }));

  res.status(200).json({
    success: true,
    count: eventsWithStats.length,
    data: eventsWithStats,
  });
});

/**
 * @desc    Create a new movie or concert listing
 * @route   POST /api/events
 * @access  Private (Organiser & Admin)
 */
export const createEvent = asyncHandler(async (req, res, next) => {
  const { title, type, description, posterUrl } = req.body;

  if (!title || !type) {
    return next(new AppError('Please provide event title and type (movie | concert).', 400));
  }

  if (!['movie', 'concert'].includes(type)) {
    return next(new AppError('Invalid event type. Must be "movie" or "concert".', 400));
  }

  const defaultPosters = {
    movie: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    concert: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
  };

  const newEvent = await EventListing.create({
    organiser: req.user._id,
    title: title.trim(),
    type,
    description: description?.trim() || '',
    posterUrl: posterUrl?.trim() || defaultPosters[type],
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Event listing created successfully',
    data: newEvent,
  });
});

/**
 * @desc    Update an existing event listing
 * @route   PUT /api/events/:id
 * @access  Private (Organiser & Admin)
 */
export const updateEvent = asyncHandler(async (req, res, next) => {
  const event = await EventListing.findById(req.params.id);
  if (!event) {
    return next(new AppError(`Event not found with ID ${req.params.id}`, 404));
  }

  // Check ownership unless admin
  if (req.user.role !== 'admin' && event.organiser.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to edit this event listing.', 403));
  }

  const { title, type, description, posterUrl, isActive } = req.body;

  if (title) event.title = title.trim();
  if (type && ['movie', 'concert'].includes(type)) event.type = type;
  if (description !== undefined) event.description = description.trim();
  if (posterUrl !== undefined) event.posterUrl = posterUrl.trim();
  if (typeof isActive === 'boolean') event.isActive = isActive;

  await event.save();

  res.status(200).json({
    success: true,
    message: 'Event listing updated successfully',
    data: event,
  });
});

/**
 * @desc    Delete an event listing
 * @route   DELETE /api/events/:id
 * @access  Private (Organiser & Admin)
 */
export const deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await EventListing.findById(req.params.id);
  if (!event) {
    return next(new AppError(`Event not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin' && event.organiser.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this event listing.', 403));
  }

  // Check if any shows exist for this event
  const showCount = await Show.countDocuments({ eventListing: event._id });
  if (showCount > 0) {
    return next(new AppError(`Cannot delete event: ${showCount} show(s) are attached to this listing. Cancel or delete the shows first.`, 400));
  }

  await EventListing.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Event listing deleted successfully',
  });
});
