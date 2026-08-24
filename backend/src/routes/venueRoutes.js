import express from 'express';
import {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  previewGeneratedLayout,
} from '../controllers/venueController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes: List and get single venue details
router.get('/', getVenues);
router.get('/:id', getVenueById);

// Admin-protected routes: Create, update, delete, generate layouts
router.post('/', protect, authorize('admin'), createVenue);
router.post('/generate-layout', protect, authorize('admin'), previewGeneratedLayout);
router.put('/:id', protect, authorize('admin'), updateVenue);
router.delete('/:id', protect, authorize('admin'), deleteVenue);

export default router;
