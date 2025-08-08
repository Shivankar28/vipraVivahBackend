require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const interestRoutes = require('../vipraVivahBackend/routes/interestRoutes');
const subscriptionRoutes = require('./routes/subscription');
const notificationRoutes = require('./routes/notificationRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const adminRoutes = require('./routes/admin');
const multer = require('multer');

console.log('server.js: Loading environment variables');
console.log('server.js: MONGODB_URI=', process.env.MONGODB_URI);
console.log('server.js: JWT_SECRET=', process.env.JWT_SECRET ? '[REDACTED]' : 'undefined');
console.log('server.js: EMAIL_USER=', process.env.EMAIL_USER);
console.log('server.js: EMAIL_PASS=', process.env.EMAIL_PASS ? '[REDACTED]' : 'undefined');
console.log('server.js: PORT=', process.env.PORT);
console.log('server.js: NODE_ENV=', process.env.NODE_ENV);

const app = express();
const server = http.createServer(app);

// Create Socket.IO server
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? "*" 
      : ['https://vipravivah.in', 'https://www.vipravivah.in', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'development'
        ? '*' // Allow all origins in development
        : ['https://vipravivah.in', 'https://www.vipravivah.in', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} for user: ${socket.userId}`);
  
  // Join user's personal room
  socket.join(`user_${socket.userId}`);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id} for user: ${socket.userId}`);
  });
  
  // Handle custom events
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.userId} joined room: ${room}`);
  });
  
  socket.on('leave_room', (room) => {
    socket.leave(room);
    console.log(`User ${socket.userId} left room: ${room}`);
  });
});

// Make io available globally for notification emission
global.io = io;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('server.js: Error occurred', err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  }
  if (err.message.includes('Only JPEG, JPG, PNG, or WEBP images are allowed')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode with WebSocket support`));