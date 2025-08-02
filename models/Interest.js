const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
   liker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Add index for better query performance
   },
   liked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Add index for better query performance
   },
   createdAt: {
      type: Date,
      default: Date.now
   }
}, {
   // Prevent duplicate likes (same liker and liked combination)
   indexes: [{ key: { liker: 1, liked: 1 }, unique: true }],
   // Add validation to prevent self-liking
   validate: {
      validator: function (v) {
         return this.liker.toString() !== this.liked.toString();
      },
      message: 'Users cannot like themselves'
   }
});

module.exports = mongoose.model('Interest', interestSchema);
