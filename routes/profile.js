const express = require('express');
const { createOrUpdateProfile, getProfile, exploreProfiles, getProfileById } = require('../controllers/profileController');
const { authenticateToken, restrictToPremium } = require('../controllers/authController');
const multer = require('multer');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.split('.').pop().toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, JPG, PNG, or WEBP images are allowed'));
  },
});

// Route to create or update a user's profile with photo upload
router.post('/', authenticateToken, upload.single('profilePhoto'), createOrUpdateProfile);

// Route to explore other users' profiles
router.get('/explore', authenticateToken, exploreProfiles);

// Route to get a specific user's profile by ID (premium feature)
router.get('/:id', authenticateToken, getProfileById);

module.exports = router;