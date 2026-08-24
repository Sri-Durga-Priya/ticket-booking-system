import express from 'express';
import cors from 'cors';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { getDBStatus } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import showRoutes from './routes/showRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

// Dynamic CORS for local & production environments
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger (Development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// System Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    dbConnected: dbStatus.isConnected,
    success: true,
    service: 'Ticket Booking System API Server',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatus,
    config: {
      holdTtlMinutes: Number(process.env.HOLD_TTL_MINUTES) || 10,
      waitlistOfferTtlMinutes: Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 15,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });
});

// Root API Endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Ticket Booking System API — Real-time Movie & Concert Ticket Booking Engine',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      venues: '/api/venues',
      events: '/api/events',
      shows: '/api/shows',
      bookings: '/api/bookings',
      waitlist: '/api/waitlist',
      analytics: '/api/analytics',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/analytics', analyticsRoutes);

// Placeholder 404 Handler for undefined API routes
app.use('/api/*', (req, res, next) => {
  next(new AppError(`API endpoint not found: ${req.method} ${req.originalUrl}`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
