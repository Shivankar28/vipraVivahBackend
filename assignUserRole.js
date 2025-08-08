require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Assign 'user' role to all users except admins
const assignUserRole = async () => {
  try {
    console.log('🔄 Starting role assignment...');
    
    // Find all users that don't have a role or have 'user' role
    const usersToUpdate = await User.find({
      $or: [
        { role: { $exists: false } },
        { role: { $ne: 'admin' } }
      ]
    });
    
    console.log(`📊 Found ${usersToUpdate.length} users to update`);
    
    if (usersToUpdate.length === 0) {
      console.log('✅ No users need role assignment');
      return;
    }
    
    // Update all users to have 'user' role
    const result = await User.updateMany(
      {
        $or: [
          { role: { $exists: false } },
          { role: { $ne: 'admin' } }
        ]
      },
      { $set: { role: 'user' } }
    );
    
    console.log(`✅ Successfully updated ${result.modifiedCount} users with 'user' role`);
    
    // Verify the update
    const updatedUsers = await User.find({ role: 'user' });
    const adminUsers = await User.find({ role: 'admin' });
    
    console.log(`📈 Final counts:`);
    console.log(`   - Users with 'user' role: ${updatedUsers.length}`);
    console.log(`   - Users with 'admin' role: ${adminUsers.length}`);
    
    // Show admin users for verification
    if (adminUsers.length > 0) {
      console.log('\n👑 Admin users:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error assigning user roles:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await assignUserRole();
    console.log('\n🎉 Role assignment completed successfully!');
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
main();
