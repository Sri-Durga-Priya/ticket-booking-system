import express from 'express';
import {
  holdSeats,
  releaseHold,
  checkout,
  getBookingById,
  getMyBookings,
  verifyBooking,
  cancelBooking,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Ticket Verification Scanner
router.get('/verify/:ref', verifyBooking);

// Protected Routes (Requires authenticated session)
router.use(protect);

router.post('/hold', holdSeats);
router.post('/release-hold', releaseHold);
router.post('/checkout', checkout);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

export default router;
