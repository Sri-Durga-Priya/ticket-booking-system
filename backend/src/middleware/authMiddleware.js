import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import User from '../models/User.js';

/**
 * Protect routes: Requires valid Bearer JWT token
 */
export const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in to access this resource.', 401));
  }

  try {
    const secret = process.env.JWT_SECRET || 'ticketnow_jwt_secret_dev_key_change_in_production_987654321';
    const decoded = jwt.verify(token, secret);

    const currentUser = await User.findById(decoded.id).select('-passwordHash');
    if (!currentUser) {
      return next(new AppError('The user belonging to this session no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication session. Please log in again.', 401));
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles - Allowed roles e.g. 'admin', 'organiser'
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User session not authenticated.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Access denied: Role '${req.user.role}' is not authorized to access this resource.`, 403)
      );
    }

    next();
  };
};

/**
 * Optional authentication: attaches user if token present, but does not block if not
 */
export const optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'ticketnow_jwt_secret_dev_key_change_in_production_987654321';
      const decoded = jwt.verify(token, secret);
      const currentUser = await User.findById(decoded.id).select('-passwordHash');
      if (currentUser) {
        req.user = currentUser;
      }
    } catch (e) {
      // Ignore token decode errors for optional auth
    }
  }
  next();
};
