const Notification = require('../models/Notification');
const User = require('../models/User');
const Profile = require('../models/Profile');
const ApiResponse = require('../utils/apiResponse');

// Utility function to create notification
const createNotification = async (notificationData) => {
  try {
    console.log('createNotification: Starting with data:', notificationData);
    
    const notification = await Notification.createNotification(notificationData);
    console.log('createNotification: Notification created successfully:', notification._id);
    
    // Emit real-time notification via WebSocket
    if (global.io) {
      console.log('createNotification: Emitting WebSocket notification to user:', notificationData.recipient);
      
      global.io.to(`user_${notificationData.recipient}`).emit('new_notification', {
        type: 'notification',
        data: {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
          read: notification.read
        }
      });
      
      // Emit unread count update
      const unreadCount = await Notification.getUnreadCount(notificationData.recipient);
      global.io.to(`user_${notificationData.recipient}`).emit('unread_count_update', {
        type: 'unread_count',
        data: { unreadCount }
      });
      
      console.log('createNotification: WebSocket notifications emitted successfully');
    } else {
      console.log('createNotification: WebSocket not available (global.io is null)');
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get all notifications for a user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, read } = req.query;
    
    // Build query
    const query = { recipient: userId };
    if (type) query.type = type;
    if (read !== undefined) query.read = read === 'true';
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get notifications with sender info
    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Notification.countDocuments(query);
    
    // Get unread count
    const unreadCount = await Notification.getUnreadCount(userId);
    
    return res.status(200).json(
      new ApiResponse(200, 'Notifications retrieved successfully', {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      })
    );
  } catch (error) {
    console.error('GetNotifications: Error occurred', error);
    return res.status(500).json(
      new ApiResponse(500, 'Failed to retrieve notifications', null, error.message)
    );
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Notification.getUnreadCount(userId);
    
    return res.status(200).json(
      new ApiResponse(200, 'Unread count retrieved successfully', { unreadCount })
    );
  } catch (error) {
    console.error('GetUnreadCount: Error occurred', error);
    return res.status(500).json(
      new ApiResponse(500, 'Failed to get unread count', null, error.message)
    );
  }
};

// Mark notifications as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body; // Optional: specific notification IDs
    
    const result = await Notification.markAsRead(userId, notificationIds);
    
    return res.status(200).json(
      new ApiResponse(200, 'Notifications marked as read successfully', { 
        modifiedCount: result.modifiedCount 
      })
    );
  } catch (error) {
    console.error('MarkAsRead: Error occurred', error);
    return res.status(500).json(
      new ApiResponse(500, 'Failed to mark notifications as read', null, error.message)
    );
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json(
        new ApiResponse(404, 'Notification not found', null)
      );
    }
    
    return res.status(200).json(
      new ApiResponse(200, 'Notification deleted successfully', { notificationId })
    );
  } catch (error) {
    console.error('DeleteNotification: Error occurred', error);
    return res.status(500).json(
      new ApiResponse(500, 'Failed to delete notification', null, error.message)
    );
  }
};

// Clear all notifications
const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await Notification.deleteMany({ recipient: userId });
    
    return res.status(200).json(
      new ApiResponse(200, 'All notifications cleared successfully', { 
        deletedCount: result.deletedCount 
      })
    );
  } catch (error) {
    console.error('ClearAllNotifications: Error occurred', error);
    return res.status(500).json(
      new ApiResponse(500, 'Failed to clear notifications', null, error.message)
    );
  }
};

// Create notification for profile like
const createLikeNotification = async (likerId, likedProfileId) => {
  try {
    console.log('createLikeNotification: Starting with', { likerId, likedProfileId });
    
    // Get liker's profile info
    const likerProfile = await Profile.findOne({ userId: likerId });
    if (!likerProfile) {
      console.error('Liker profile not found:', likerId);
      return;
    }
    
    // Get liked profile's user info
    const likedProfile = await Profile.findById(likedProfileId).populate('userId');
    if (!likedProfile) {
      console.error('Liked profile not found:', likedProfileId);
      return;
    }
    
    const likerName = `${likerProfile.firstName} ${likerProfile.lastName}`;
    
    // Create notification for the liked user
    await createNotification({
      recipient: likedProfile.userId._id,
      sender: likerId,
      type: 'like',
      title: 'New Profile Like',
      message: `${likerName} liked your profile!`,
      data: {
        likerId,
        likerName,
        likerProfileId: likerProfile._id,
        profileId: likedProfileId
      },
      priority: 'medium'
    });
    
    console.log(`Like notification created for user ${likedProfile.userId._id} from ${likerId}`);
  } catch (error) {
    console.error('Error creating like notification:', error);
  }
};

// Create notification for mutual like (match)
const createMatchNotification = async (user1Id, user2Id) => {
  try {
    console.log('createMatchNotification: Starting with', { user1Id, user2Id });
    
    // Get both users' profile info
    const [profile1, profile2] = await Promise.all([
      Profile.findOne({ userId: user1Id }),
      Profile.findOne({ userId: user2Id })
    ]);
    
    if (!profile1 || !profile2) {
      console.error('One or both profiles not found for match notification');
      return;
    }
    
    const name1 = `${profile1.firstName} ${profile1.lastName}`;
    const name2 = `${profile2.firstName} ${profile2.lastName}`;
    
    // Create match notifications for both users
    await Promise.all([
      createNotification({
        recipient: user1Id,
        sender: user2Id,
        type: 'match',
        title: 'It\'s a Match!',
        message: `${name2} also liked you back!`,
        data: {
          matchedUserId: user2Id,
          matchedUserName: name2,
          matchedProfileId: profile2._id
        },
        priority: 'high'
      }),
      createNotification({
        recipient: user2Id,
        sender: user1Id,
        type: 'match',
        title: 'It\'s a Match!',
        message: `${name1} also liked you back!`,
        data: {
          matchedUserId: user1Id,
          matchedUserName: name1,
          matchedProfileId: profile1._id
        },
        priority: 'high'
      })
    ]);
    
    console.log(`Match notifications created for users ${user1Id} and ${user2Id}`);
  } catch (error) {
    console.error('Error creating match notifications:', error);
  }
};

// Create system notification
const createSystemNotification = async (userId, title, message, data = {}) => {
  try {
    await createNotification({
      recipient: userId,
      type: 'system',
      title,
      message,
      data,
      priority: 'medium'
    });
    
    console.log(`System notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error('Error creating system notification:', error);
  }
};

// Create profile update notification
const createProfileUpdateNotification = async (userId, isNewProfile = false) => {
  try {
    const title = isNewProfile ? 'Profile Created' : 'Profile Updated';
    const message = isNewProfile 
      ? 'Your profile has been created successfully! Start exploring matches.'
      : 'Your profile has been updated successfully!';
    
    await createNotification({
      recipient: userId,
      type: 'profile_update',
      title,
      message,
      data: { isNewProfile },
      priority: 'medium'
    });
    
    console.log(`Profile update notification created for user ${userId}`);
  } catch (error) {
    console.error('Error creating profile update notification:', error);
  }
};

// Create subscription notification
const createSubscriptionNotification = async (userId, type, message) => {
  try {
    await createNotification({
      recipient: userId,
      type: 'subscription',
      title: 'Subscription Update',
      message,
      data: { subscriptionType: type },
      priority: 'high'
    });
    
    console.log(`Subscription notification created for user ${userId}: ${type}`);
  } catch (error) {
    console.error('Error creating subscription notification:', error);
  }
};

// Cleanup old notifications (cron job)
const cleanupOldNotifications = async () => {
  try {
    const result = await Notification.cleanupOldNotifications(30); // 30 days
    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  clearAllNotifications,
  createLikeNotification,
  createMatchNotification,
  createSystemNotification,
  createProfileUpdateNotification,
  createSubscriptionNotification,
  cleanupOldNotifications
}; 