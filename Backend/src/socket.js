const { Server } = require('socket.io');
const { verify } = require('./utils/jwt');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT auth middleware for every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verify(token);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Every authenticated user joins their personal room
    socket.join(`user:${userId}`);

    // Client asks to join an order room (for real-time chat + status)
    socket.on('join:order', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });

    socket.on('leave:order', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

function emitToUser(userId, event, data) {
  if (!io) return;
  try { io.to(`user:${userId}`).emit(event, data); } catch {}
}

function emitToOrder(orderId, event, data) {
  if (!io) return;
  try { io.to(`order:${orderId}`).emit(event, data); } catch {}
}

function getIO() { return io; }

module.exports = { initSocket, emitToUser, emitToOrder, getIO };
