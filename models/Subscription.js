const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One subscription per user
   },
   plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
   },
   status: {
      type: String,
      enum: ['active', 'inactive', 'canceled'],
      default: 'active',
   },
   createdAt: {
      type: Date,
      default: Date.now,
   },
   updatedAt: {
      type: Date,
      default: Date.now,
   },
   subscriptionStart: {
      type: Date,
   },
   subscriptionEnd: {
      type: Date,
   },
});

subscriptionSchema.pre('save', function (next) {
   this.updatedAt = Date.now();
   next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);