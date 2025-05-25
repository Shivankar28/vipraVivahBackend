const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  isProfileFlag: { type: Boolean, default: false }, // New flag for profile completion
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);