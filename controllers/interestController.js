const mongoose = require('mongoose');
const Interest = require('../models/Interest');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { createLikeNotification, createMatchNotification } = require('./notificationController');

// Utility to check if in development mode
const isDev = process.env.NODE_ENV === 'development';

// Create a new like
exports.createLike = async (req, res) => {
   console.log('createLike: Request received', { userId: req.user.id, body: req.body });
   try {
      const { likedId } = req.body; // likedId is a Profile ID
      const likerId = req.user.id; // User ID from auth middleware
    console.log('createLike: Parsed IDs', { likerId, likedId });

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(likedId)) {
      console.log('createLike: Invalid profile ID', { likedId });
      return res.status(400).json({ message: 'Invalid profile ID' });
    }

    // Find the profile to get the associated userId
    const likedProfile = await Profile.findById(likedId).select('userId');
    if (!likedProfile) {
      console.log('createLike: Profile not found', { likedId });
      return res.status(404).json({ message: 'Profile not found' });
    }
    const likedUserId = likedProfile.userId;
      console.log('createLike: Resolved liked user ID', { likedUserId });

      // Check if users exist
      const [liker, liked] = await Promise.all([
         User.findById(likerId),
         User.findById(likedUserId),
      ]);

      if (!liker || !liked) {
         console.log('createLike: User not found', { liker: !!liker, liked: !!liked });
         return res.status(404).json({ message: 'User not found' });
      }

    // Prevent self-liking
    if (likerId === likedUserId.toString()) {
      console.log('createLike: User tried to like themselves', { likerId, likedUserId });
      return res.status(400).json({ message: 'Users cannot like themselves' });
    }

      // Create new interest
      const interest = new Interest({
         liker: likerId,
         liked: likedUserId,
      });

      await interest.save();
      console.log('createLike: Like created', { interest });
      
      // Create notification for the liked user
      await createLikeNotification(likerId, likedId);
      
      // Check if this creates a mutual like (match)
      const existingLike = await Interest.findOne({
        liker: likedUserId,
        liked: likerId
      });
      
      if (existingLike) {
        // It's a match! Create match notifications for both users
        await createMatchNotification(likerId, likedUserId);
      }
      
      res.status(201).json({ message: 'Like created successfully', interest });
   } catch (error) {
      if (error.code === 11000) {
         console.log('createLike: Duplicate like', error);
         return res.status(400).json({ message: 'You already liked this user' });
      }
      console.error('createLike: Server error', error);
      res.status(500).json({ message: 'Server error', error: error.message });
   }
};

// Unlike a user
exports.unlike = async (req, res) => {
   console.log('unlike: Request received', { userId: req.user.id, body: req.body });
   try {
      const  likedId  = req.body.targetUserId; // likedId is a Profile ID
      const likerId = req.user.id;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(likedId)) {
      console.log('unlike: Invalid profile ID', { likedId });
      return res.status(400).json({ message: 'Invalid profile ID' });
    }

    // Find the profile to get the associated userId
    const likedProfile = await Profile.findById(likedId).select('userId');
    if (!likedProfile) {
      console.log('unlike: Profile not found', { likedId });
      return res.status(404).json({ message: 'Profile not found' });
    }
    const likedUserId = likedProfile.userId;
    console.log('unlike: Resolved liked user ID', { likedUserId });

      const result = await Interest.findOneAndDelete({
         liker: likerId,
         liked: likedUserId,
      });

      if (!result) {
         console.log('unlike: Like not found', { likerId, likedUserId });
         return res.status(404).json({ message: 'Like not found' });
      }

      console.log('unlike: Successfully unliked user', { likerId, likedUserId });
      res.status(200).json({ message: 'Successfully unliked user' });
   } catch (error) {
      console.error('unlike: Server error', error);
      res.status(500).json({ message: 'Server error', error: error.message });
   }
};

// Get all users who liked the current user
exports.getUsersWhoLikedMe = async (req, res) => {
   console.log('getUsersWhoLikedMe: Request received', { userId: req.user.id });
   try {
      const userId = req.user.id;

      const likes = await Interest.find({ liked: userId })
         .populate('liker', 'email isProfileFlag')
         .lean();

      const usersWhoLikedMe = await Promise.all(
likes.map(async (like) => {
        const profile = await Profile.findOne({ userId: like.liker._id }).lean();
        return {
          _id: profile?._id || like.liker._id, // Use profile ID if available
         userId: like.liker._id,
         email: like.liker.email,
         profileCompleted: like.liker.isProfileFlag,
         likedAt: like.createdAt,
          profile: profile || null,
        };
      })
);

      console.log('getUsersWhoLikedMe: Users found', { count: usersWhoLikedMe.length });
      res.status(200).json({
         message: 'Users who liked you retrieved successfully',
         count: usersWhoLikedMe.length,
         users: usersWhoLikedMe,
      });
   } catch (error) {
      console.error('getUsersWhoLikedMe: Server error', error);
      res.status(500).json({ message: 'Server error', error: error.message });
   }
};

// Get all users the current user liked
exports.getUsersILiked = async (req, res) => {
   console.log('getUsersILiked: Request received', { userId: req.user.id });
   try {
      const userId = req.user.id;

            const likes = await Interest.find({ liker: userId })
         .populate('liked', 'email isProfileFlag')
         .lean();

      if (!likes.length) {
         console.log('getUsersILiked: No liked users found');
         return res.status(200).json({
            message: 'No liked users found',
            count: 0,
            users: [],
         });
      }

            const likedUserIds = likes.map(like => like.liked._id);
      const profiles = await Profile.find({ userId: { $in: likedUserIds } }).lean();

            const profileMap = profiles.reduce((map, profile) => {
         map[profile.userId.toString()] = profile;
         return map;
      }, {});

            const usersILiked = likes.map(like => {
         const profile = profileMap[like.liked._id.toString()];
         return {
_id: profile?._id || like.liked._id, // Use profile ID for consistency
            userId: like.liked._id,
            email: like.liked.email,
            profileCompleted: like.liked.isProfileFlag,
            likedAt: like.createdAt,
            profile: profile || null,
         };
      });

      console.log('getUsersILiked: Users found', { count: usersILiked.length });
      res.status(200).json({
         message: 'Users you liked retrieved successfully',
         count: usersILiked.length,
         users: usersILiked,
      });
   } catch (error) {
      console.error('getUsersILiked: Server error', error);
      res.status(500).json({
         message: 'Server error',
         error: error.message,
      });
   }
};