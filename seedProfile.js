require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Profile = require('./models/Profile');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const seed = async () => {
  try {
    // Clear existing data (optional)
    await User.deleteMany({});
    await Profile.deleteMany({});

    const users = [];

    // Create 10 demo users
    for (let i = 1; i <= 10; i++) {
      const user = new User({
        email: `demo${i}@test.com`,
        password: await bcrypt.hash('Password123', 10),
        isVerified: true,
        isProfileFlag: true
      });
      await user.save();
      users.push(user);
    }

    // Create 10 demo profiles
    const profileData = users.map((user, index) => ({
      userId: user._id,
      profilePhoto: '',
      profileFor: index % 2 === 0 ? 'Self' : 'Son',
      firstName: `Demo${index + 1}`,
      middleName: `Middle${index + 1}`,
      lastName: `User${index + 1}`,
      fatherName: `Father${index + 1}`,
      motherName: `Mother${index + 1}`,
      livesWithFamily: index % 2 === 0 ? 'Yes' : 'No',
      dateOfBirth: new Date(`199${index % 10}-0${(index % 9) + 1}-15`),
      age: 30 + index,
      subcaste: `Subcaste${index + 1}`,
      gotra: `Gotra${index + 1}`,
      motherTongue: index % 2 === 0 ? 'Hindi' : 'Marathi',
      maritalStatus: 'Unmarried',
      foodHabits: index % 2 === 0 ? 'Veg' : 'Non-Veg',
      highestQualification: 'B.Tech',
      specialization: 'Computer Science',
      universityCollege: 'Demo University',
      yearOfCompletion: 2015 + index,
      currentlyWorking: index % 2 === 0 ? 'Yes' : 'No',
      occupation: 'Software Engineer',
      company: 'DemoCorp',
      workLocation: 'Mumbai',
      annualIncome: '10 LPA',
      instagramProfile: `https://instagram.com/demo${index + 1}`,
      facebookProfile: `https://facebook.com/demo${index + 1}`,
      linkedinProfile: `https://linkedin.com/in/demo${index + 1}`,
      idType: 'Aadhar',
      idNumber: `1234-5678-90${index}0`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await Profile.insertMany(profileData);

    console.log('✅ Demo users and profiles added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
};

seed();
