const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const User = require('../models/User');
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
    isLivesWithFamily: profile.isLivesWithFamily, // Ensure exact mapping
    dateOfBirth: profile.dateOfBirth,
    age: profile.age,
    lookingFor: profile.lookingFor,
    height: profile.height,
    Aged: profile.Aged,
    subcaste: profile.subCaste, // Lowercase per frontend
    gotra: profile.gotra, // Ensure lowercase 'gotra'
    motherTongue: profile.motherTongue,
    maritalStatus: profile.maritalStatus,
    foodHabits: profile.foodHabit, // Match frontend field
    currentAddress: profile.currentAddress,
    permanentAddress: profile.permanentAddress,
    isCurrentPermanentSame: profile.isCurrentPermanentSame,
    HighestQualification: profile.HighestQualification,
    specialization: profile.specialization,
    university: profile.universityCollege, // Match frontend field
    yearOfCompletion: profile.yearOfCompletion,
    currentWorking: profile.currentWorking,
    occupation: profile.occupation,
    company: profile.company,
    workLocation: profile.workLocation,
    annualIncome: profile.annualIncome,
    instagram: profile.instaUrl, // Match frontend field
    facebook: profile.facebookUrl,
    linkedin: profile.linkedinUrl,
    idVerification: profile.idVerification
      ? {
          type: profile.idVerification.type,
          number: profile.idVerification.number,
        }
      : null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

const createOrUpdateProfile = async (req, res) => {
  if (isDev) console.log('CreateOrUpdateProfile: Request received', { userId: req.user.id, body: req.body, file: req.file?.originalname });
  try {
    const {
      lookingFor, profileFor, gender, firstName, middleName, lastName, fatherName, motherName,
      dateOfBirth, subCaste, gotra, motherTongue, height, phoneNumber, maritalStatus, foodHabit,
      HighestQualification, specialization, universityCollege, yearOfCompletion, currentWorking,
      occupation, company, workLocation, annualIncome, instaUrl, facebookUrl, linkedinUrl,
      idCardName, idCardNo, currentAddress, permanentAddress, isCurrentPermanentSame, isLivesWithFamily, Aged
    } = req.body;

    // Parse JSON fields from FormData
    let parsedCurrentAddress, parsedPermanentAddress;
    try {
      parsedCurrentAddress = currentAddress ? JSON.parse(currentAddress) : {};
      parsedPermanentAddress = permanentAddress ? JSON.parse(permanentAddress) : {};
    } catch (error) {
      if (isDev) console.error('CreateOrUpdateProfile: Failed to parse address fields', error);
      return res.status(400).json(new ApiResponse(400, 'Invalid address format'));
    }

    // Validate required fields
    const requiredFields = { profileFor, gender, firstName, lastName, dateOfBirth, gotra, motherTongue, maritalStatus, phoneNumber, lookingFor };
    const missingFields = Object.keys(requiredFields).filter(key => !requiredFields[key]);
    if (missingFields.length > 0) {
      if (isDev) console.log('CreateOrUpdateProfile: Missing required fields', { missingFields });
      return res.status(400).json(new ApiResponse(400, `Required fields are missing: ${missingFields.join(', ')}`));
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(phoneNumber)) {
      if (isDev) console.log('CreateOrUpdateProfile: Invalid phone number', { phoneNumber });
      return res.status(400).json(new ApiResponse(400, 'Phone number must be 10 digits'));
    }

    // Validate currentAddress (at least one field required)
    const addressFields = ['street', 'city', 'state', 'pincode'];
    const hasCurrentAddress = addressFields.some(field => parsedCurrentAddress[field]);
    if (!hasCurrentAddress) {
      if (isDev) console.log('CreateOrUpdateProfile: Current address is empty');
      return res.status(400).json(new ApiResponse(400, 'At least one current address field is required'));
    }

    // Calculate age from dateOfBirth
    const dob = new Date(dateOfBirth);
    if (isNaN(dob)) {
      if (isDev) console.log('CreateOrUpdateProfile: Invalid dateOfBirth', { dateOfBirth });
      return res.status(400).json(new ApiResponse(400, 'Invalid date of birth'));
    }
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));

    // Validate Aged (if provided, must match calculated age)
    if (Aged && Number(Aged) !== age) {
      if (isDev) console.log('CreateOrUpdateProfile: Aged does not match calculated age', { Aged, age });
      return res.status(400).json(new ApiResponse(400, 'Aged must match calculated age'));
    }

    // Transform isCurrentPermanentSame to boolean
    const transformedIsCurrentPermanentSame = isCurrentPermanentSame === 'true' || isCurrentPermanentSame === true;

    // Handle profile picture upload
    let profilePicture = null;
    if (req.file) {
      try {
        if (isDev) console.log('CreateOrUpdateProfile: Uploading profile picture to S3');
        profilePicture = await uploadImageToS3(req.file, 'profile-photos');
        if (isDev) console.log('CreateOrUpdateProfile: Profile picture uploaded', { profilePicture });
      } catch (error) {
        if (isDev) console.error('CreateOrUpdateProfile: Image upload failed', error);
        return res.status(500).json(new ApiResponse(500, 'Image upload failed', null, error.message));
      }
    }

    // Check if profile exists
    let profile = await Profile.findOne({ userId: req.user.id });

    if (profile) {
      // Update existing profile
      if (isDev) console.log('CreateOrUpdateProfile: Updating existing profile', { profileId: profile._id });
      if (profile.profilePicture && profilePicture && profile.profilePicture !== profilePicture) {
        if (isDev) console.log('CreateOrUpdateProfile: Deleting old profile picture from S3', { oldPhoto: profile.profilePicture });
        await deleteFromS3(profile.profilePicture);
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
            occupation,
            company,
            workLocation,
            annualIncome,
            instaUrl,
            facebookUrl,
            linkedinUrl,
            idCardName,
            idCardNo,
            profilePicture: profilePicture || profile.profilePicture,
            isLivesWithFamily: isLivesWithFamily || null,
            Aged: age,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    } else {
      // Create new profile
      if (isDev) console.log('CreateOrUpdateProfile: Creating new profile');
      profile = new Profile({
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
        occupation,
        company,
        workLocation,
        annualIncome,
        instaUrl,
        facebookUrl,
        linkedinUrl,
        idCardName,
        idCardNo,
        profilePicture,
        isLivesWithFamily: isLivesWithFamily || null,
        Aged: age
      });
      await profile.save();
    }

    // Update isProfileFlag in User
    if (isDev) console.log('CreateOrUpdateProfile: Updating User isProfileFlag', { userId: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { $set: { isProfileFlag: true } });

    if (isDev) console.log('CreateOrUpdateProfile: Profile saved successfully', { profileId: profile._id });
    res.status(200).json(new ApiResponse(200, 'Profile saved successfully', { profile: transformProfileForFrontend(profile) }));
  } catch (error) {
    if (isDev) console.error('CreateOrUpdateProfile: Error occurred', error);
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
    const profile = await Profile.findOne({ userId: req.user.id }).populate('userId', 'email isProfileFlag');
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
  if (isDev) console.log('ExploreProfiles: Request received', req.query);
  try {
    const { profileFor, motherTongue, subCaste, gotra, gender, lookingFor } = req.query;

    // Build query object
    const query = {};
    if (profileFor && profileFor !== 'Any') query.profileFor = profileFor;
    if (motherTongue && motherTongue !== 'Any') query.motherTongue = motherTongue;
    if (subCaste && subCaste !== 'Any') query.subCaste = subCaste;
    if (gotra && gotra !== 'Any') query.gotra = gotra;
    if (gender && gender !== 'Any') query.gender = gender;
    if (lookingFor && lookingFor !== 'Any') query.lookingFor = lookingFor;

    // Fetch profiles with filters
    if (isDev) console.log('ExploreProfiles: Querying profiles', query);
    const profiles = await Profile.find(query)
      .select('-idCardNo -idCardName -userId')
      .populate('userId', 'email isProfileFlag');

    const profileCount = profiles.length;
    if (isDev) console.log(`ExploreProfiles: Found ${profileCount} profiles`);

    res.status(200).json(new ApiResponse(200, `${profileCount} profiles found`, {
      profiles: profiles.map(transformProfileForFrontend),
      count: profileCount
    }));
  } catch (error) {
    if (isDev) console.error('ExploreProfiles: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error fetching profiles', null, error.message));
  }
};

const getProfileById = async (req, res) => {
  console.log('GetProfileById: Request received', { profileId: req.params.id });
  try {
    const profile = await Profile.findById(req.params.id)
      .select('-idCardNo -idCardName -userId')
      .populate('userId', 'email');
    if (!profile) {
      console.log('GetProfileById: Profile not found');
      return res.status(404).json(new ApiResponse(404, 'Profile not found'));
    }

    console.log('GetProfileById: Profile retrieved', { profile });
    res.status(200).json(new ApiResponse(200, 'Profile retrieved', { profile: transformProfileForFrontend(profile) }));
  } catch (error) {
     console.error('GetProfileById: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving profile', null, error.message));
  }
};

module.exports = { createOrUpdateProfile, getProfile, exploreProfiles, getProfileById };
