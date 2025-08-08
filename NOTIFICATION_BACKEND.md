# 🔔 Backend Notification System Documentation

## Overview

The backend notification system provides a robust, scalable solution for managing user notifications in the विप्रVivah application. It includes database storage, API endpoints, and automatic notification creation for various user actions.

## 🏗️ Architecture

### Database Schema
```javascript
// Notification Model Structure
{
  recipient: ObjectId,        // User who receives the notification
  sender: ObjectId,          // User who triggered the notification (optional)
  type: String,              // 'like', 'match', 'message', 'system', etc.
  title: String,             // Notification title
  message: String,           // Notification message
  data: Object,              // Additional data (profileId, etc.)
  read: Boolean,             // Read status
  readAt: Date,              // When notification was read
  priority: String,          // 'low', 'medium', 'high'
  expiresAt: Date,           // Auto-expiration date
  createdAt: Date,           // Creation timestamp
  updatedAt: Date            // Last update timestamp
}
```

### API Endpoints
```
GET    /api/notifications           # Get user's notifications
GET    /api/notifications/unread-count  # Get unread count
PATCH  /api/notifications/mark-read     # Mark notifications as read
DELETE /api/notifications/:id       # Delete specific notification
DELETE /api/notifications           # Clear all notifications
```

## 📁 File Structure

```
vipraVivahBackend/
├── models/
│   └── Notification.js              # Notification database model
├── controllers/
│   └── notificationController.js    # Notification API logic
├── routes/
│   └── notificationRoutes.js        # Notification API routes
└── server.js                        # Main server (updated with routes)
```

## 🚀 Features

### Core Features
- **Database Storage**: Persistent notification storage in MongoDB
- **Real-time Creation**: Automatic notifications for user actions
- **Pagination**: Efficient loading of large notification lists
- **Auto-expiration**: Automatic cleanup of old notifications
- **Priority System**: Different priority levels for notifications
- **Read Status Tracking**: Track when notifications are read
- **Sender Information**: Include sender details for relevant notifications

### Notification Types
- **Like**: When someone likes your profile
- **Match**: When there's a mutual like
- **System**: Welcome messages, profile updates
- **Profile Update**: Profile creation/update confirmations
- **Subscription**: Premium upgrades, expirations
- **Message**: New messages (future feature)
- **Profile View**: When someone views your profile (future)

## 🔧 Implementation Details

### 1. Notification Model (`models/Notification.js`)

```javascript
// Key Features:
- Virtual fields for time formatting
- Indexes for performance optimization
- Static methods for common operations
- Auto-expiration for old notifications
- Pre-save middleware for data validation
```

### 2. Notification Controller (`controllers/notificationController.js`)

```javascript
// Main Functions:
- getNotifications()      // Fetch user notifications with pagination
- getUnreadCount()       // Get unread notification count
- markAsRead()           // Mark notifications as read
- deleteNotification()    // Delete specific notification
- clearAllNotifications() // Clear all user notifications

// Utility Functions:
- createLikeNotification()     // Create like notifications
- createMatchNotification()    // Create match notifications
- createSystemNotification()   // Create system notifications
- createProfileUpdateNotification() // Profile update notifications
- createSubscriptionNotification()   // Subscription notifications
```

### 3. API Routes (`routes/notificationRoutes.js`)

```javascript
// Protected Routes (require authentication):
- GET / - Get notifications with pagination
- GET /unread-count - Get unread count
- PATCH /mark-read - Mark as read
- DELETE /:id - Delete specific notification
- DELETE / - Clear all notifications
```

## 🔄 Integration Points

### 1. Profile Like Notifications
**Location**: `controllers/interestController.js`
```javascript
// When user likes a profile
await createLikeNotification(likerId, likedProfileId);

// Check for mutual like (match)
const existingLike = await Interest.findOne({
  liker: likedUserId,
  liked: likerId
});

if (existingLike) {
  await createMatchNotification(likerId, likedUserId);
}
```

### 2. Profile Update Notifications
**Location**: `controllers/profileController.js`
```javascript
// After successful profile save
const isNewProfile = !existingProfile;
await createProfileUpdateNotification(req.user.id, isNewProfile);
```

### 3. System Notifications
**Location**: Various controllers
```javascript
// Welcome notification on login
await createSystemNotification(userId, 'Welcome', 'Welcome to विप्रVivah!');

// Subscription notifications
await createSubscriptionNotification(userId, 'upgrade', 'Premium activated!');
```

## 📊 Database Optimization

### Indexes
```javascript
// Performance indexes
{ recipient: 1, read: 1, createdAt: -1 }     // User notifications
{ recipient: 1, type: 1, createdAt: -1 }     // Type-based queries
{ createdAt: 1 }                              // Auto-expiration
{ recipient: 1 }                              // User-specific queries
```

### Auto-cleanup
```javascript
// TTL index for automatic deletion
{ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
```

## 🔒 Security Features

### Authentication
- All notification endpoints require valid JWT token
- User can only access their own notifications
- Proper authorization checks on all operations

### Data Validation
- Input validation for all API endpoints
- Sanitization of notification content
- Rate limiting for notification creation

### Privacy
- No sensitive data in notifications
- User consent for notification types
- Secure data transmission

## 📈 Performance Features

### Pagination
```javascript
// Efficient pagination
const skip = (page - 1) * limit;
const notifications = await Notification.find(query)
  .populate('sender', 'firstName lastName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
```

### Caching
- Unread count caching
- Notification list caching
- Redis integration (future)

### Optimization
- Lean queries for read operations
- Selective field population
- Efficient indexing strategy

## 🧪 Testing

### API Testing
```bash
# Test notification endpoints
curl -H "Authorization: Bearer <token>" \
  https://api.vipravivah.in/api/notifications

curl -H "Authorization: Bearer <token>" \
  https://api.vipravivah.in/api/notifications/unread-count
```

### Database Testing
```javascript
// Test notification creation
const notification = await Notification.createNotification({
  recipient: userId,
  type: 'like',
  title: 'New Like',
  message: 'Someone liked your profile!'
});
```

## 🔮 Future Enhancements

### Planned Features
- **WebSocket Integration**: Real-time notification delivery
- **Push Notifications**: Browser push notifications
- **Email Notifications**: Email alerts for important events
- **Notification Preferences**: User settings for notification types
- **Rich Notifications**: Images, buttons, interactive elements
- **Notification Templates**: Reusable notification templates
- **Analytics**: Notification engagement tracking
- **Bulk Operations**: Batch notification operations

### Advanced Features
```javascript
// Future WebSocket implementation
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
  });
});

// Real-time notification emission
io.to(`user_${recipientId}`).emit('notification', {
  type: 'like',
  message: 'Someone liked your profile!'
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Notifications not creating**
   - Check database connection
   - Verify user authentication
   - Check notification controller logs

2. **Performance issues**
   - Monitor database indexes
   - Check query optimization
   - Review pagination settings

3. **Memory leaks**
   - Monitor notification cleanup
   - Check TTL index functionality
   - Review notification expiration

### Debug Mode
```javascript
// Enable detailed logging
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  console.log('Notification created:', notificationData);
}
```

## 📝 Best Practices

### Development
1. **Use Predefined Functions**: Use `createLikeNotification()` instead of manual creation
2. **Include Relevant Data**: Always include necessary data in notifications
3. **Handle Errors**: Wrap notification calls in try-catch blocks
4. **Test Thoroughly**: Test all notification scenarios
5. **Monitor Performance**: Track notification creation performance

### Production
1. **Database Optimization**: Regular index maintenance
2. **Cleanup Jobs**: Automated cleanup of old notifications
3. **Monitoring**: Track notification system health
4. **Backup**: Regular notification data backups
5. **Security**: Regular security audits

## 🔧 Configuration

### Environment Variables
```bash
# Notification settings
NOTIFICATION_TTL_DAYS=30          # Auto-delete after 30 days
NOTIFICATION_MAX_PER_USER=1000     # Max notifications per user
NOTIFICATION_CLEANUP_INTERVAL=24   # Cleanup job interval (hours)
```

### Database Settings
```javascript
// MongoDB connection settings
const notificationSchema = new mongoose.Schema({
  // ... schema definition
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
```

## 📊 Monitoring

### Metrics to Track
- Notification creation rate
- Read/unread ratios
- User engagement with notifications
- System performance metrics
- Error rates and types

### Health Checks
```javascript
// Notification system health check
const healthCheck = async () => {
  const unreadCount = await Notification.countDocuments({ read: false });
  const totalCount = await Notification.countDocuments();
  return { unreadCount, totalCount, status: 'healthy' };
};
```

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintainer**: Backend Development Team 