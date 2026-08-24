import Venue from '../models/Venue.js';
import Show from '../models/Show.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * Helper to generate visual seat layout grid coordinates
 * @param {Array} rowConfigs - [{ row: 'A', seats: 10, category: 'VIP' }, ...]
 * @returns {Array} seatLayout array with x, y coordinates
 */
export const generateGridSeats = (rowConfigs) => {
  const layout = [];
  let yCoord = 0;

  for (const rowConf of rowConfigs) {
    const rowLabel = rowConf.row.toUpperCase();
    const count = parseInt(rowConf.seats, 10) || 10;
    const category = rowConf.category || 'Standard';

    for (let i = 1; i <= count; i++) {
      layout.push({
        seatId: `${rowLabel}${i}`,
        row: rowLabel,
        number: i,
        category,
        x: i - 1,
        y: yCoord,
      });
    }
    yCoord++;
  }

  return layout;
};

/**
 * @desc    Get all venues with optional search & city filters
 * @route   GET /api/venues
 * @access  Public
 */
export const getVenues = asyncHandler(async (req, res) => {
  const { city, search } = req.query;
  const filter = {};

  if (city) {
    filter.city = { $regex: city, $options: 'i' };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];
  }

  const venues = await Venue.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: venues.length,
    data: venues,
  });
});

/**
 * @desc    Get single venue by ID (with full seat layout)
 * @route   GET /api/venues/:id
 * @access  Public
 */
export const getVenueById = asyncHandler(async (req, res, next) => {
  const venue = await Venue.findById(req.params.id).populate('createdBy', 'name email');
  if (!venue) {
    return next(new AppError(`Venue not found with ID ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: venue,
  });
});

/**
 * @desc    Create a new venue with categories and seat layout
 * @route   POST /api/venues
 * @access  Private (Admin only)
 */
export const createVenue = asyncHandler(async (req, res, next) => {
  const { name, address, city, categories, seatLayout, rowConfigs } = req.body;

  if (!name || !city) {
    return next(new AppError('Please provide venue name and city.', 400));
  }

  let finalSeatLayout = seatLayout;
  // If rowConfigs provided instead of raw seatLayout, auto-generate coordinates
  if ((!finalSeatLayout || finalSeatLayout.length === 0) && Array.isArray(rowConfigs) && rowConfigs.length > 0) {
    finalSeatLayout = generateGridSeats(rowConfigs);
  }

  const venue = await Venue.create({
    name: name.trim(),
    address: address?.trim() || '',
    city: city.trim(),
    categories: categories && categories.length > 0 ? categories : [
      { name: 'Standard', colorTag: '#10b981' },
      { name: 'Premium', colorTag: '#6366f1' },
      { name: 'VIP', colorTag: '#ec4899' },
    ],
    seatLayout: finalSeatLayout || [],
    totalCapacity: finalSeatLayout?.length || 0,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Venue created successfully',
    data: venue,
  });
});

/**
 * @desc    Update venue details, categories, or seat layout
 * @route   PUT /api/venues/:id
 * @access  Private (Admin only)
 */
export const updateVenue = asyncHandler(async (req, res, next) => {
  let venue = await Venue.findById(req.params.id);
  if (!venue) {
    return next(new AppError(`Venue not found with ID ${req.params.id}`, 404));
  }

  const { name, address, city, categories, seatLayout, rowConfigs } = req.body;

  if (name) venue.name = name.trim();
  if (address !== undefined) venue.address = address.trim();
  if (city) venue.city = city.trim();
  if (categories && Array.isArray(categories)) venue.categories = categories;

  if (Array.isArray(seatLayout)) {
    venue.seatLayout = seatLayout;
    venue.totalCapacity = seatLayout.length;
  } else if (Array.isArray(rowConfigs) && rowConfigs.length > 0) {
    const generated = generateGridSeats(rowConfigs);
    venue.seatLayout = generated;
    venue.totalCapacity = generated.length;
  }

  await venue.save();

  res.status(200).json({
    success: true,
    message: 'Venue updated successfully',
    data: venue,
  });
});

/**
 * @desc    Delete a venue
 * @route   DELETE /api/venues/:id
 * @access  Private (Admin only)
 */
export const deleteVenue = asyncHandler(async (req, res, next) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    return next(new AppError(`Venue not found with ID ${req.params.id}`, 404));
  }

  // Prevent deleting venue if it is referenced in scheduled shows
  const activeShows = await Show.countDocuments({ venue: venue._id, status: 'scheduled' });
  if (activeShows > 0) {
    return next(new AppError(`Cannot delete venue: ${activeShows} scheduled show(s) are using this venue.`, 400));
  }

  await Venue.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Venue deleted successfully',
  });
});

/**
 * @desc    Helper route to generate visual layout coordinates from matrix parameters
 * @route   POST /api/venues/generate-layout
 * @access  Private (Admin only)
 */
export const previewGeneratedLayout = asyncHandler(async (req, res, next) => {
  const { rowConfigs } = req.body;
  if (!Array.isArray(rowConfigs) || rowConfigs.length === 0) {
    return next(new AppError('Please provide a valid rowConfigs array.', 400));
  }

  const layout = generateGridSeats(rowConfigs);
  res.status(200).json({
    success: true,
    totalSeats: layout.length,
    data: layout,
  });
});
