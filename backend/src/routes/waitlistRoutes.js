import express from 'express';
import {
  joinWaitlist,
  getMyWaitlists,
  getWaitlistOffer,
  claimWaitlistOffer,
  leaveWaitlist,
} from '../controllers/waitlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All waitlist actions require an authenticated user
router.use(protect);

router.post('/join', joinWaitlist);
router.get('/my-waitlist', getMyWaitlists);
router.get('/offer/:id', getWaitlistOffer);
router.post('/claim/:id', claimWaitlistOffer);
router.delete('/:id', leaveWaitlist);

export default router;
