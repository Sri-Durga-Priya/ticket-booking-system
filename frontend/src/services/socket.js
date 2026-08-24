import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      // console.log(`[Socket] Connected to server: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      // console.log(`[Socket] Disconnected from server: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      // console.warn(`[Socket] Connection error: ${err.message}`);
    });
  }
  return socket;
};

export const joinShowRoom = (showId) => {
  const s = getSocket();
  if (s && showId) {
    s.emit('join:show', showId);
  }
};

export const leaveShowRoom = (showId) => {
  const s = getSocket();
  if (s && showId) {
    s.emit('leave:show', showId);
  }
};

export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (s && userId) {
    s.emit('join:user', userId);
  }
};

export default {
  getSocket,
  joinShowRoom,
  leaveShowRoom,
  joinUserRoom,
};
