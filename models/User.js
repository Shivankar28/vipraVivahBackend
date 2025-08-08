const mongoose = require('mongoose');
const Subscription = require('../models/Subscription'); // Adjust the path to your subscription schema file

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  isProfileFlag: { type: Boolean, default: false }, // New flag for profile completion
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Admin role
  createdAt: { type: Date, default: Date.now },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
});

// Post-save middleware to create a subscription with 'free' plan
userSchema.post('save', async function (doc, next) {
  try {
    // Check if subscription already exists to avoid duplicates
    if (!doc.subscription) {
      const subscription = new Subscription({
        userId: doc._id,
        plan: 'free',
        status: 'active',
        subscriptionStart: new Date(),
      });
      await subscription.save();
      // Update the user document with the subscription ID
      doc.subscription = subscription._id;
      await doc.save();
      console.log('UserSchema: Free subscription created for user', { userId: doc._id });
    }
    next();
  } catch (error) {
    console.error('UserSchema: Error creating subscription', error);
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);