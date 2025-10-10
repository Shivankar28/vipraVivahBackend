# 🌱 Database Seeding Guide

## Overview

This guide explains how to populate your विप्रVivah database with realistic demo data for development and testing purposes.

## What Gets Seeded

The `seed.js` script creates:

### 1. **Admin User** (1)
- Email: `admin@vipravivah.com`
- Password: `Admin@123`
- Role: `admin`

### 2. **Demo Users** (30)
- Emails: `demo1@vipravivah.com` to `demo30@vipravivah.com`
- Password: `Demo@123` (same for all)
- All users are verified and have complete profiles

### 3. **Profiles** (30)
- Diverse demographics (Male/Female)
- Ages: 22-40 years
- Various cities, occupations, and qualifications
- Realistic Indian matrimony data
- Different marital statuses
- Mix of vegetarian/non-vegetarian
- Various sub-castes, gotras, and mother tongues

### 4. **Subscriptions** (30)
- 25% Premium users (active for 30 days)
- 75% Free users
- All subscriptions are active

### 5. **User Preferences** (30)
- Customized preferences for each user
- Different match thresholds (60-80%)
- 66% users have match notifications enabled
- Realistic criteria weights

### 6. **Interests/Likes** (~60-150)
- Random likes between users
- Mutual matches (both users liked each other)
- Only opposite gender matches

### 7. **Notifications** (~200+)
- Like notifications
- Match notifications
- Welcome notifications
- Profile created notifications
- Mix of read/unread statuses

## Prerequisites

Before running the seed script, ensure:

1. ✅ MongoDB is running and accessible
2. ✅ `.env` file is configured with `MONGODB_URI`
3. ✅ All dependencies are installed (`npm install`)

## How to Run

### Option 1: Using npm script (Recommended)

```bash
cd vipraVivahBackend
npm run seed
```

### Option 2: Direct node execution

```bash
cd vipraVivahBackend
node seed.js
```

## Expected Output

```
🌱 Starting database seeding...

🗑️  Clearing existing data...
✅ Existing data cleared

👤 Creating admin user...
✅ Admin created: admin@vipravivah.com / Admin@123

👥 Creating 30 demo users...
✅ Created 30 demo users (Password: Demo@123)

📝 Creating profiles for users...
✅ Created 30 profiles

💳 Creating subscriptions...
✅ Created 30 subscriptions (8 premium, 22 free)

⚙️  Creating user preferences...
✅ Created 30 user preferences

❤️  Creating interests and matches...
✅ Created 120 likes (15 mutual matches)

🔔 Creating notifications...
✅ Created 250 notifications

═══════════════════════════════════════════════════
🎉 Database seeding completed successfully!

📊 Summary:
   • 1 Admin user
   • 30 Regular users
   • 30 Profiles
   • 30 Subscriptions (8 premium)
   • 30 User preferences
   • 120 Interests (15 matches)
   • 250 Notifications

🔐 Admin Credentials:
   Email: admin@vipravivah.com
   Password: Admin@123

👤 Demo User Credentials:
   Email: demo1@vipravivah.com to demo30@vipravivah.com
   Password: Demo@123

═══════════════════════════════════════════════════
```

## What to Test After Seeding

### 1. **Authentication**
- Login as admin: `admin@vipravivah.com` / `Admin@123`
- Login as any demo user: `demo1@vipravivah.com` / `Demo@123`

### 2. **Profile Browsing**
- Explore profiles page
- Test filters (gender, location, age, etc.)
- View individual profiles

### 3. **Interest/Like System**
- Like profiles
- Check mutual matches
- View "Who Liked Me" section
- View "Users I Liked" section

### 4. **Notifications**
- Check notification bell for unread count
- View notifications dropdown
- Test mark as read functionality
- Test delete notification
- Check real-time WebSocket updates

### 5. **Subscription Features**
- Login as free user (demo1, demo2, demo3, demo6, demo7...)
- Login as premium user (demo4, demo8, demo12, demo16...)
- Test premium-only features
- Test access restrictions for free users

### 6. **Admin Panel**
- Login as admin
- View user management
- View profile management
- View subscription statistics
- Check dashboard analytics

### 7. **Preferences & Matching**
- Update user preferences
- Check match suggestions
- Test match notification triggers

## Important Notes

⚠️ **WARNING**: This script will:
- **DELETE ALL EXISTING DATA** from the database
- Create fresh demo data
- Should only be used in **development/testing** environments

🔒 **Security**: 
- Never run this script in production
- Change default passwords in production
- Use strong passwords for real deployments

## Customization

You can customize the seed data by editing `seed.js`:

```javascript
// Change number of users
for (let i = 1; i <= 50; i++) { // Change 30 to 50

// Change premium percentage
const isPremium = i % 3 === 0; // 33% premium instead of 25%

// Add more realistic names
const firstNamesMale = ['Rahul', 'Amit', ...]; // Add more names

// Customize cities
const cities = ['Mumbai', 'Delhi', ...]; // Add more cities
```

## Troubleshooting

### Error: "MongoDB connection error"
```bash
# Check if MongoDB is running
mongosh

# Check .env file
cat .env | grep MONGODB_URI
```

### Error: "Cannot find module"
```bash
# Install dependencies
npm install
```

### Error: "Validation failed"
```bash
# Check model schemas in models/ folder
# Ensure all required fields are being populated
```

## Re-seeding

To re-seed the database (will clear existing data):

```bash
npm run seed
```

The script automatically clears all data before seeding, so you can run it multiple times.

## Support

If you encounter issues:
1. Check MongoDB connection
2. Verify environment variables
3. Check console logs for specific errors
4. Review model schemas for validation requirements

---

**Happy Testing! 🚀**


