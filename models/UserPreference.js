const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Basic Preferences
  preferredAgeRange: {
    min: { type: Number, min: 18, max: 80 },
    max: { type: Number, min: 18, max: 80 }
  },
  preferredHeight: {
    min: { type: String },
    max: { type: String }
  },
  preferredEducation: [{ type: String }],
  preferredOccupation: [{ type: String }],
  preferredIncome: {
    min: { type: String },
    max: { type: String }
  },
  
  // Location Preferences
  preferredCities: [{ type: String }],
  preferredStates: [{ type: String }],
  preferredCountries: [{ type: String }],
  
  // Cultural Preferences
  preferredCaste: [{ type: String }],
  preferredSubCaste: [{ type: String }],
  preferredGotra: [{ type: String }],
  preferredMotherTongue: [{ type: String }],
  
  // Lifestyle Preferences
  preferredMaritalStatus: [{ type: String }],
  preferredFoodHabit: [{ type: String }],
  preferredFamilyType: [{ type: String }], // Nuclear, Joint, etc.
  
  // Additional Preferences
  preferredQualification: [{ type: String }],
  preferredWorkLocation: [{ type: String }],
  preferredCompanyType: [{ type: String }], // Private, Government, etc.
  
  // Notification Preferences
  enableMatchNotifications: {
    type: Boolean,
    default: true
  },
  notificationFrequency: {
    type: String,
    enum: ['immediate', 'daily', 'weekly'],
    default: 'immediate'
  },
  
  // Match Criteria Weight
  criteriaWeights: {
    age: { type: Number, default: 20, min: 0, max: 100 },
    education: { type: Number, default: 15, min: 0, max: 100 },
    occupation: { type: Number, default: 15, min: 0, max: 100 },
    location: { type: Number, default: 20, min: 0, max: 100 },
    cultural: { type: Number, default: 20, min: 0, max: 100 },
    lifestyle: { type: Number, default: 10, min: 0, max: 100 }
  },
  
  // Match Settings
  matchThreshold: {
    type: Number,
    default: 70, // Minimum match percentage
    min: 0,
    max: 100
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
userPreferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find matching profiles
userPreferenceSchema.statics.findMatchingProfiles = async function(userId, newProfile) {
  try {
    const userPreference = await this.findOne({ userId });
    if (!userPreference) return [];

    const matches = [];
    const allProfiles = await mongoose.model('Profile').find({ 
      userId: { $ne: userId } // Exclude own profile
    }).populate('userId');

    for (const profile of allProfiles) {
      const matchScore = calculateMatchScore(userPreference, profile);
      if (matchScore >= userPreference.matchThreshold) {
        matches.push({
          profile,
          matchScore,
          matchReasons: getMatchReasons(userPreference, profile)
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Error finding matching profiles:', error);
    return [];
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

  return reasons;
}

module.exports = mongoose.model('UserPreference', userPreferenceSchema); 