/**
 * NLOMS Application Constants
 * National Land Ownership Management System
 * @author Nebota Ismael
 * @date 2025-06-12
 */

// User Roles and Permissions
const USER_ROLES = {
  CITIZEN: 'citizen',
  OFFICIAL: 'official',
  CHIEF: 'chief',
  ADMIN: 'admin'
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.CITIZEN]: [
    'profile:read',
    'profile:update',
    'application:create',
    'application:read:own',
    'certificate:read:own',
    'parcel:search',
    'document:upload:own'
  ],
  [USER_ROLES.OFFICIAL]: [
    'profile:read',
    'profile:update',
    'application:read:all',
    'application:review',
    'application:approve',
    'application:reject',
    'parcel:create',
    'parcel:read:all',
    'parcel:update',
    'certificate:issue',
    'certificate:read:all',
    'user:read:all',
    'user:update:status',
    'document:read:all',
    'audit:read'
  ],
  [USER_ROLES.CHIEF]: [
    'profile:read',
    'profile:update',
    'application:read:all',
    'application:review',
    'application:approve',
    'application:reject',
    'parcel:create',
    'parcel:read:all',
    'parcel:update',
    'parcel:delete',
    'certificate:issue',
    'certificate:read:all',
    'certificate:revoke',
    'user:read:all',
    'user:create',
    'user:update',
    'user:update:status',
    'document:read:all',
    'audit:read',
    'report:generate'
  ],
  [USER_ROLES.ADMIN]: [
    '*' // All permissions
  ]
};

// Registration Status
const REGISTRATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  SUSPENDED: 'suspended'
};

// Land Types
const LAND_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  AGRICULTURAL: 'agricultural',
  INDUSTRIAL: 'industrial'
};

// Land Parcel Status
const PARCEL_STATUS = {
  AVAILABLE: 'available',
  REGISTERED: 'registered',
  DISPUTED: 'disputed',
  UNDER_REVIEW: 'under_review'
};

// Application Types
const APPLICATION_TYPES = {
  REGISTRATION: 'registration',
  TRANSFER: 'transfer',
  SUBDIVISION: 'subdivision',
  MUTATION: 'mutation'
};

// Application Status
const APPLICATION_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Certificate Status
const CERTIFICATE_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired'
};

// Document Types
const DOCUMENT_TYPES = {
  NATIONAL_ID: 'national_id',
  BIRTH_CERTIFICATE: 'birth_certificate',
  MARRIAGE_CERTIFICATE: 'marriage_certificate',
  LAND_SURVEY: 'land_survey',
  PROOF_OF_OWNERSHIP: 'proof_of_ownership',
  TAX_CLEARANCE: 'tax_clearance',
  ENVIRONMENTAL_CLEARANCE: 'environmental_clearance',
  BUILDING_PERMIT: 'building_permit',
  COURT_AFFIDAVIT: 'court_affidavit',
  CUSTOMARY_CERTIFICATE: 'customary_certificate',
  INHERITANCE_DOCUMENT: 'inheritance_document',
  POWER_OF_ATTORNEY: 'power_of_attorney',
  BANK_STATEMENT: 'bank_statement',
  UTILITY_BILL: 'utility_bill',
  PASSPORT_PHOTO: 'passport_photo',
  OTHER: 'other'
};

// Notification Types
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  REMINDER: 'reminder'
};

// Audit Actions
const AUDIT_ACTIONS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATED: 'USER_UPDATED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  APPLICATION_CREATED: 'APPLICATION_CREATED',
  APPLICATION_UPDATED: 'APPLICATION_UPDATED',
  APPLICATION_APPROVED: 'APPLICATION_APPROVED',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  APPLICATION_CANCELLED: 'APPLICATION_CANCELLED',
  PARCEL_CREATED: 'PARCEL_CREATED',
  PARCEL_UPDATED: 'PARCEL_UPDATED',
  PARCEL_DELETED: 'PARCEL_DELETED',
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED: 'CERTIFICATE_REVOKED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  SYSTEM_RESTORE: 'SYSTEM_RESTORE',
  CONFIGURATION_CHANGED: 'CONFIGURATION_CHANGED',
  BULK_OPERATION: 'BULK_OPERATION',
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA'
};

// File Upload Configuration
const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  CLOUDINARY_FOLDERS: {
    DOCUMENTS: 'nloms-documents',
    CERTIFICATES: 'nloms-certificates',
    PROFILES: 'nloms-profiles',
    SYSTEM: 'nloms-system'
  }
};

// Validation Rules
const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL: true,
    MAX_LENGTH: 128
  },
  PARCEL_NUMBER: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[A-Z0-9-]+$/
  },
  PHONE_NUMBER: {
    CAMEROON_PATTERN: /^(\+237|237)?[2368]\d{8}$/,
    INTERNATIONAL_PATTERN: /^\+?[1-9]\d{1,14}$/
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 255
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
    PATTERN: /^[a-zA-Z\s'-]+$/
  }
};

// Rate Limiting Configuration
const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  },
  UPLOAD: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10
  },
  SEARCH: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 30
  }
};

// System Configuration
const SYSTEM_CONFIG = {
  API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_LOCALE: 'en',
  SUPPORTED_LOCALES: ['en', 'fr'],
  DEFAULT_CURRENCY: 'XAF',
  SUPPORTED_CURRENCIES: ['XAF', 'USD', 'EUR'],
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  JWT_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  CERTIFICATE_VALIDITY_YEARS: 99,
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
  BACKUP_RETENTION_DAYS: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION: 30 * 60 * 1000 // 30 minutes
};

// Application Fees (in XAF)
const APPLICATION_FEES = {
  BASE_FEE: 50000,
  LAND_TYPE_MULTIPLIERS: {
    [LAND_TYPES.RESIDENTIAL]: 1.0,
    [LAND_TYPES.COMMERCIAL]: 2.0,
    [LAND_TYPES.AGRICULTURAL]: 0.5,
    [LAND_TYPES.INDUSTRIAL]: 1.5
  },
  APPLICATION_TYPE_MULTIPLIERS: {
    [APPLICATION_TYPES.REGISTRATION]: 1.0,
    [APPLICATION_TYPES.TRANSFER]: 1.2,
    [APPLICATION_TYPES.SUBDIVISION]: 1.5,
    [APPLICATION_TYPES.MUTATION]: 0.8
  },
  AREA_RATE_PER_HECTARE: 1000,
  PRIORITY_MULTIPLIERS: {
    1: 1.0, // Normal
    2: 1.5, // High
    3: 2.0, // Urgent
    4: 3.0, // Emergency
    5: 5.0  // Critical
  }
};

// Processing Times (in days)
const PROCESSING_TIMES = {
  [APPLICATION_TYPES.REGISTRATION]: {
    ESTIMATED: 30,
    PRIORITY_REDUCTION: {
      1: 0,   // Normal: 30 days
      2: 10,  // High: 20 days
      3: 20,  // Urgent: 10 days
      4: 25,  // Emergency: 5 days
      5: 28   // Critical: 2 days
    }
  },
  [APPLICATION_TYPES.TRANSFER]: {
    ESTIMATED: 21,
    PRIORITY_REDUCTION: {
      1: 0, 2: 7, 3: 14, 4: 18, 5: 20
    }
  },
  [APPLICATION_TYPES.SUBDIVISION]: {
    ESTIMATED: 45,
    PRIORITY_REDUCTION: {
      1: 0, 2: 15, 3: 25, 4: 35, 5: 40
    }
  },
  [APPLICATION_TYPES.MUTATION]: {
    ESTIMATED: 14,
    PRIORITY_REDUCTION: {
      1: 0, 2: 5, 3: 9, 4: 12, 5: 13
    }
  }
};

// Error Messages
const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account is temporarily locked due to multiple failed login attempts',
  ACCOUNT_SUSPENDED: 'Account has been suspended. Please contact administrator',
  TOKEN_EXPIRED: 'Token has expired. Please login again',
  TOKEN_INVALID: 'Invalid token provided',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied. Insufficient permissions',

  // Validation
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PHONE: 'Please provide a valid phone number',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_DATE: 'Please provide a valid date',
  INVALID_FILE_TYPE: 'File type is not allowed',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',

  // Business Logic
  DUPLICATE_EMAIL: 'Email address is already registered',
  DUPLICATE_PARCEL: 'Land parcel number already exists',
  PARCEL_NOT_AVAILABLE: 'Land parcel is not available for registration',
  APPLICATION_EXISTS: 'You already have a pending application for this parcel',
  PAYMENT_REQUIRED: 'Payment is required to process this application',
  DOCUMENT_REQUIRED: 'Required documents are missing',
  CERTIFICATE_REVOKED: 'Certificate has been revoked',

  // System
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_SERVICE_ERROR: 'External service is temporarily unavailable',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  MAINTENANCE_MODE: 'System is currently under maintenance',
  RESOURCE_NOT_FOUND: 'Requested resource was not found',
  OPERATION_FAILED: 'Operation could not be completed'
};

// Success Messages
const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'Account created successfully',
  LOGIN_SUCCESSFUL: 'Login successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  APPLICATION_SUBMITTED: 'Application submitted successfully',
  APPLICATION_APPROVED: 'Application has been approved',
  CERTIFICATE_ISSUED: 'Certificate has been issued successfully',
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  PAYMENT_COMPLETED: 'Payment completed successfully',
  EMAIL_SENT: 'Email sent successfully',
  OPERATION_COMPLETED: 'Operation completed successfully'
};

// Cameroon Administrative Divisions
const CAMEROON_REGIONS = {
  ADAMAWA: 'Adamawa',
  CENTRE: 'Centre',
  EAST: 'East',
  FAR_NORTH: 'Far North',
  LITTORAL: 'Littoral',
  NORTH: 'North',
  NORTHWEST: 'Northwest',
  SOUTH: 'South',
  SOUTHWEST: 'Southwest',
  WEST: 'West'
};

// Common Regular Expressions
const REGEX_PATTERNS = {
  PARCEL_NUMBER: /^[A-Z]{2,4}-\d{4}-\d{3,6}$/,
  CERTIFICATE_NUMBER: /^CERT-\d{13}-\d+$/,
  VERIFICATION_CODE: /^[A-Z0-9]{8,16}$/,
  PHONE_CAMEROON: /^(\+237|237)?[2368]\d{8}$/,
  NATIONAL_ID_CAMEROON: /^[0-9]{8,12}$/,
  COORDINATES: /^-?\d+\.?\d*,-?\d+\.?\d*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

// Export all constants
module.exports = {
  USER_ROLES,
  ROLE_PERMISSIONS,
  REGISTRATION_STATUS,
  LAND_TYPES,
  PARCEL_STATUS,
  APPLICATION_TYPES,
  APPLICATION_STATUS,
  PAYMENT_STATUS,
  CERTIFICATE_STATUS,
  DOCUMENT_TYPES,
  NOTIFICATION_TYPES,
  AUDIT_ACTIONS,
  FILE_UPLOAD,
  VALIDATION_RULES,
  RATE_LIMITS,
  SYSTEM_CONFIG,
  APPLICATION_FEES,
  PROCESSING_TIMES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CAMEROON_REGIONS,
  REGEX_PATTERNS
};