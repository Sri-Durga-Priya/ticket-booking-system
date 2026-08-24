import express from 'express';
import { getOrganiserAnalytics } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Organiser and Admin Analytics
router.use(protect);
router.use(authorize('organiser', 'admin'));

router.get('/', getOrganiserAnalytics);

export default router;
