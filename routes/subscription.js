const express = require('express');
const {
  createOrder,upgradeToPremium,
  getSubscriptionStatus,
} = require("../controllers/subscriptionController");
const { authenticateToken } = require('../controllers/authController');

const router = express.Router();

// Route to upgrade to premium
router.post('/upgrade', authenticateToken, upgradeToPremium);

// Route to get subscription status
router.get('/status', authenticateToken, getSubscriptionStatus);

//Route to create-order
router.post("/createOrder", authenticateToken, createOrder);

module.exports = router;