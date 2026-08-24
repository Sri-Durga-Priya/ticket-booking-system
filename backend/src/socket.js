import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer) => {
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

  io = new Server(httpServer, {
    cors: {
      origin: [allowedOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    // console.log(`[Socket] Client connected: ${socket.id}`);

    // Join show room for live seat map updates
    socket.on('join:show', (showId) => {
      if (!showId) return;
      const room = `show:${showId}`;
      socket.join(room);
      // console.log(`[Socket] Client ${socket.id} joined show room: ${room}`);
    });

    // Leave show room
    socket.on('leave:show', (showId) => {
      if (!showId) return;
      const room = `show:${showId}`;
      socket.leave(room);
      // console.log(`[Socket] Client ${socket.id} left show room: ${room}`);
    });

    // Join authenticated user private room for direct notifications (e.g. waitlist offers)
    socket.on('join:user', (userId) => {
      if (!userId) return;
      const room = `user:${userId}`;
      socket.join(room);
      // console.log(`[Socket] User ${userId} joined private notification room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
      // console.log(`[Socket] Client ${socket.id} disconnected: ${reason}`);
    });
  });

  console.log('[Socket] Socket.io server initialized with live seat & waitlist rooms');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
};

/**
 * Broadcast seat update to all clients viewing a specific show
 * @param {string} showId 
 * @param {object} payload - { seatId, status, heldBy, holdExpiresAt, ... }
 */
export const emitSeatUpdate = (showId, payload) => {
  if (!io || !showId) return;
  io.to(`show:${showId}`).emit('seat:updated', {
    showId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
};

/**
 * Broadcast multiple seat updates to all clients viewing a specific show
 * @param {string} showId 
 * @param {Array} seats - array of updated seat objects
 */
export const emitBatchSeatUpdate = (showId, seats) => {
  if (!io || !showId || !seats?.length) return;
  io.to(`show:${showId}`).emit('seat:batch_updated', {
    showId,
    seats,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send targeted waitlist notification to a specific user
 * @param {string} userId 
 * @param {object} data - waitlist offer details
 */
export const emitWaitlistNotification = (userId, data) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit('waitlist:offered', {
    userId,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

export const emitToUser = emitWaitlistNotification;
