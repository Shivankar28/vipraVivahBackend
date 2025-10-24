const express = require('express');
const router = express.Router();
const {
  createOrUpdatePreferences,
  getUserPreferences,
  updatePreferences,
  deletePreferences,
  getAllPreferences,
  getPreferencesByUserId,
  resetPreferences,
  validatePreferenceData,
  findMatches,
  createDefaultPreferences
} = require('../controllers/preferenceController');
const { authenticateToken } = require('../controllers/authController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validatePreferences = (req, res, next) => {
  const errors = validatePreferenceData(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  next();
};

// Test route to verify preferences endpoint
router.post('/test', (req, res) => {
  console.log('Preferences test route hit');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  res.json({ message: 'Preferences test route working', body: req.body });
});

// Create or update user preferences
router.post('/', validatePreferences, createOrUpdatePreferences);

// Get user preferences
router.get('/', getUserPreferences);

// Update user preferences (PATCH - partial update)
router.patch('/', validatePreferences, updatePreferences);

// Delete user preferences
router.delete('/', deletePreferences);

// Reset preferences to default
router.post('/reset', resetPreferences);

// Find matches based on preferences
router.get('/matches', findMatches);

// Admin routes (require admin role)
// Get all preferences (admin only)
router.get('/admin/all', getAllPreferences);

// Get preferences by user ID (admin only)
router.get('/admin/user/:userId', getPreferencesByUserId);

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