const { Server } = require('socket.io');

let io;

const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "https://hotelviratrestaurant.netlify.app",
        "https://hotelvirat.netlify.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000"
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Join kitchen station room
    socket.on('join-kitchen-station', (stationId) => {
      socket.join(`kitchen-${stationId}`);
      console.log(`Socket ${socket.id} joined kitchen station ${stationId}`);
    });

    // Leave kitchen station room
    socket.on('leave-kitchen-station', (stationId) => {
      socket.leave(`kitchen-${stationId}`);
      console.log(`Socket ${socket.id} left kitchen station ${stationId}`);
    });
  });

  console.log('✅ Socket.io server initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Kitchen Display System events
const emitOrderUpdate = (orderId, orderData) => {
  if (io) {
    io.emit('order-updated', { orderId, orderData });
  }
};

const emitNewOrder = (orderData) => {
  if (io) {
    io.emit('new-order', orderData);
  }
};

const emitStatsUpdate = (stats) => {
  if (io) {
    io.emit('stats-updated', stats);
  }
};

module.exports = {
  initializeSocketIO,
  getIO,
  emitOrderUpdate,
  emitNewOrder,
  emitStatsUpdate
};