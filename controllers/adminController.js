const User = require('../models/User');
const Profile = require('../models/Profile');
const Subscription = require('../models/Subscription');
const Interest = require('../models/Interest');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json(new ApiResponse(403, 'Access denied. Admin privileges required.'));
    }
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json(new ApiResponse(500, 'Server error', null, error.message));
  }
};

// Get admin dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    console.log('Admin: Getting dashboard statistics');
    
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const profilesCreated = await Profile.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const premiumSubscriptions = await Subscription.countDocuments({ plan: { $in: ['premium', 'vip'] } });
    const totalInterests = await Interest.countDocuments();
    const totalNotifications = await Notification.countDocuments();

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const recentProfiles = await Profile.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    const stats = {
      totalUsers,
      verifiedUsers,
      profilesCreated,
      activeSubscriptions,
      premiumSubscriptions,
      totalInterests,
      totalNotifications,
      recentUsers,
      recentProfiles,
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
      profileCompletionRate: totalUsers > 0 ? ((profilesCreated / totalUsers) * 100).toFixed(2) : 0
    };

    console.log('Admin: Dashboard stats retrieved', stats);
    res.status(200).json(new ApiResponse(200, 'Dashboard statistics retrieved successfully', stats));
  } catch (error) {
    console.error('Admin: Error getting dashboard stats', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving dashboard statistics', null, error.message));
  }
};

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    console.log('Admin: Getting all users');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .populate('subscription')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    const result = {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    console.log('Admin: Users retrieved successfully');
    res.status(200).json(new ApiResponse(200, 'Users retrieved successfully', result));
  } catch (error) {
    console.error('Admin: Error getting users', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving users', null, error.message));
  }
};

// Get user details by ID
const getUserById = async (req, res) => {
  try {
    console.log('Admin: Getting user by ID', req.params.id);
    const user = await User.findById(req.params.id).populate('subscription');
    
    if (!user) {
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }

    // Get user's profile if exists
    const profile = await Profile.findOne({ userId: user._id });
    const interests = await Interest.find({ userId: user._id });

    const userData = {
      user,
      profile,
      interests
    };

    console.log('Admin: User details retrieved successfully');
    res.status(200).json(new ApiResponse(200, 'User details retrieved successfully', userData));
  } catch (error) {
    console.error('Admin: Error getting user details', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving user details', null, error.message));
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    console.log('Admin: Updating user role', req.params.id, req.body);
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json(new ApiResponse(400, 'Invalid role. Must be "user" or "admin"'));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }

    console.log('Admin: User role updated successfully');
    res.status(200).json(new ApiResponse(200, 'User role updated successfully', user));
  } catch (error) {
    console.error('Admin: Error updating user role', error);
    res.status(500).json(new ApiResponse(500, 'Error updating user role', null, error.message));
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    console.log('Admin: Deleting user', req.params.id);
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json(new ApiResponse(400, 'Cannot delete your own account'));
    }

    // Delete related data
    await Profile.deleteMany({ userId: user._id });
    await Interest.deleteMany({ userId: user._id });
    await Notification.deleteMany({ userId: user._id });
    await Subscription.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    console.log('Admin: User deleted successfully');
    res.status(200).json(new ApiResponse(200, 'User deleted successfully'));
  } catch (error) {
    console.error('Admin: Error deleting user', error);
    res.status(500).json(new ApiResponse(500, 'Error deleting user', null, error.message));
  }
};

// Get all profiles with pagination
const getAllProfiles = async (req, res) => {
  try {
    console.log('Admin: Getting all profiles');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const profiles = await Profile.find()
      .populate('userId', 'email role isVerified createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalProfiles = await Profile.countDocuments();
    const totalPages = Math.ceil(totalProfiles / limit);

    const result = {
      profiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalProfiles,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    console.log('Admin: Profiles retrieved successfully');
    res.status(200).json(new ApiResponse(200, 'Profiles retrieved successfully', result));
  } catch (error) {
    console.error('Admin: Error getting profiles', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving profiles', null, error.message));
  }
};

// Get all subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    console.log('Admin: Getting all subscriptions');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const subscriptions = await Subscription.find()
      .populate('userId', 'email role isVerified')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalSubscriptions = await Subscription.countDocuments();
    const totalPages = Math.ceil(totalSubscriptions / limit);

    const result = {
      subscriptions,
      pagination: {
        currentPage: page,
        totalPages,
        totalSubscriptions,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    console.log('Admin: Subscriptions retrieved successfully');
    res.status(200).json(new ApiResponse(200, 'Subscriptions retrieved successfully', result));
  } catch (error) {
    console.error('Admin: Error getting subscriptions', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving subscriptions', null, error.message));
  }
};

module.exports = {
  isAdmin,
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllProfiles,
  getAllSubscriptions
};
