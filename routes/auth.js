const express = require('express');
const { signup, verifyOTP, login, getProfile, authenticateToken, forgotPassword, resetPassword, resendOTP } = require('../controllers/authController');

const router = express.Router();

// Routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOTP);

module.exports = router;