const express = require('express');
const router = express.Router();
const {
  createOrUpdatePreferences,
  getUserPreferences,
  findMatches,
  createDefaultPreferences
} = require('../controllers/preferenceController');
const { authenticateToken } = require('../controllers/authController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create or update user preferences
router.post('/', createOrUpdatePreferences);

// Get user preferences
router.get('/', getUserPreferences);

// Find matches based on preferences
router.get('/matches', findMatches);

// Test route to create default preferences
router.post('/test-setup', async (req, res) => {
  try {
    const preference = await createDefaultPreferences(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Default preferences created successfully',
      data: preference
    });
  } catch (error) {
    console.error('Test setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create default preferences',
      error: error.message
    });
  }
});

// Test route to create preferences for a specific user (for testing notifications)
router.post('/test-setup-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preference = await createDefaultPreferences(userId);
    res.status(200).json({
      success: true,
      message: 'Default preferences created successfully for test user',
      data: preference
    });
  } catch (error) {
    console.error('Test setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create default preferences for test user',
      error: error.message
    });
  }
});

module.exports = router; 