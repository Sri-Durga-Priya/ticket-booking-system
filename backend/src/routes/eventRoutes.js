import express from 'express';
import {
  getEvents,
  getEventById,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Organiser & Admin protected routes
router.get('/organiser/my-events', protect, authorize('organiser', 'admin'), getMyEvents);
router.post('/', protect, authorize('organiser', 'admin'), createEvent);
router.put('/:id', protect, authorize('organiser', 'admin'), updateEvent);
router.delete('/:id', protect, authorize('organiser', 'admin'), deleteEvent);

export default router;
