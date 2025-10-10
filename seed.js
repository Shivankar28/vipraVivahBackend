require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Subscription = require('./models/Subscription');
const Interest = require('./models/Interest');
const Notification = require('./models/Notification');
const UserPreference = require('./models/UserPreference');
const connectDB = require('./config/db');

// Demo data arrays for realistic profiles
const firstNamesMale = ['Rahul', 'Amit', 'Arjun', 'Vikram', 'Karan', 'Rohan', 'Aditya', 'Siddharth', 'Nikhil', 'Rajesh', 'Ashok', 'Suresh', 'Prakash', 'Ravi', 'Ajay'];
const firstNamesFemale = ['Priya', 'Anjali', 'Sneha', 'Pooja', 'Kavita', 'Ritu', 'Neha', 'Divya', 'Shreya', 'Aarti', 'Sunita', 'Rekha', 'Meera', 'Anita', 'Sakshi'];
const lastNames = ['Sharma', 'Gupta', 'Verma', 'Singh', 'Kumar', 'Patel', 'Mishra', 'Joshi', 'Agarwal', 'Pandey', 'Dubey', 'Chaturvedi', 'Tripathi', 'Tiwari', 'Rao'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Nagpur', 'Surat', 'Chandigarh', 'Bhopal'];
const motherTongues = ['Hindi', 'Marathi', 'Telugu', 'Tamil', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam', 'Punjabi', 'Odia'];
const subCastes = ['Brahmin', 'Rajput', 'Vaishya', 'Kayastha', 'Khatri', 'Reddy', 'Naidu', 'Nair', 'Maratha', 'Jat'];
const gotras = ['Bharadwaj', 'Kashyap', 'Vashishth', 'Gautam', 'Jamadagni', 'Vishwamitra', 'Atri', 'Brighu', 'Angiras', 'Agastya'];
const qualifications = ['B.Tech', 'M.Tech', 'MBA', 'B.Com', 'M.Com', 'BBA', 'MCA', 'B.Sc', 'M.Sc', 'CA', 'MBBS', 'B.Pharm', 'M.Pharm'];
const occupations = ['Software Engineer', 'Business Analyst', 'Accountant', 'Teacher', 'Doctor', 'Entrepreneur', 'Manager', 'Consultant', 'Designer', 'Marketing Manager'];
const companies = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Google India', 'Microsoft', 'Amazon', 'Flipkart', 'Cognizant', 'Tech Mahindra', 'HCL', 'Capgemini'];

// Helper function to get random element from array
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper function to generate random phone number
const generatePhone = () => `${Math.floor(6000000000 + Math.random() * 3999999999)}`;

// Helper function to generate random date of birth
const generateDOB = (minAge, maxAge) => {
  const year = new Date().getFullYear() - Math.floor(Math.random() * (maxAge - minAge + 1)) - minAge;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
};

// Helper function to calculate age
const calculateAge = (dob) => {
  return Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
};

// Main seeding function
const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to MongoDB
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      Subscription.deleteMany({}),
      Interest.deleteMany({}),
      Notification.deleteMany({}),
      UserPreference.deleteMany({})
    ]);
    console.log('✅ Existing data cleared\n');

    // ======================
    // Create Admin User
    // ======================
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = new User({
      email: 'admin@vipravivah.com',
      password: adminPassword,
      isVerified: true,
      isProfileFlag: false,
      role: 'admin'
    });
    await adminUser.save();
    console.log('✅ Admin created: admin@vipravivah.com / Admin@123\n');

    // ======================
    // Create Regular Users
    // ======================
    console.log('👥 Creating 30 demo users...');
    const users = [];
    const hashedPassword = await bcrypt.hash('Demo@123', 10);

    for (let i = 1; i <= 30; i++) {
      const gender = i % 2 === 0 ? 'Male' : 'Female';
      const firstName = gender === 'Male' ? getRandomElement(firstNamesMale) : getRandomElement(firstNamesFemale);
      const lastName = getRandomElement(lastNames);
      
      const user = new User({
        email: `demo${i}@vipravivah.com`,
        password: hashedPassword,
        isVerified: true,
        isProfileFlag: true,
        role: 'user'
      });
      await user.save();
      users.push({ user, gender, firstName, lastName });
    }
    console.log(`✅ Created ${users.length} demo users (Password: Demo@123)\n`);

    // ======================
    // Create Profiles
    // ======================
    console.log('📝 Creating profiles for users...');
    const profiles = [];
    
    for (let i = 0; i < users.length; i++) {
      const { user, gender, firstName, lastName } = users[i];
      const dob = generateDOB(22, 40);
      const age = calculateAge(dob);
      const city = getRandomElement(cities);
      const motherTongue = getRandomElement(motherTongues);
      const subCaste = getRandomElement(subCastes);
      const gotra = getRandomElement(gotras);
      const qualification = getRandomElement(qualifications);
      const occupation = getRandomElement(occupations);
      const company = getRandomElement(companies);
      const isWorking = Math.random() > 0.2;
      
      const profile = new Profile({
        userId: user._id,
        profilePicture: null,
        profileFor: i % 3 === 0 ? 'Son' : i % 3 === 1 ? 'Daughter' : 'Self',
        gender: gender,
        phoneNumber: generatePhone(),
        firstName: firstName,
        middleName: i % 3 === 0 ? 'Kumar' : '',
        lastName: lastName,
        fatherName: `${getRandomElement(firstNamesMale)} ${lastName}`,
        motherName: `${getRandomElement(firstNamesFemale)} ${lastName}`,
        isLivesWithFamily: i % 3 === 0 ? 'Yes' : 'No',
        dateOfBirth: dob,
        age: age,
        lookingFor: gender === 'Male' ? 'Female' : 'Male',
        height: gender === 'Male' ? `${Math.floor(Math.random() * 15) + 165} cm` : `${Math.floor(Math.random() * 15) + 150} cm`,
        Aged: age,
        subCaste: subCaste,
        gotra: gotra,
        motherTongue: motherTongue,
        maritalStatus: i % 8 === 0 ? 'Divorced' : i % 15 === 0 ? 'Widowed' : 'Never Married',
        foodHabit: i % 4 === 0 ? 'Non-Vegetarian' : 'Vegetarian',
        currentAddress: {
          street: `${Math.floor(Math.random() * 100) + 1} MG Road`,
          city: city,
          state: city === 'Mumbai' ? 'Maharashtra' : city === 'Delhi' ? 'Delhi' : city === 'Bangalore' ? 'Karnataka' : 'Maharashtra',
          pincode: `${Math.floor(100000 + Math.random() * 899999)}`
        },
        permanentAddress: {
          street: `${Math.floor(Math.random() * 100) + 1} Main Street`,
          city: getRandomElement(cities),
          state: 'Maharashtra',
          pincode: `${Math.floor(100000 + Math.random() * 899999)}`
        },
        isCurrentPermanentSame: i % 5 === 0,
        HighestQualification: qualification,
        specialization: qualification.includes('Tech') ? 'Computer Science' : qualification.includes('Com') ? 'Finance' : 'General',
        universityCollege: `${getRandomElement(['IIT', 'NIT', 'Mumbai University', 'Delhi University', 'Anna University'])}`,
        yearOfCompletion: `${2010 + Math.floor(Math.random() * 13)}`,
        currentWorking: isWorking ? 'Yes' : 'No',
        occupation: isWorking ? occupation : '',
        company: isWorking ? company : '',
        workLocation: isWorking ? city : '',
        annualIncome: isWorking ? `${Math.floor(Math.random() * 30) + 5} LPA` : '0',
        instaUrl: i % 3 === 0 ? `https://instagram.com/${firstName.toLowerCase()}_${lastName.toLowerCase()}` : '',
        facebookUrl: i % 4 === 0 ? `https://facebook.com/${firstName.toLowerCase()}.${lastName.toLowerCase()}` : '',
        linkedinUrl: isWorking ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}` : '',
        idCardName: 'Aadhar Card',
        idCardNo: `${Math.floor(100000000000 + Math.random() * 899999999999)}`,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // Random date in last 90 days
        updatedAt: new Date()
      });
      
      await profile.save();
      profiles.push({ profile, userId: user._id, gender });
    }
    console.log(`✅ Created ${profiles.length} profiles\n`);

    // ======================
    // Update Subscriptions (auto-created by User model middleware)
    // ======================
    console.log('💳 Updating subscriptions...');
    let premiumCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const { user } = users[i];
      const isPremium = i % 4 === 0; // 25% premium users
      
      // Find the auto-created subscription
      const subscription = await Subscription.findOne({ userId: user._id });
      
      if (subscription) {
        // Update to premium if needed
        if (isPremium) {
          subscription.plan = 'premium';
          subscription.status = 'active';
          subscription.subscriptionStart = new Date();
          subscription.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          subscription.razorpayOrderId = `order_${Math.random().toString(36).substring(7)}`;
          subscription.razorpayPaymentId = `pay_${Math.random().toString(36).substring(7)}`;
          await subscription.save();
          premiumCount++;
        }
        // Free subscriptions are already created by middleware, no need to update
      }
    }
    console.log(`✅ Updated ${users.length} subscriptions (${premiumCount} premium, ${users.length - premiumCount} free)\n`);

    // ======================
    // Create User Preferences
    // ======================
    console.log('⚙️  Creating user preferences...');
    
    for (let i = 0; i < users.length; i++) {
      const { user, gender } = users[i];
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      
      const preference = new UserPreference({
        userId: user._id,
        preferredAgeRange: {
          min: gender === 'Male' ? 22 : 24,
          max: gender === 'Male' ? 32 : 35
        },
        preferredHeight: {
          min: gender === 'Male' ? '150 cm' : '165 cm',
          max: gender === 'Male' ? '170 cm' : '185 cm'
        },
        preferredEducation: ['B.Tech', 'M.Tech', 'MBA', 'B.Com', 'M.Com'],
        preferredOccupation: ['Software Engineer', 'Business Analyst', 'Manager'],
        preferredIncome: {
          min: '5 LPA',
          max: '25 LPA'
        },
        preferredCities: [profile.profile.currentAddress.city, ...cities.slice(0, 3)],
        preferredStates: ['Maharashtra', 'Karnataka', 'Delhi'],
        preferredCaste: [profile.profile.subCaste],
        preferredMotherTongue: [profile.profile.motherTongue],
        preferredMaritalStatus: ['Never Married', 'Divorced'],
        preferredFoodHabit: ['Vegetarian', 'Non-Vegetarian'],
        enableMatchNotifications: i % 3 !== 0, // 66% enable notifications
        notificationFrequency: i % 2 === 0 ? 'immediate' : 'daily',
        criteriaWeights: {
          age: 20,
          education: 15,
          occupation: 15,
          location: 20,
          cultural: 20,
          lifestyle: 10
        },
        matchThreshold: 60 + Math.floor(Math.random() * 20) // 60-80%
      });
      
      await preference.save();
    }
    console.log(`✅ Created ${users.length} user preferences\n`);

    // ======================
    // Create Interests/Likes
    // ======================
    console.log('❤️  Creating interests and matches...');
    let likesCount = 0;
    let matchesCount = 0;
    
    // Create random likes (some mutual, some one-way)
    for (let i = 0; i < users.length; i++) {
      const liker = users[i];
      const likerGender = liker.gender;
      
      // Each user likes 2-5 profiles of opposite gender
      const numLikes = Math.floor(Math.random() * 4) + 2;
      const potentialMatches = users.filter(u => u.gender !== likerGender);
      
      for (let j = 0; j < Math.min(numLikes, potentialMatches.length); j++) {
        const randomIndex = Math.floor(Math.random() * potentialMatches.length);
        const liked = potentialMatches[randomIndex];
        
        // Check if this interest already exists
        const existingInterest = await Interest.findOne({
          liker: liker.user._id,
          liked: liked.user._id
        });
        
        if (!existingInterest) {
          const interest = new Interest({
            liker: liker.user._id,
            liked: liked.user._id,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)) // Random date in last 60 days
          });
          
          await interest.save();
          likesCount++;
          
          // Check for mutual like (match)
          const mutualLike = await Interest.findOne({
            liker: liked.user._id,
            liked: liker.user._id
          });
          
          if (mutualLike) {
            matchesCount++;
          }
        }
        
        // Remove from potential matches to avoid duplicate likes
        potentialMatches.splice(randomIndex, 1);
      }
    }
    console.log(`✅ Created ${likesCount} likes (${matchesCount} mutual matches)\n`);

    // ======================
    // Create Notifications
    // ======================
    console.log('🔔 Creating notifications...');
    let notificationCount = 0;
    
    // Get all interests to create like notifications
    const allInterests = await Interest.find().limit(50); // Create notifications for first 50 likes
    
    for (const interest of allInterests) {
      const likerProfile = profiles.find(p => p.userId.toString() === interest.liker.toString());
      const likedProfile = profiles.find(p => p.userId.toString() === interest.liked.toString());
      
      if (likerProfile && likedProfile) {
        // Create like notification
        const likeNotification = new Notification({
          recipient: interest.liked,
          sender: interest.liker,
          type: 'like',
          title: 'New Profile Like',
          message: `${likerProfile.profile.firstName} ${likerProfile.profile.lastName} liked your profile!`,
          data: {
            likerId: interest.liker,
            likerName: `${likerProfile.profile.firstName} ${likerProfile.profile.lastName}`,
            likerProfileId: likerProfile.profile._id,
            profileId: likedProfile.profile._id
          },
          read: Math.random() > 0.5,
          priority: 'medium',
          createdAt: interest.createdAt
        });
        
        await likeNotification.save();
        notificationCount++;
        
        // Check for mutual like and create match notification
        const mutualLike = await Interest.findOne({
          liker: interest.liked,
          liked: interest.liker
        });
        
        if (mutualLike) {
          // Create match notifications for both users
          const matchNotification1 = new Notification({
            recipient: interest.liker,
            sender: interest.liked,
            type: 'match',
            title: "It's a Match!",
            message: `${likedProfile.profile.firstName} ${likedProfile.profile.lastName} also liked you back!`,
            data: {
              matchedUserId: interest.liked,
              matchedUserName: `${likedProfile.profile.firstName} ${likedProfile.profile.lastName}`,
              matchedProfileId: likedProfile.profile._id
            },
            read: Math.random() > 0.7,
            priority: 'high',
            createdAt: new Date(Math.max(interest.createdAt, mutualLike.createdAt))
          });
          
          const matchNotification2 = new Notification({
            recipient: interest.liked,
            sender: interest.liker,
            type: 'match',
            title: "It's a Match!",
            message: `${likerProfile.profile.firstName} ${likerProfile.profile.lastName} also liked you back!`,
            data: {
              matchedUserId: interest.liker,
              matchedUserName: `${likerProfile.profile.firstName} ${likerProfile.profile.lastName}`,
              matchedProfileId: likerProfile.profile._id
            },
            read: Math.random() > 0.7,
            priority: 'high',
            createdAt: new Date(Math.max(interest.createdAt, mutualLike.createdAt))
          });
          
          await matchNotification1.save();
          await matchNotification2.save();
          notificationCount += 2;
        }
      }
    }
    
    // Create welcome notifications for all users
    for (const { user } of users) {
      const welcomeNotification = new Notification({
        recipient: user._id,
        type: 'system',
        title: 'Welcome to विप्रVivah!',
        message: 'Welcome to विप्रVivah! Start exploring profiles and find your perfect match.',
        data: {},
        read: Math.random() > 0.8,
        priority: 'medium',
        createdAt: new Date(user.createdAt)
      });
      
      await welcomeNotification.save();
      notificationCount++;
    }
    
    // Create profile created notifications
    for (const { userId } of profiles) {
      const profileNotification = new Notification({
        recipient: userId,
        type: 'profile_update',
        title: 'Profile Created',
        message: 'Your profile has been created successfully! Start exploring matches.',
        data: { isNewProfile: true },
        read: Math.random() > 0.6,
        priority: 'medium',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 80 * 24 * 60 * 60 * 1000))
      });
      
      await profileNotification.save();
      notificationCount++;
    }
    
    console.log(`✅ Created ${notificationCount} notifications\n`);

    // ======================
    // Summary
    // ======================
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • 1 Admin user`);
    console.log(`   • ${users.length} Regular users`);
    console.log(`   • ${profiles.length} Profiles`);
    console.log(`   • ${users.length + 1} Subscriptions (${premiumCount} premium, ${users.length + 1 - premiumCount} free)`);
    console.log(`   • ${users.length} User preferences`);
    console.log(`   • ${likesCount} Interests (${matchesCount} matches)`);
    console.log(`   • ${notificationCount} Notifications\n`);
    console.log('🔐 Admin Credentials:');
    console.log('   Email: admin@vipravivah.com');
    console.log('   Password: Admin@123\n');
    console.log('👤 Demo User Credentials:');
    console.log('   Email: demo1@vipravivah.com to demo30@vipravivah.com');
    console.log('   Password: Demo@123\n');
    console.log('═══════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seed();

