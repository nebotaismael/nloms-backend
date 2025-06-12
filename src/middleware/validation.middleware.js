const { body, param, query } = require('express-validator');

// User validation rules
exports.validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .isIn(['citizen', 'official', 'chief'])
    .withMessage('Role must be one of: citizen, official, chief'),
  
  body('phone_number')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
];

exports.validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Land parcel validation rules
exports.validateLandParcel = [
  body('parcel_number')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Parcel number must be between 3 and 50 characters')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Parcel number can only contain uppercase letters, numbers, and hyphens'),
  
  body('location')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Location must be between 5 and 500 characters'),
  
  body('area')
    .isFloat({ min: 0.01 })
    .withMessage('Area must be a positive number greater than 0.01'),
  
  body('land_type')
    .isIn(['residential', 'commercial', 'agricultural', 'industrial'])
    .withMessage('Land type must be one of: residential, commercial, agricultural, industrial'),
  
  body('coordinates')
    .optional()
    .matches(/^-?\d+\.?\d*,-?\d+\.?\d*$/)
    .withMessage('Coordinates must be in format "latitude,longitude"'),
  
  body('boundaries')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Boundaries description must not exceed 1000 characters'),
  
  body('market_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Market value must be a positive number')
];

// Application validation rules
exports.validateApplication = [
  body('land_parcel_id')
    .isInt({ min: 1 })
    .withMessage('Valid land parcel ID is required'),
  
  body('application_type')
    .isIn(['registration', 'transfer', 'subdivision'])
    .withMessage('Application type must be one of: registration, transfer, subdivision'),
  
  body('notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters')
];

// Parameter validation
exports.validateUserId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required')
];

exports.validateLandParcelId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid land parcel ID is required')
];

exports.validateApplicationId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid application ID is required')
];

// Query validation
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

exports.validateUserStatus = [
  body('status')
    .isIn(['pending', 'verified', 'suspended'])
    .withMessage('Status must be one of: pending, verified, suspended')
];

exports.validateApplicationReview = [
  body('status')
    .isIn(['approved', 'rejected', 'under_review'])
    .withMessage('Status must be one of: approved, rejected, under_review'),
  
  body('notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters')
];