const express = require('express');
const { createOrUpdateProfile, getProfile, exploreProfiles, getProfileById } = require('../controllers/profileController');
const { authenticateToken } = require('../controllers/authController');
const multer = require('multer');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.split('.').pop().toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG/PNG images are allowed'));
  }
});

router.post('/', authenticateToken, upload.single('profilePhoto'), createOrUpdateProfile);
router.get('/', authenticateToken, getProfile);
router.get('/explore', authenticateToken, exploreProfiles);
router.get('/:id', getProfileById);

module.exports = router;