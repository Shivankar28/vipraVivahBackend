const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String }
});

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profilePicture: { type: String },
  profileFor: { type: String, required: true },
  gender: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  fatherName: { type: String },
  motherName: { type: String },
  isLivesWithFamily: { type: String, enum: ['Yes', 'No', null], default: null },
  dateOfBirth: { type: Date, required: true },
  age: { type: Number },
  lookingFor: { type: String, required: true },
  height: { type: String },
  Aged: { type: Number },
  subCaste: { type: String },
  gotra: { type: String, required: true },
  motherTongue: { type: String, required: true },
  maritalStatus: { type: String, required: true },
  foodHabit: { type: String },
  currentAddress: { type: addressSchema, default: {} },
  permanentAddress: { type: addressSchema, default: {} },
  isCurrentPermanentSame: { type: Boolean, default: false },
  HighestQualification: { type: String },
  specialization: { type: String },
  universityCollege: { type: String },
  yearOfCompletion: { type: String },
  currentWorking: { type: String, enum: ['Yes', 'No', null], default: null },
  occupation: { type: String },
  company: { type: String },
  workLocation: { type: String },
  annualIncome: { type: String },
  instaUrl: { type: String },
  facebookUrl: { type: String },
  linkedinUrl: { type: String },
  idCardName: { type: String },
  idCardNo: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

profileSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Profile', profileSchema);