import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @desc    Register a new user (Customer or Organiser)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password) {
    return next(new AppError('Please provide name, email, phone number, and password.', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long.', 400));
  }

  // Prevent arbitrary admin creation via open registration
  const userRole = role === 'organiser' ? 'organiser' : 'customer';

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    return next(new AppError('An account with this email address already exists.', 409));
  }

  // Hash password & create user
  const passwordHash = await User.hashPassword(password);
  const newUser = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    passwordHash,
    role: userRole,
    isVerified: true, // Default verified for smooth demo experience
  });

  const token = generateToken(newUser);

  res.status(201).json({
    success: true,
    message: `Account created successfully as ${newUser.role}`,
    data: {
      user: {
        id: newUser._id,
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
      token,
    },
  });
});

/**
 * @desc    Log in with email and password
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return next(new AppError('Invalid email or password.', 401));
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password.', 401));
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
    },
  });
});

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * @desc    Get demo account credentials for easy testing
 * @route   GET /api/auth/demo-accounts
 * @access  Public
 */
export const getDemoAccounts = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      accounts: [
        { role: 'customer', email: 'customer@ticketnow.local', password: 'password123', label: 'Demo Customer (Alice)' },
        { role: 'organiser', email: 'organiser@ticketnow.local', password: 'password123', label: 'Demo Organiser (LiveNation/Cineworld)' },
        { role: 'admin', email: 'admin@ticketnow.local', password: 'password123', label: 'Platform Administrator' },
      ],
    },
  });
});
