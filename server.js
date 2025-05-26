require('dotenv').config();
const express = require('express');
const cors = require('cors'); // <--- Add this
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const multer = require('multer');

// Debug: Log environment variables
console.log('server.js: Loading environment variables');
console.log('server.js: MONGODB_URI=', process.env.MONGODB_URI);
console.log('server.js: JWT_SECRET=', process.env.JWT_SECRET ? '[REDACTED]' : 'undefined');
console.log('server.js: EMAIL_USER=', process.env.EMAIL_USER);
console.log('server.js: EMAIL_PASS=', process.env.EMAIL_PASS ? '[REDACTED]' : 'undefined');
console.log('server.js: PORT=', process.env.PORT);

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['https://vipravivah.in', 'https://www.vipravivah.in',"http://localhost:5173"],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
 // <--- Enable CORS for all origins
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
