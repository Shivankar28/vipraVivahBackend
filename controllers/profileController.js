const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { createProfileUpdateNotification } = require('./notificationController'); // Added missing import
const { findInterestedUsers, createDefaultPreferences } = require('./preferenceController');
const ApiResponse = require('../utils/apiResponse');
const { uploadImageToS3, deleteFromS3 } = require('../utils/s3Upload');

// Utility to check if in development mode
const isDev = process.env.NODE_ENV === 'development';

// Utility to transform profile data for frontend
const transformProfileForFrontend = (profile) => {
  return {
    _id: profile._id,
    userId: profile.userId
      ? {
          _id: profile.userId._id,
          email: profile.userId.email,
          isProfileFlag: profile.userId.isProfileFlag,
        }
      : null,
    profilePicture: profile.profilePicture,
    profileFor: profile.profileFor,
    gender: profile.gender,
    phoneNumber: profile.phoneNumber,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    fatherName: profile.fatherName,
    motherName: profile.motherName,
    isLivesWithFamily: profile.isLivesWithFamily,
    dateOfBirth: profile.dateOfBirth,
    age: profile.age,
    lookingFor: profile.lookingFor,
    height: profile.height,
    Aged: profile.Aged,
    subCaste: profile.subCaste,
    gotra: profile.gotra,
    motherTongue: profile.motherTongue,
    maritalStatus: profile.maritalStatus,
    foodHabit: profile.foodHabit,
    currentAddress: profile.currentAddress,
    permanentAddress: profile.permanentAddress,
    isCurrentPermanentSame: profile.isCurrentPermanentSame,
    HighestQualification: profile.HighestQualification,
    specialization: profile.specialization,
    universityCollege: profile.universityCollege,
    yearOfCompletion: profile.yearOfCompletion,
    currentWorking: profile.currentWorking,
    occupation: profile.occupation,
    company: profile.company,
    workLocation: profile.workLocation,
    annualIncome: profile.annualIncome,
    instaUrl: profile.instaUrl,
    facebookUrl: profile.facebookUrl,
    linkedinUrl: profile.linkedinUrl,
    idCardName: profile.idCardName,
    idCardNo: profile.idCardNo,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

const createOrUpdateProfile = async (req, res) => {
  console.log('CreateOrUpdateProfile: Request received', { userId: req.user.id, body: req.body, file: req.file?.originalname });

  try {
    const {
      lookingFor, profileFor, gender, firstName, middleName, lastName, fatherName, motherName,
      dateOfBirth, subCaste, gotra, motherTongue, height, phoneNumber, maritalStatus, foodHabit,
      HighestQualification, specialization, universityCollege, yearOfCompletion, currentWorking,
      occupation, company, workLocation, annualIncome, instaUrl, facebookUrl, linkedinUrl,
      idCardName, idCardNo, currentAddress, permanentAddress, isCurrentPermanentSame, isLivesWithFamily, Aged
    } = req.body;

    console.log('CreateOrUpdateProfile: Destructured fields', {
      HighestQualification,
      specialization,
      universityCollege,
      yearOfCompletion,
      currentWorking,
      occupation,
      company,
      workLocation,
      annualIncome,
      instaUrl,
      facebookUrl,
      linkedinUrl,
      idCardName,
      idCardNo
    });

    // Parse JSON fields from FormData
    let parsedCurrentAddress, parsedPermanentAddress;
    try {
      parsedCurrentAddress = currentAddress ? JSON.parse(currentAddress) : {};
      parsedPermanentAddress = permanentAddress ? JSON.parse(permanentAddress) : {};
      console.log('CreateOrUpdateProfile: Parsed addresses', { parsedCurrentAddress, parsedPermanentAddress });
    } catch (error) {
      console.error('CreateTesla: Failed to parse address fields', error);
      return res.status(400).json(new ApiResponse(400, 'Invalid address format'));
    }

    // Validate required fields
    const requiredFields = { profileFor, gender, firstName, lastName, dateOfBirth, gotra, motherTongue, maritalStatus, phoneNumber, lookingFor };
    
    // Add occupation fields to required only if currently working
    if (currentWorking === 'Yes') {
      requiredFields.occupation = occupation;
      requiredFields.company = company;
      requiredFields.workLocation = workLocation;
      requiredFields.annualIncome = annualIncome;
    }
    
    const missingFields = Object.keys(requiredFields).filter(key => !requiredFields[key]);
    if (missingFields.length > 0) {
      console.log('CreateOrUpdateProfile: Missing required fields', { missingFields });
      return res.status(400).json(new ApiResponse(400, `Required fields are missing: ${missingFields.join(', ')}`));
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(phoneNumber)) {
      console.log('CreateOrUpdateProfile: Invalid phone number', { phoneNumber });
      return res.status(400).json(new ApiResponse(400, 'Phone number must be 10 digits'));
    }

    // Validate currentAddress (at least one field required)
    const addressFields = ['street', 'city', 'state', 'pincode'];
    const hasCurrentAddress = addressFields.some(field => parsedCurrentAddress[field]);
    if (!hasCurrentAddress) {
      console.log('CreateOrUpdateProfile: Current address is empty');
      return res.status(400).json(new ApiResponse(400, 'At least one current address field is required'));
    }

    // Calculate age from dateOfBirth
    const dob = new Date(dateOfBirth);
    if (isNaN(dob)) {
      console.log('CreateOrUpdateProfile: Invalid dateOfBirth', { dateOfBirth });
      return res.status(400).json(new ApiResponse(400, 'Invalid date of birth'));
    }
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    console.log('CreateOrUpdateProfile: Calculated age', { dateOfBirth, age });

    // Validate Aged (if provided, must match calculated age)
    if (Aged && Number(Aged) !== age) {
      console.log('CreateOrUpdateProfile: Aged does not match calculated age', { Aged, age });
      return res.status(400).json(new ApiResponse(400, 'Aged must match calculated age'));
    }

    // Transform isCurrentPermanentSame to boolean
    const transformedIsCurrentPermanentSame = isCurrentPermanentSame === 'true' || isCurrentPermanentSame === true;
    console.log('CreateOrUpdateProfile: Transformed isCurrentPermanentSame', { isCurrentPermanentSame, transformedIsCurrentPermanentSame });

    // Handle profile picture upload
    let profilePicture = null;
    if (req.file) {
      try {
        console.log('CreateOrUpdateProfile: Uploading profile picture to S3', { file: req.file.originalname });
        profilePicture = await uploadImageToS3(req.file, 'profile-photos');
        console.log('CreateOrUpdateProfile: Profile picture uploaded', { profilePicture });
      } catch (error) {
        console.error('CreateOrUpdateProfile: Image upload failed', error);
        return res.status(500).json(new ApiResponse(500, 'Image upload failed', null, error.message));
      }
    }

    // Check if profile exists
    let existingProfile = await Profile.findOne({ userId: req.user.id });
    console.log('CreateOrUpdateProfile: Profile exists check', { profileExists: !!existingProfile });
    
    let profile; // Declare profile outside the if/else blocks

    if (existingProfile) {
      // Update existing profile
      console.log('CreateOrUpdateProfile: Updating existing profile', { profileId: existingProfile._id });
      if (existingProfile.profilePicture && profilePicture && existingProfile.profilePicture !== profilePicture) {
        console.log('CreateOrUpdateProfile: Deleting old profile picture from S3', { oldPhoto: existingProfile.profilePicture });
        try {
          await deleteFromS3(existingProfile.profilePicture);
        } catch (error) {
          console.error('CreateOrUpdateProfile: Failed to delete old profile picture from S3', error);
        }
      }

      profile = await Profile.findOneAndUpdate(
        { userId: req.user.id },
        {
          $set: {
            lookingFor,
            profileFor,
            gender,
            firstName,
            middleName,
            lastName,
            fatherName,
            motherName,
            dateOfBirth,
            age,
            subCaste,
            gotra,
            motherTongue,
            height,
            phoneNumber,
            maritalStatus,
            foodHabit,
            currentAddress: parsedCurrentAddress,
            permanentAddress: transformedIsCurrentPermanentSame ? parsedCurrentAddress : parsedPermanentAddress,
            isCurrentPermanentSame: transformedIsCurrentPermanentSame,
            HighestQualification,
            specialization,
            universityCollege,
            yearOfCompletion,
            currentWorking,
            occupation: currentWorking === 'Yes' ? occupation : '',
            company: currentWorking === 'Yes' ? company : '',
            workLocation: currentWorking === 'Yes' ? workLocation : '',
            annualIncome: currentWorking === 'Yes' ? annualIncome : '',
            instaUrl,
            facebookUrl,
            linkedinUrl,
            idCardName,
            idCardNo,
            profilePicture: profilePicture || existingProfile.profilePicture,
            isLivesWithFamily: isLivesWithFamily || null,
            Aged: age,
            updatedAt: new Date()
          }
        },
        { new: true }
      ).catch(err => {
        console.error('CreateOrUpdateProfile: Failed to update profile', err);
        throw err;
      });
      console.log('CreateOrUpdateProfile: Profile updated', { profileId: profile._id });
    } else {
      // Create new profile
      console.log('CreateOrUpdateProfile: Creating new profile');
      
      const profileDataToSave = {
        userId: req.user.id,
        lookingFor,
        profileFor,
        gender,
        firstName,
        middleName,
        lastName,
        fatherName,
        motherName,
        dateOfBirth,
        age,
        subCaste,
        gotra,
        motherTongue,
        height,
        phoneNumber,
        maritalStatus,
        foodHabit,
        currentAddress: parsedCurrentAddress,
        permanentAddress: transformedIsCurrentPermanentSame ? parsedCurrentAddress : parsedPermanentAddress,
        isCurrentPermanentSame: transformedIsCurrentPermanentSame,
        HighestQualification,
        specialization,
        universityCollege,
        yearOfCompletion,
        currentWorking,
        occupation: currentWorking === 'Yes' ? occupation : '',
        company: currentWorking === 'Yes' ? company : '',
        workLocation: currentWorking === 'Yes' ? workLocation : '',
        annualIncome: currentWorking === 'Yes' ? annualIncome : '',
        instaUrl,
        facebookUrl,
        linkedinUrl,
        idCardName,
        idCardNo,
        profilePicture,
        isLivesWithFamily: isLivesWithFamily || null,
        Aged: age
      };
      
      console.log('CreateOrUpdateProfile: Profile data being saved:', JSON.stringify(profileDataToSave, null, 2));
      
      profile = new Profile(profileDataToSave);
      await profile.save().catch(err => {
        console.error('CreateOrUpdateProfile: Failed to save new profile', err);
        throw err;
      });
      console.log('CreateOrUpdateProfile: New profile created', { profileId: profile._id });
    }

    // Update isProfileFlag in User
    console.log('CreateOrUpdateProfile: Updating User isProfileFlag', { userId: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { $set: { isProfileFlag: true } }).catch(err => {
      console.error('CreateOrUpdateProfile: Failed to update User isProfileFlag', err);
      throw err;
    });
    console.log('CreateOrUpdateProfile: User isProfileFlag updated', { userId: req.user.id });

    console.log('CreateOrUpdateProfile: Profile saved successfully', { profileId: profile._id });
    
    // Create notification for profile update
    const isNewProfile = !existingProfile;
    await createProfileUpdateNotification(req.user.id, isNewProfile);
    
    // If this is a new profile, create default preferences for the user
    if (isNewProfile) {
      try {
        console.log('CreateOrUpdateProfile: Creating default preferences for new user', { userId: req.user.id });
        await createDefaultPreferences(req.user.id);
        console.log('CreateOrUpdateProfile: Default preferences created successfully');
      } catch (error) {
        console.error('CreateOrUpdateProfile: Error creating default preferences', error);
        // Don't fail the profile creation if preferences creation fails
      }
    }
    
    // If this is a new profile, find interested users and send notifications
    if (isNewProfile) {
      console.log('CreateOrUpdateProfile: New profile created, finding interested users');
      console.log('CreateOrUpdateProfile: Profile data for matching', {
        age: profile.age,
        gender: profile.gender,
        lookingFor: profile.lookingFor,
        subCaste: profile.subCaste,
        occupation: profile.occupation,
        HighestQualification: profile.HighestQualification,
        currentAddress: profile.currentAddress,
        profileId: profile._id,
        userId: profile.userId
      });
      
      // Log the full profile object for debugging
      console.log('CreateOrUpdateProfile: Full profile object', JSON.stringify(profile.toObject(), null, 2));
      
      const interestedUsers = await findInterestedUsers(profile);
      
      if (interestedUsers.length > 0) {
        console.log('CreateOrUpdateProfile: Sending notifications to interested users', { count: interestedUsers.length });
        
        // Import notification controller functions
        const { createNotification } = require('./notificationController');
        
        // Send notifications to interested users
        for (const interestedUser of interestedUsers) {
          try {
            await createNotification({
              recipient: interestedUser.userId,
              sender: req.user.id,
              type: 'match',
              title: 'New Profile Match!',
              message: `A new profile matches your preferences! Check it out.`,
              data: {
                newProfileId: profile._id,
                matchScore: interestedUser.matchScore,
                matchReasons: interestedUser.matchReasons
              },
              priority: 'high'
            });
            
            console.log('CreateOrUpdateProfile: Notification sent to user', { 
              recipient: interestedUser.userId, 
              matchScore: interestedUser.matchScore 
            });
          } catch (error) {
            console.error('CreateOrUpdateProfile: Error sending notification to user', { 
              userId: interestedUser.userId, 
              error: error.message 
            });
          }
        }
      } else {
        console.log('CreateOrUpdateProfile: No interested users found for new profile');
        console.log('CreateOrUpdateProfile: This could be because:');
        console.log('CreateOrUpdateProfile: 1. No users have preferences set up');
        console.log('CreateOrUpdateProfile: 2. No users have enableMatchNotifications: true');
        console.log('CreateOrUpdateProfile: 3. The matching threshold is too high');
        console.log('CreateOrUpdateProfile: 4. The profile data doesn\'t match any preferences');
      }
    }
    
    res.status(200).json(new ApiResponse(200, 'Profile saved successfully', { profile: transformProfileForFrontend(profile) }));
  } catch (error) {
    console.error('CreateOrUpdateProfile: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error saving profile', null, error.message));
  }
};

const getProfile = async (req, res) => {
  if (!req.user || !req.user.id) {
    console.log('GetProfile: No user ID in request');
    return res.status(401).json(new ApiResponse(401, 'Unauthorized: No user ID'));
  }
  console.log('GetProfile: Request received', { userId: req.user.id });

  try {
    console.log('GetProfile: Querying profile for user', { userId: req.user.id });
    const profile = await Profile.findOne({ userId: req.user.id })
      .populate('userId', 'email isProfileFlag')
      .catch(err => {
        console.error('GetProfile: Failed to query profile', err);
        throw err;
      });
    if (!profile) {
      console.log('GetProfile: Profile not found');
      return res.status(404).json(new ApiResponse(404, 'Profile not found'));
    }
    console.log('GetProfile: Profile retrieved', { profileId: profile._id });
    res.status(200).json(new ApiResponse(200, 'Profile retrieved', { profile: transformProfileForFrontend(profile) }));
  } catch (error) {
    console.error('GetProfile: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving profile', null, error.message));
  }
};

const exploreProfiles = async (req, res) => {
  console.log('ExploreProfiles: Request received', req.query);

  try {
    const { profileFor, motherTongue, subCaste, gotra, gender, lookingFor } = req.query;

    // Build query object
    const query = {};
    if (profileFor && profileFor !== 'Any') query.profileFor = profileFor;
    if (motherTongue && motherTongue !== 'Any') query.motherTongue = motherTongue.toLowerCase(); // Normalize case
    if (subCaste && subCaste !== 'Any') query.subCaste = subCaste.toLowerCase();
    if (gotra && gotra !== 'Any') query.gotra = gotra.toLowerCase();
    if (gender && gender !== 'Any') query.gender = gender.toLowerCase();
    if (lookingFor && lookingFor !== 'Any') query.lookingFor = lookingFor.toLowerCase();
    console.log('ExploreProfiles: Built query', query);

    // Exclude current user's profile
    if (req.user && req.user.id) {
      query.userId = { $ne: req.user.id };
      console.log('ExploreProfiles: Excluding current user profile', { userId: req.user.id });
    }

    // Check subscription status for field restrictions
    console.log('ExploreProfiles: Checking subscription status', { userId: req.user.id });
    const subscription = await Subscription.findOne({ userId: req.user.id }).catch(err => {
      console.error('ExploreProfiles: Failed to query subscription', err);
      throw err;
    });
    const isPremium = subscription && subscription.plan === 'premium' && subscription.status === 'active' && subscription.subscriptionEnd > new Date();
    console.log('ExploreProfiles: Subscription status', { isPremium });

    // Define fields to select based on subscription
    let selectFields = '-idCardNo -idCardName -userId';
    if (!isPremium) {
      selectFields += ' -phoneNumber -instaUrl -facebookUrl -linkedinUrl';
    }
    console.log('ExploreProfiles: Select fields', { selectFields });

    // Fetch profiles with filters
    console.log('ExploreProfiles: Querying profiles', query);
    const profiles = await Profile.find(query)
      .select(selectFields)
      .populate('userId', 'email isProfileFlag')
      .catch(err => {
        console.error('ExploreProfiles: Failed to query profiles', err);
        throw err;
      });
    const profileCount = profiles.length;
    console.log(`ExploreProfiles: Found ${profileCount} profiles`);

    res.status(200).json(new ApiResponse(200, `${profileCount} profiles found`, {
      profiles: profiles.map(transformProfileForFrontend),
      count: profileCount
    }));
  } catch (error) {
    console.error('ExploreProfiles: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error fetching profiles', null, error.message));
  }
};

const getProfileById = async (req, res) => {
  console.log('GetProfileById: Request received', { profileId: req.params.id });

  try {
    // Allow user to access their own profile by ID
    if (req.user && req.user.id && req.user.id === req.params.id) {
      console.log('GetProfileById: User accessing own profile', { userId: req.user.id });
    } else {
      // Restrict access to other users' profiles to premium users only
      const subscription = await Subscription.findOne({ userId: req.user.id });
      console.log("subscription",subscription)
      const isPremium = subscription && subscription.plan === 'premium' && subscription.status === 'active';
      if (!isPremium) {
        console.log('GetProfileById: Access denied, not premium', { userId: req.user.id });
        return res.status(403).json(new ApiResponse(403, 'Upgrade to premium to view other profiles'));
      }
    }

    const selectFields = '-idCardNo -idCardName -userId';
    console.log('GetProfileById: Select fields', { selectFields });

    console.log('GetProfileById: Querying profile', { profileId: req.params.id });
    const profile = await Profile.findById(req.params.id)
      .select(selectFields)
      .populate('userId', 'email')
      .catch(err => {
        console.error('GetProfileById: Failed to query profile', err);
        throw err;
      });
    if (!profile) {
      console.log('GetProfileById: Profile not found');
      return res.status(404).json(new ApiResponse(404, 'Profile not found'));
    }

    console.log('GetProfileById: Profile retrieved', { profileId: profile._id });
    res.status(200).json(new ApiResponse(200, 'Profile retrieved', { profile: transformProfileForFrontend(profile) }));
  } catch (error) {
    console.error('GetProfileById: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving profile', null, error.message));
  }
};

module.exports = { createOrUpdateProfile, getProfile, exploreProfiles, getProfileById };