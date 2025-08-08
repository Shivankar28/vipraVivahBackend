const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../controllers/authController');

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(adminController.isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Profile management
router.get('/profiles', adminController.getAllProfiles);

// Subscription management
router.get('/subscriptions', adminController.getAllSubscriptions);

module.exports = router;
