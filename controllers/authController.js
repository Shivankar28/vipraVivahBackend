const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const ApiResponse = require('../utils/apiResponse');
const Profile = require('../models/Profile');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../utils/tokenUtils');

// Nodemailer setup
//console.log('Nodemailer: Initializing transporter');
//console.log('Nodemailer: EMAIL_USER=', process.env.EMAIL_USER);
//console.log('Nodemailer: EMAIL_PASS=', process.env.EMAIL_PASS ? '[REDACTED]' : 'undefined');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Signup Controller
const signup = async (req, res) => {
  //console.log('Signup: Request received', req.body);
  try {
    const { email, password } = req.body;

    // Validate input
    //console.log('Signup: Validating input');
    if (!email || !password) {
      //console.log('Signup: Missing email or password');
      return res.status(400).json(new ApiResponse(400, 'Email and password are required'));
    }

    // Check if user exists
    //console.log('Signup: Checking if user exists');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      //console.log('Signup: User already exists', { email });
      return res.status(400).json(new ApiResponse(400, 'User already exists'));
    }

    // Hash password
    //console.log('Signup: Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    //console.log('Signup: Generating OTP');
    const otp = crypto.randomInt(100000, 999999).toString();

    // Create user (subscription will be created by post-save middleware)
    //console.log('Signup: Creating user');
    const user = new User({
      email,
      password: hashedPassword,
      otp,
    });
    await user.save();
    //console.log('Signup: User saved', { email });

    // Send OTP email
    //console.log('Signup: Sending OTP email');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      text: `Your OTP for email verification is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    //console.log('Signup: OTP email sent', { email });

    res.status(201).json(new ApiResponse(201, 'User created. Please verify your email with OTP'));
  } catch (error) {
    console.error('Signup: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error during signup', null, error.message));
  }
};

// OTP Verification Controller
const verifyOTP = async (req, res) => {
  //console.log('VerifyOTP: Request received', req.body);
  try {
    const { email, otp } = req.body;

    // Validate input
    //console.log('VerifyOTP: Validating input');
    if (!email || !otp) {
      //console.log('VerifyOTP: Missing email or OTP');
      return res.status(400).json(new ApiResponse(400, 'Email and OTP are required'));
    }

    // Check if user exists
    //console.log('VerifyOTP: Checking if user exists');
    const user = await User.findOne({ email });
    if (!user) {
      //console.log('VerifyOTP: User not found', { email });
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }
    if (user.isVerified) {
      //console.log('VerifyOTP: User already verified', { email });
      return res.status(400).json(new ApiResponse(400, 'User already verified'));
    }

    // Verify OTP
    //console.log('VerifyOTP: Verifying OTP');
    if (user.otp !== otp) {
      //console.log('VerifyOTP: Invalid OTP', { email, otp });
      return res.status(400).json(new ApiResponse(400, 'Invalid OTP'));
    }

    // Update user
    //console.log('VerifyOTP: Updating user verification status');
    user.isVerified = true;
    user.otp = null; // Clear OTP after verification
    await user.save();
    //console.log('VerifyOTP: User verified', { email });

    // Fetch subscription and check for expiration
    //console.log('VerifyOTP: Fetching subscription plan');
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      //console.log('VerifyOTP: Subscription not found, creating new', { userId: user._id });
      subscription = new Subscription({
        userId: user._id,
        plan: 'free',
        status: 'active',
        subscriptionStart: new Date(),
      });
      await subscription.save();
      user.subscription = subscription._id;
      await user.save();
    }
    if (subscription.plan === 'premium' && subscription.subscriptionEnd < new Date()) {
      //console.log('VerifyOTP: Premium subscription expired, reverting to free', { userId: user._id });
      subscription.plan = 'free';
      subscription.status = 'inactive';
      subscription.subscriptionEnd = null;
      await subscription.save();
    }
    const plan = subscription.plan;

    // Generate access and refresh tokens
    //console.log('VerifyOTP: Generating tokens');
    const accessToken = generateAccessToken({ 
      id: user._id, 
      email: user.email, 
      isProfileFlag: user.isProfileFlag, 
      plan,
      role: user.role 
    });
    const refreshToken = generateRefreshToken({ 
      id: user._id, 
      email: user.email 
    });

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json(new ApiResponse(200, 'Email verified successfully', { token: accessToken }));
  } catch (error) {
    console.error('VerifyOTP: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error during OTP verification', null, error.message));
  }
};

// Login Controller
const login = async (req, res) => {
  //console.log('Login: Request received', req.body);
  try {
    const { email, password } = req.body;

    // Validate input
    //console.log('Login: Validating input');
    if (!email || !password) {
      //console.log('Login: Missing email or password');
      return res.status(400).json(new ApiResponse(400, 'Email and password are required', null, 'Missing required fields'));
    }

    // Check if user exists
    //console.log('Login: Checking if user exists');
    const user = await User.findOne({ email });
    if (!user) {
      //console.log('Login: User not found', { email });
      return res.status(404).json(new ApiResponse(404, 'User not found', null, 'User does not exist'));
    }

    // Check if user is verified
    //console.log('Login: Checking verification status');
    if (!user.isVerified) {
      //console.log('Login: User not verified', { email });
      return res.status(400).json(new ApiResponse(400, 'Please verify your email first', null, 'Email not verified'));
    }

    // Verify password
    //console.log('Login: Verifying password');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      //console.log('Login: Invalid credentials', { email });
      return res.status(400).json(new ApiResponse(400, 'Invalid credentials', null, 'Incorrect password'));
    }

    // Fetch subscription and check for expiration
    //console.log('Login: Fetching subscription plan');
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      //console.log('Login: Subscription not found, creating new', { userId: user._id });
      subscription = new Subscription({
        userId: user._id,
        plan: 'free',
        status: 'active',
        subscriptionStart: new Date(),
      });
      await subscription.save();
      user.subscription = subscription._id;
      await user.save();
    }
    if (subscription.plan === 'premium' && subscription.subscriptionEnd < new Date()) {
      //console.log('Login: Premium subscription expired, reverting to free', { userId: user._id });
      subscription.plan = 'free';
      subscription.status = 'inactive';
      subscription.subscriptionEnd = null;
      await subscription.save();
    }
    const plan = subscription.plan;

    // Generate access and refresh tokens
    //console.log('Login: Generating tokens');
    const accessToken = generateAccessToken({ 
      id: user._id, 
      email: user.email, 
      isProfileFlag: user.isProfileFlag, 
      plan,
      role: user.role 
    });
    const refreshToken = generateRefreshToken({ 
      id: user._id, 
      email: user.email 
    });

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json(new ApiResponse(200, 'Login successful', { token: accessToken }, null));
  } catch (error) {
    console.error('Login: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error during login', null, error.message));
  }
};

// Profile Controller
const getProfile = async (req, res) => {
  console.log('GetProfile (AUTH): Request received', { userId: req.user.id });
  try {
    // Fetch user info (excluding sensitive fields)
    const user = await User.findById(req.user.id).select('-password -otp');
    console.log('GetProfile (AUTH): User fetched', { userId: user._id, email: user.email });
    
    // Fetch profile info
    const profile = await Profile.findOne({ userId: req.user.id });
    console.log('GetProfile (AUTH): Profile query result', { hasProfile: !!profile });
    
    if (!profile) {
      console.log('GetProfile (AUTH): No profile found for user', { userId: req.user.id });
      return res.status(404).json(new ApiResponse(404, 'Profile not found', { user }));
    }
    
    console.log('GetProfile (AUTH): Raw profile from DB:', JSON.stringify(profile, null, 2));
    
    // Transform profile data to match frontend expectations
    const transformedProfile = {
      _id: profile._id,
      userId: profile.userId,
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
    
    console.log('GetProfile (AUTH): Transformed profile being sent:', JSON.stringify(transformedProfile, null, 2));
    console.log('GetProfile (AUTH): Key transformed fields:', {
      HighestQualification: transformedProfile.HighestQualification,
      universityCollege: transformedProfile.universityCollege,
      instaUrl: transformedProfile.instaUrl,
      facebookUrl: transformedProfile.facebookUrl,
      linkedinUrl: transformedProfile.linkedinUrl,
      idCardName: transformedProfile.idCardName,
      idCardNo: transformedProfile.idCardNo
    });
    
    res.status(200).json(new ApiResponse(200, 'Profile retrieved', { user, profile: transformedProfile }));
  } catch (error) {
    console.error('GetProfile: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error retrieving profile', null, error.message));
  }
};

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  //console.log('AuthenticateToken: Checking token');
  const authHeader = req.headers['authorization'];
  //console.log('authHeader', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  //console.log('token', token);

  if (!token) {
    //console.log('AuthenticateToken: Token missing');
    return res.status(401).json(new ApiResponse(401, 'Access token missing'));
  }

  //console.log('AuthenticateToken: Verifying token');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      //console.log('AuthenticateToken: Invalid token', err);
      return res.status(403).json(new ApiResponse(403, 'Invalid token', null, err.message));
    }
    req.user = user;
    //console.log('AuthenticateToken: Token verified', { user });
    next();
  });
};

// Middleware to restrict access to premium users
const restrictToPremium = async (req, res, next) => {
  //console.log('RestrictToPremium: Checking subscription status', { userId: req.user.id });
  try {
    // First, check JWT plan for quick validation
    if (req.user.plan !== 'premium') {
      //console.log('RestrictToPremium: JWT indicates non-premium plan', { userId: req.user.id, plan: req.user.plan });
      return res.status(403).json(new ApiResponse(403, 'Premium subscription required to access this feature'));
    }

    // Verify with database to prevent token tampering
    const subscription = await Subscription.findOne({ userId: req.user.id });
    if (!subscription) {
      //console.log('RestrictToPremium: Subscription not found', { userId: req.user.id });
      return res.status(403).json(new ApiResponse(403, 'No subscription found. Please subscribe to access this feature.'));
    }

    if (subscription.plan !== 'premium' || subscription.status !== 'active') {
      // console.log('RestrictToPremium: User does not have an active premium subscription', {
      //   userId: req.user.id,
      //   plan: subscription.plan,
      //   status: subscription.status,
      // });
      return res.status(403).json(new ApiResponse(403, 'Premium subscription required to access this feature'));
    }

    if (subscription.plan === 'premium' && subscription.subscriptionEnd < new Date()) {
      //console.log('RestrictToPremium: Premium subscription expired', { userId: req.user.id });
      subscription.plan = 'free';
      subscription.status = 'inactive';
      subscription.subscriptionEnd = null;
      await subscription.save();
      return res.status(403).json(new ApiResponse(403, 'Premium subscription has expired. Please renew to access this feature.'));
    }

    //console.log('RestrictToPremium: Access granted', { userId: req.user.id });
    next();
  } catch (error) {
    console.error('RestrictToPremium: Error occurred', error);
    return res.status(500).json(new ApiResponse(500, 'Error checking subscription status', null, error.message));
  }
};

// Forgot Password Controller
const forgotPassword = async (req, res) => {
  //console.log('ForgotPassword: Request received', req.body);
  try {
    const { email } = req.body;

    // Validate input
    //console.log('ForgotPassword: Validating input');
    if (!email) {
      //console.log('ForgotPassword: Missing email');
      return res.status(400).json(new ApiResponse(400, 'Email is required'));
    }

    // Check if user exists
    //console.log('ForgotPassword: Checking if user exists');
    const user = await User.findOne({ email });
    if (!user) {
      //console.log('ForgotPassword: User not found', { email });
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }
    if (!user.isVerified) {
      //console.log('ForgotPassword: User not verified', { email });
      return res.status(400).json(new ApiResponse(400, 'Please verify your email first'));
    }

    // Generate OTP
    //console.log('ForgotPassword: Generating OTP');
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    await user.save();
    //console.log('ForgotPassword: OTP saved', { email, otp });

    // Send OTP email
    //console.log('ForgotPassword: Sending OTP email');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    //console.log('ForgotPassword: OTP email sent', { email });

    res.status(200).json(new ApiResponse(200, 'Password reset OTP sent to your email'));
  } catch (error) {
    console.error('ForgotPassword: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error during forgot password', null, error.message));
  }
};

// Reset Password Controller
const resetPassword = async (req, res) => {
  //console.log('ResetPassword: Request received', req.body);
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    //console.log('ResetPassword: Validating input');
    if (!email || !otp || !newPassword) {
      //console.log('ResetPassword: Missing email, OTP, or new password');
      return res.status(400).json(new ApiResponse(400, 'Email, OTP, and new password are required'));
    }

    // Check if user exists
    //console.log('ResetPassword: Checking if user exists');
    const user = await User.findOne({ email });
    if (!user) {
      //console.log('ResetPassword: User not found', { email });
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }
    if (!user.isVerified) {
      //console.log('ResetPassword: User not verified', { email });
      return res.status(400).json(new ApiResponse(400, 'User not verified'));
    }

    // Verify OTP
    //console.log('ResetPassword: Verifying OTP');
    if (user.otp !== otp) {
      //console.log('ResetPassword: Invalid OTP', { email, otp });
      return res.status(400).json(new ApiResponse(400, 'Invalid OTP'));
    }

    // Hash new password
    //console.log('ResetPassword: Hashing new password');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null; // Clear OTP after reset
    await user.save();
    //console.log('ResetPassword: Password reset successful', { email });

    res.status(200).json(new ApiResponse(200, 'Password reset successfully'));
  } catch (error) {
    console.error('ResetPassword: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error during password reset', null, error.message));
  }
};

// Resend OTP Controller
const resendOTP = async (req, res) => {
  //console.log('ResendOTP: Request received', req.body);
  try {
    const { email } = req.body;

    // Validate input
    //console.log('ResendOTP: Validating input');
    if (!email) {
      //console.log('ResendOTP: Missing email');
      return res.status(400).json(new ApiResponse(400, 'Email is required'));
    }

    // Check if user exists
    //console.log('ResendOTP: Checking if user exists');
    const user = await User.findOne({ email });
    if (!user) {
      //console.log('ResendOTP: User not found', { email });
      return res.status(404).json(new ApiResponse(404, 'User not found'));
    }

    // Generate new OTP
    //console.log('ResendOTP: Generating new OTP');
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    await user.save();
    //console.log('ResendOTP: OTP saved', { email, otp });

    // Send OTP email
    //console.log('ResendOTP: Sending OTP email');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: user.isVerified ? 'Password Reset OTP' : 'Verify Your Email',
      text: `Your OTP is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    //console.log('ResendOTP: OTP email sent', { email });

    res.status(200).json(new ApiResponse(200, `OTP resent to your email for ${user.isVerified ? 'password reset' : 'email verification'}`));
  } catch (error) {
    console.error('ResendOTP: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error during OTP resend', null, error.message));
  }
};

// Refresh Token Controller
const refreshToken = async (req, res) => {
  //console.log('RefreshToken: Request received');
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      //console.log('RefreshToken: No refresh token provided');
      return res.status(401).json(new ApiResponse(401, 'Refresh token not found'));
    }

    // Verify refresh token
    //console.log('RefreshToken: Verifying refresh token');
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      //console.log('RefreshToken: Invalid refresh token', error);
      return res.status(403).json(new ApiResponse(403, 'Invalid or expired refresh token'));
    }

    // Find user and verify refresh token matches
    //console.log('RefreshToken: Finding user');
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      //console.log('RefreshToken: User not found or token mismatch');
      return res.status(403).json(new ApiResponse(403, 'Invalid refresh token'));
    }

    // Fetch subscription and check for expiration
    //console.log('RefreshToken: Fetching subscription plan');
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      subscription = new Subscription({
        userId: user._id,
        plan: 'free',
        status: 'active',
        subscriptionStart: new Date(),
      });
      await subscription.save();
      user.subscription = subscription._id;
      await user.save();
    }
    if (subscription.plan === 'premium' && subscription.subscriptionEnd < new Date()) {
      subscription.plan = 'free';
      subscription.status = 'inactive';
      subscription.subscriptionEnd = null;
      await subscription.save();
    }
    const plan = subscription.plan;

    // Generate new access token
    //console.log('RefreshToken: Generating new access token');
    const newAccessToken = generateAccessToken({ 
      id: user._id, 
      email: user.email, 
      isProfileFlag: user.isProfileFlag, 
      plan,
      role: user.role 
    });

    // Generate new refresh token (token rotation)
    //console.log('RefreshToken: Generating new refresh token (rotation)');
    const newRefreshToken = generateRefreshToken({ 
      id: user._id, 
      email: user.email 
    });

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    //console.log('RefreshToken: Tokens refreshed successfully');
    res.status(200).json(new ApiResponse(200, 'Token refreshed successfully', { token: newAccessToken }));
  } catch (error) {
    console.error('RefreshToken: Error occurred', error);
    res.status(500).json(new ApiResponse(500, 'Error refreshing token', null, error.message));
  }
};

// Logout Controller
const logout = async (req, res) => {
  //console.log('Logout: Request received');
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Find user and clear refresh token
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id);
      
      if (user) {
        user.refreshToken = null;
        await user.save();
        //console.log('Logout: Refresh token cleared from database');
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    //console.log('Logout: Logout successful');
    res.status(200).json(new ApiResponse(200, 'Logout successful'));
  } catch (error) {
    console.error('Logout: Error occurred', error);
    // Even if there's an error, clear the cookie
    res.clearCookie('refreshToken');
    res.status(200).json(new ApiResponse(200, 'Logout successful'));
  }
};

module.exports = {
  signup,
  verifyOTP,
  login,
  getProfile,
  authenticateToken,
  restrictToPremium,
  forgotPassword,
  resetPassword,
  resendOTP,
  refreshToken,
  logout,
};