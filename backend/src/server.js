import dotenv from 'dotenv';
import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { startSweepSchedulers } from './schedulers/sweepScheduler.js';
import { seedDefaultData } from './utils/seedData.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const httpServer = http.createServer(app);

// Initialize Socket.io
initSocket(httpServer);

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${PORT} is already in use. Please terminate any process holding port ${PORT}.`);
  } else {
    console.error('[Server Error]:', err.message);
  }
});

// Start Server and Background Services
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Auto-seed demo accounts & sample venues
    await seedDefaultData();

    // Start Hold Expiry & Waitlist Cron Sweepers
    startSweepSchedulers();

    // Start HTTP Server
    // Start HTTP Server on 0.0.0.0
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` TicketNow Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(` Port: ${PORT}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
      console.log(` Sockets & Sweepers: Active`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('====================================================');
    console.error('[Server Critical Failure] Could not establish MongoDB connection.');
    console.error(`Mongoose Error: ${error.message}`);
    console.error('Server execution halted — will not accept requests in disconnected state.');
    console.error('====================================================');
    process.exit(1);
  }
};

// Graceful Shutdown
const handleShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  httpServer.close(() => {
    console.log('[Server] HTTP and Socket server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
