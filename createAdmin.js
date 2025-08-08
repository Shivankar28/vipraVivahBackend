require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create admin user or update existing user to admin
const createAdmin = async (email) => {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('User found, updating role to admin...');
      user.role = 'admin';
      await user.save();
      console.log(`User ${email} has been updated to admin role`);
    } else {
      console.log('User not found. Creating new admin user...');
      
      // Create new admin user (you'll need to set a password)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      user = new User({
        email,
        password: hashedPassword,
        isVerified: true,
        role: 'admin'
      });
      
      await user.save();
      console.log(`Admin user ${email} created successfully with password: admin123`);
    }
    
    console.log('Admin user details:', {
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  // Get email from command line arguments or use default
  const email = process.argv[2] || 'trustpunarutthan108@gmail.com';
  
  if (!email) {
    console.log('Usage: node createAdmin.js <email>');
    console.log('Example: node createAdmin.js admin@example.com');
    console.log('Default admin email: trustpunarutthan108@gmail.com');
    process.exit(1);
  }
  
  await createAdmin(email);
  
  // Close connection
  await mongoose.connection.close();
  console.log('Database connection closed');
  process.exit(0);
};

main();
