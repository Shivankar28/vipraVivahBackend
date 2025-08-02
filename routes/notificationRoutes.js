const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  clearAllNotifications,
  createLikeNotification, // These are imported but not used in routes, used in controllers
  createMatchNotification, // These are imported but not used in routes, used in controllers
  createProfileUpdateNotification // These are imported but not used in routes, used in controllers
} = require('../controllers/notificationController');
const { authenticateToken } = require('../controllers/authController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all notifications for the authenticated user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark notifications as read
router.patch('/mark-read', markAsRead);

// Delete a specific notification
router.delete('/:notificationId', deleteNotification);

// Clear all notifications
router.delete('/', clearAllNotifications);

// Test endpoint to create a notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', async (req, res) => {
    try {
      const { recipientId, type = 'like', message = 'Test notification' } = req.body;
      
      if (!recipientId) {
        return res.status(400).json({ message: 'recipientId is required' });
      }
      
      const Notification = require('../models/Notification');
      const notification = await Notification.createNotification({
        recipient: recipientId,
        type,
        title: 'Test Notification',
        message,
        data: { test: true },
        priority: 'medium'
      });
      
      res.status(201).json({ 
        message: 'Test notification created successfully',
        notification 
      });
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ message: 'Error creating test notification', error: error.message });
    }
  });
}

module.exports = router; 