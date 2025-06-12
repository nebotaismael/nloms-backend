const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/winston');

/**
 * Verify JWT token and authenticate user
 */
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user still exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        });
      }

      // Check if user is active
      if (user.registration_status === 'suspended') {
        return res.status(401).json({
          success: false,
          message: 'Account suspended. Please contact administrator.'
        });
      }

      // Add user info to request
      req.user = {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token attempt', {
        error: jwtError.message,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Authorization middleware - check user roles
 * @param {Array} allowedRoles - Array of allowed roles
 */
exports.authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length === 0) {
      return next(); // No role restriction
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.registration_status !== 'suspended') {
        req.user = {
          userId: user.user_id,
          email: user.email,
          role: user.role,
          name: user.name
        };
      }
    } catch (jwtError) {
      // Token invalid but continue without auth
      logger.debug('Invalid token in optional auth', { error: jwtError.message });
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if error occurs
  }
};