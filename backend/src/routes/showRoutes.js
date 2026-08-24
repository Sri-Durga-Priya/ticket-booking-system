import express from 'express';
import {
  getShows,
  getShowById,
  getMyShows,
  createShow,
  updateShow,
  cancelShow,
} from '../controllers/showController.js';
import { getShowSeats } from '../controllers/seatMapController.js';
import { protect, authorize, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getShows);
router.get('/:id', getShowById);
router.get('/:id/seats', optionalAuth, getShowSeats);

// Organiser & Admin protected routes
router.get('/organiser/my-shows', protect, authorize('organiser', 'admin'), getMyShows);
router.post('/', protect, authorize('organiser', 'admin'), createShow);
router.put('/:id', protect, authorize('organiser', 'admin'), updateShow);
router.patch('/:id/cancel', protect, authorize('organiser', 'admin'), cancelShow);

export default router;
