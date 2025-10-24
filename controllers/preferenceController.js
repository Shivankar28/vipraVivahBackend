const UserPreference = require('../models/UserPreference');
const Profile = require('../models/Profile');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// Create or update user preferences
const createOrUpdatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferenceData = req.body;

    console.log('createOrUpdatePreferences: Request received', { userId, preferenceData });
    console.log('createOrUpdatePreferences: Request body type:', typeof req.body);
    console.log('createOrUpdatePreferences: Request body keys:', Object.keys(req.body));

    // Check if user has a profile
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(400).json(new ApiResponse(400, 'Please complete your profile first'));
    }

    // Create or update preferences
    console.log('createOrUpdatePreferences: About to save preferences to database');
    const preferences = await UserPreference.findOneAndUpdate(
      { userId },
      { ...preferenceData, userId },
      { new: true, upsert: true }
    );

    console.log('createOrUpdatePreferences: Preferences saved successfully', { 
      preferencesId: preferences._id,
      userId: preferences.userId,
      savedData: {
        preferredAgeRange: preferences.preferredAgeRange,
        preferredEducation: preferences.preferredEducation,
        matchThreshold: preferences.matchThreshold
      }
    });

    res.status(200).json(new ApiResponse(200, 'Preferences saved successfully', { preferences }));
  } catch (error) {
    console.error('createOrUpdatePreferences: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error saving preferences', null, error.message));
  }
};

// Get user preferences
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    //console.log('getUserPreferences: Request received', { userId });

    const preferences = await UserPreference.findOne({ userId });
    
    if (!preferences) {
      return res.status(404).json(new ApiResponse(404, 'No preferences found'));
    }

    //console.log('getUserPreferences: Preferences retrieved', { preferences: preferences._id });

    res.status(200).json(new ApiResponse(200, 'Preferences retrieved successfully', { preferences }));
  } catch (error) {
    console.error('getUserPreferences: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving preferences', null, error.message));
  }
};

// Update user preferences (PATCH - partial update)
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    //console.log('updatePreferences: Request received', { userId, updateData });

    // Check if preferences exist
    const existingPreferences = await UserPreference.findOne({ userId });
    if (!existingPreferences) {
      return res.status(404).json(new ApiResponse(404, 'No preferences found. Please create preferences first.'));
    }

    // Update preferences
    const updatedPreferences = await UserPreference.findOneAndUpdate(
      { userId },
      { ...updateData, userId },
      { new: true, runValidators: true }
    );

    //console.log('updatePreferences: Preferences updated', { preferences: updatedPreferences._id });

    res.status(200).json(new ApiResponse(200, 'Preferences updated successfully', { preferences: updatedPreferences }));
  } catch (error) {
    console.error('updatePreferences: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error updating preferences', null, error.message));
  }
};

// Delete user preferences
const deletePreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    //console.log('deletePreferences: Request received', { userId });

    const deletedPreferences = await UserPreference.findOneAndDelete({ userId });
    
    if (!deletedPreferences) {
      return res.status(404).json(new ApiResponse(404, 'No preferences found to delete'));
    }

    //console.log('deletePreferences: Preferences deleted', { preferences: deletedPreferences._id });

    res.status(200).json(new ApiResponse(200, 'Preferences deleted successfully', { preferences: deletedPreferences }));
  } catch (error) {
    console.error('deletePreferences: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error deleting preferences', null, error.message));
  }
};

// Get all preferences (admin only)
const getAllPreferences = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;

    //console.log('getAllPreferences: Request received', { page, limit, sortBy, sortOrder });

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const preferences = await UserPreference.find()
      .populate('userId', 'firstName lastName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserPreference.countDocuments();

    //console.log('getAllPreferences: Preferences retrieved', { count: preferences.length, total });

    res.status(200).json(new ApiResponse(200, 'All preferences retrieved successfully', {
      preferences,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }));
  } catch (error) {
    console.error('getAllPreferences: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving all preferences', null, error.message));
  }
};

// Get preferences by user ID (admin only)
const getPreferencesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    //console.log('getPreferencesByUserId: Request received', { userId });

    const preferences = await UserPreference.findOne({ userId }).populate('userId', 'firstName lastName email');
    
    if (!preferences) {
      return res.status(404).json(new ApiResponse(404, 'No preferences found for this user'));
    }

    //console.log('getPreferencesByUserId: Preferences retrieved', { preferences: preferences._id });

    res.status(200).json(new ApiResponse(200, 'User preferences retrieved successfully', { preferences }));
  } catch (error) {
    console.error('getPreferencesByUserId: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving user preferences', null, error.message));
  }
};

// Reset preferences to default
const resetPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    //console.log('resetPreferences: Request received', { userId });

    // Delete existing preferences
    await UserPreference.findOneAndDelete({ userId });

    // Create default preferences
    const defaultPreferences = await createDefaultPreferences(userId);

    //console.log('resetPreferences: Preferences reset to default', { preferences: defaultPreferences._id });

    res.status(200).json(new ApiResponse(200, 'Preferences reset to default successfully', { preferences: defaultPreferences }));
  } catch (error) {
    console.error('resetPreferences: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error resetting preferences', null, error.message));
  }
};

// Validate preference data
const validatePreferenceData = (data) => {
  const errors = [];

  // Validate age range
  if (data.preferredAgeRange) {
    if (data.preferredAgeRange.min && (data.preferredAgeRange.min < 18 || data.preferredAgeRange.min > 80)) {
      errors.push('Minimum age must be between 18 and 80');
    }
    if (data.preferredAgeRange.max && (data.preferredAgeRange.max < 18 || data.preferredAgeRange.max > 80)) {
      errors.push('Maximum age must be between 18 and 80');
    }
    if (data.preferredAgeRange.min && data.preferredAgeRange.max && data.preferredAgeRange.min > data.preferredAgeRange.max) {
      errors.push('Minimum age cannot be greater than maximum age');
    }
  }

  // Validate match threshold
  if (data.matchThreshold && (data.matchThreshold < 0 || data.matchThreshold > 100)) {
    errors.push('Match threshold must be between 0 and 100');
  }

  // Validate criteria weights
  if (data.criteriaWeights) {
    const weights = data.criteriaWeights;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + (weight || 0), 0);
    if (totalWeight > 100) {
      errors.push('Total criteria weights cannot exceed 100');
    }
  }

  // Validate notification frequency
  if (data.notificationFrequency && !['immediate', 'daily', 'weekly'].includes(data.notificationFrequency)) {
    errors.push('Notification frequency must be immediate, daily, or weekly');
  }

  return errors;
};

// Find matching profiles for a user
const findMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, page = 1 } = req.query;

    //console.log('findMatches: Request received', { userId, limit, page });

    const preferences = await UserPreference.findOne({ userId });
    if (!preferences) {
      return res.status(404).json(new ApiResponse(404, 'No preferences found. Please set your preferences first.'));
    }

    // Get all profiles except user's own
    const allProfiles = await Profile.find({ 
      userId: { $ne: userId } 
    }).populate('userId');

    const matches = [];
    
    for (const profile of allProfiles) {
      const matchScore = calculateMatchScore(preferences, profile);
      if (matchScore >= preferences.matchThreshold) {
        matches.push({
          profile,
          matchScore,
          matchReasons: getMatchReasons(preferences, profile)
        });
      }
    }

    // Sort by match score and paginate
    const sortedMatches = matches.sort((a, b) => b.matchScore - a.matchScore);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatches = sortedMatches.slice(startIndex, endIndex);

    // console.log('findMatches: Matches found', { 
    //   total: matches.length, 
    //   returned: paginatedMatches.length,
    //   page,
    //   limit
    // });

    res.status(200).json(new ApiResponse(200, 'Matches found successfully', {
      matches: paginatedMatches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: matches.length,
        pages: Math.ceil(matches.length / limit)
      }
    }));
  } catch (error) {
    console.error('findMatches: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error finding matches', null, error.message));
  }
};

// Calculate match score between preference and profile
function calculateMatchScore(preference, profile) {
  let totalScore = 0;
  let totalWeight = 0;

  // Age matching
  if (preference.preferredAgeRange && profile.age) {
    const ageScore = calculateAgeScore(preference.preferredAgeRange, profile.age);
    totalScore += ageScore * preference.criteriaWeights.age;
    totalWeight += preference.criteriaWeights.age;
  }

  // Education matching
  if (preference.preferredEducation && profile.HighestQualification) {
    const educationScore = calculateEducationScore(preference.preferredEducation, profile.HighestQualification);
    totalScore += educationScore * preference.criteriaWeights.education;
    totalWeight += preference.criteriaWeights.education;
  }

  // Occupation matching
  if (preference.preferredOccupation && profile.occupation) {
    const occupationScore = calculateOccupationScore(preference.preferredOccupation, profile.occupation);
    totalScore += occupationScore * preference.criteriaWeights.occupation;
    totalWeight += preference.criteriaWeights.occupation;
  }

  // Location matching
  if (preference.preferredCities && profile.currentAddress?.city) {
    const locationScore = calculateLocationScore(preference.preferredCities, profile.currentAddress.city);
    totalScore += locationScore * preference.criteriaWeights.location;
    totalWeight += preference.criteriaWeights.location;
  }

  // Cultural matching
  if (preference.preferredCaste && profile.subCaste) {
    const culturalScore = calculateCulturalScore(preference.preferredCaste, profile.subCaste);
    totalScore += culturalScore * preference.criteriaWeights.cultural;
    totalWeight += preference.criteriaWeights.cultural;
  }

  // Lifestyle matching
  if (preference.preferredMaritalStatus && profile.maritalStatus) {
    const lifestyleScore = calculateLifestyleScore(preference.preferredMaritalStatus, profile.maritalStatus);
    totalScore += lifestyleScore * preference.criteriaWeights.lifestyle;
    totalWeight += preference.criteriaWeights.lifestyle;
  }

  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
}

// Helper functions for calculating scores
function calculateAgeScore(ageRange, profileAge) {
  if (profileAge >= ageRange.min && profileAge <= ageRange.max) {
    return 100;
  }
  return 0;
}

function calculateEducationScore(preferredEducation, profileEducation) {
  return preferredEducation.includes(profileEducation) ? 100 : 0;
}

function calculateOccupationScore(preferredOccupation, profileOccupation) {
  return preferredOccupation.includes(profileOccupation) ? 100 : 0;
}

function calculateLocationScore(preferredCities, profileCity) {
  return preferredCities.includes(profileCity) ? 100 : 0;
}

function calculateCulturalScore(preferredCaste, profileCaste) {
  return preferredCaste.includes(profileCaste) ? 100 : 0;
}

function calculateLifestyleScore(preferredMaritalStatus, profileMaritalStatus) {
  return preferredMaritalStatus.includes(profileMaritalStatus) ? 100 : 0;
}

// Get match reasons
function getMatchReasons(preference, profile) {
  const reasons = [];

  if (preference.preferredAgeRange && profile.age) {
    if (profile.age >= preference.preferredAgeRange.min && profile.age <= preference.preferredAgeRange.max) {
      reasons.push('Age matches your preference');
    }
  }

  if (preference.preferredEducation && profile.HighestQualification) {
    if (preference.preferredEducation.includes(profile.HighestQualification)) {
      reasons.push('Education matches your preference');
    }
  }

  if (preference.preferredCities && profile.currentAddress?.city) {
    if (preference.preferredCities.includes(profile.currentAddress.city)) {
      reasons.push('Location matches your preference');
    }
  }

  if (preference.preferredOccupation && profile.occupation) {
    if (preference.preferredOccupation.includes(profile.occupation)) {
      reasons.push('Occupation matches your preference');
    }
  }

  if (preference.preferredCaste && profile.subCaste) {
    if (preference.preferredCaste.includes(profile.subCaste)) {
      reasons.push('Cultural background matches your preference');
    }
  }

  return reasons;
}

// Find users who would be interested in a new profile
const findInterestedUsers = async (newProfile) => {
  try {
    // console.log('findInterestedUsers: Finding users interested in new profile', { 
    //   profileId: newProfile._id,
    //   profileData: {
    //     age: newProfile.age,
    //     gender: newProfile.gender,
    //     lookingFor: newProfile.lookingFor,
    //     subCaste: newProfile.subCaste,
    //     occupation: newProfile.occupation,
    //     HighestQualification: newProfile.HighestQualification,
    //     currentAddress: newProfile.currentAddress
    //   }
    // });

    const allPreferences = await UserPreference.find({ enableMatchNotifications: true });
    //console.log('findInterestedUsers: Found preferences with notifications enabled', { count: allPreferences.length });
    
    const interestedUsers = [];

    for (const preference of allPreferences) {
      // Skip if this is the same user's preference
      if (preference.userId.toString() === newProfile.userId.toString()) {
        //console.log('findInterestedUsers: Skipping same user preference', { userId: preference.userId });
        continue;
      }

      const matchScore = calculateMatchScore(preference, newProfile);
      // console.log('findInterestedUsers: Calculated match score', { 
      //   userId: preference.userId, 
      //   matchScore, 
      //   threshold: preference.matchThreshold,
      //   meetsThreshold: matchScore >= preference.matchThreshold,
      //   profileData: {
      //     age: newProfile.age,
      //     gender: newProfile.gender,
      //     lookingFor: newProfile.lookingFor,
      //     subCaste: newProfile.subCaste,
      //     occupation: newProfile.occupation,
      //     HighestQualification: newProfile.HighestQualification,
      //     currentAddress: newProfile.currentAddress
      //   },
      //   preference: {
      //     preferredAgeRange: preference.preferredAgeRange,
      //     preferredEducation: preference.preferredEducation,
      //     preferredOccupation: preference.preferredOccupation,
      //     preferredCities: preference.preferredCities,
      //     preferredCaste: preference.preferredCaste
      //   }
      // });
      
      if (matchScore >= preference.matchThreshold) {
        interestedUsers.push({
          userId: preference.userId,
          matchScore,
          matchReasons: getMatchReasons(preference, newProfile)
        });
        //console.log('findInterestedUsers: User meets threshold', { userId: preference.userId, matchScore });
      } else {
        //console.log('findInterestedUsers: User below threshold', { userId: preference.userId, matchScore, threshold: preference.matchThreshold });
      }
    }

    // console.log('findInterestedUsers: Found interested users', { 
    //   total: interestedUsers.length,
    //   users: interestedUsers.map(u => ({ userId: u.userId, matchScore: u.matchScore }))
    // });

    return interestedUsers;
  } catch (error) {
    console.error('findInterestedUsers: Error occurred', error);
    return [];
  }
};

// Utility function to create default preferences for testing
const createDefaultPreferences = async (userId) => {
  try {
    const defaultPreferences = {
      userId,
      preferredAgeRange: { min: 18, max: 80 },
      preferredHeight: { min: '', max: '' },
      preferredEducation: ['High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD'],
      preferredOccupation: ['Software Engineer', 'Doctor', 'Engineer', 'Teacher', 'Business Owner'],
      preferredIncome: { min: '', max: '' },
      preferredCities: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad'],
      preferredStates: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu'],
      preferredCountries: ['India'],
      preferredCaste: ['chitpavan', 'deshastha', 'karhade', 'kokanastha', 'saraswat'],
      preferredSubCaste: ['chitpavan', 'deshastha', 'karhade', 'kokanastha', 'saraswat'],
      preferredGotra: [],
      preferredMotherTongue: ['marathi', 'hindi', 'gujarati', 'konkani'],
      preferredMaritalStatus: ['never_married', 'divorced', 'widowed'],
      preferredFoodHabit: ['vegetarian', 'non_vegetarian', 'eggetarian'],
      preferredFamilyType: [],
      preferredQualification: [],
      preferredWorkLocation: [],
      preferredCompanyType: [],
      enableMatchNotifications: true,
      notificationFrequency: 'immediate',
      criteriaWeights: {
        age: 20,
        education: 15,
        occupation: 15,
        location: 20,
        cultural: 20,
        lifestyle: 10
      },
      matchThreshold: 50 // Lower threshold for testing
    };

    const existingPreference = await UserPreference.findOne({ userId });
    if (existingPreference) {
      //console.log('createDefaultPreferences: User already has preferences');
      return existingPreference;
    }

    const preference = new UserPreference(defaultPreferences);
    await preference.save();
    //console.log('createDefaultPreferences: Default preferences created for user', { userId });
    return preference;
  } catch (error) {
    console.error('createDefaultPreferences: Error creating default preferences', error);
    throw error;
  }
};

module.exports = {
  createOrUpdatePreferences,
  getUserPreferences,
  updatePreferences,
  deletePreferences,
  getAllPreferences,
  getPreferencesByUserId,
  resetPreferences,
  validatePreferenceData,
  findMatches,
  findInterestedUsers,
  createDefaultPreferences
}; 