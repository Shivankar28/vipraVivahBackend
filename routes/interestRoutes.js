const express = require('express');
const { createLike, unlike, getUsersWhoLikedMe, getUsersILiked } = require('../controllers/interestController');
const { authenticateToken, restrictToPremium } = require('../controllers/authController');

const router = express.Router();

// Route to create a new like
router.post('/likes', authenticateToken, restrictToPremium, createLike);

// Route to unlike a user
router.delete('/likes', authenticateToken, unlike);

// Route to get all users who liked the current user (premium feature)
router.get('/likes/received', authenticateToken, restrictToPremium, getUsersWhoLikedMe);

// Route to get all users the current user liked
router.get('/likes/sent', authenticateToken, getUsersILiked);

module.exports = router;