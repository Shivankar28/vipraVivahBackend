
const express = require('express');
const {
   signup,
   verifyOTP,
   login,
   getProfile,
   forgotPassword,
   resetPassword,
   resendOTP,
   authenticateToken,
   refreshToken,
   logout,
} = require('../controllers/authController');

const router = express.Router();

// Route to sign up a new user
router.post('/signup', signup);

// Route to verify OTP for email verification
router.post('/verify-otp', verifyOTP);

// Route to log in a user
router.post('/login', login);

// Route to refresh access token
router.post('/refresh', refreshToken);

// Route to logout user
router.post('/logout', logout);

// Route to get the authenticated user's profile
router.get('/profile', authenticateToken, getProfile);

// Route to initiate password reset
router.post('/forgot-password', forgotPassword);

// Route to reset password with OTP
router.post('/reset-password', resetPassword);

// Route to resend OTP for verification or password reset
router.post('/resend-otp', resendOTP);

module.exports = router;