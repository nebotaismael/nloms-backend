const logger = require('../config/winston');

/**
 * Comprehensive validation utilities for NLOMS
 */
class ValidationUtils {

  /**
   * Validate Cameroon phone number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} Validation result
   */
  static isValidCameroonPhone(phoneNumber) {
    if (!phoneNumber) return false;
    
    // Cameroon phone number patterns
    const patterns = [
      /^(\+237|237)?[2368]\d{8}$/, // Standard format
      /^(\+237|237)?\s?[2368]\d{8}$/, // With optional space
      /^(\+237|237)?[-\s]?[2368]\d{8}$/ // With optional dash or space
    ];
    
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    return patterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Validate Cameroon National ID
   * @param {string} nationalId - National ID to validate
   * @returns {boolean} Validation result
   */
  static isValidCameroonNationalId(nationalId) {
    if (!nationalId) return false;
    
    // Cameroon national ID format: 8-12 digits
    const pattern = /^[0-9]{8,12}$/;
    return pattern.test(nationalId.replace(/\s/g, ''));
  }

  /**
   * Validate land parcel number format
   * @param {string} parcelNumber - Parcel number to validate
   * @returns {boolean} Validation result
   */
  static isValidParcelNumber(parcelNumber) {
    if (!parcelNumber) return false;
    
    // Format: LP-YYYY-NNNN or similar patterns
    const patterns = [
      /^LP-\d{4}-\d{3,6}$/, // LP-2025-001
      /^[A-Z]{2,4}-\d{4}-\d{3,6}$/, // General pattern
      /^[A-Z0-9]{5,20}$/ // Alphanumeric format
    ];
    
    return patterns.some(pattern => pattern.test(parcelNumber.toUpperCase()));
  }

  /**
   * Validate GPS coordinates
   * @param {number} latitude - Latitude value
   * @param {number} longitude - Longitude value
   * @returns {boolean} Validation result
   */
  static isValidCoordinates(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return false;
    }
    
    // Cameroon approximate bounds
    const cameroonBounds = {
      latMin: 1.7, latMax: 13.1,
      lngMin: 8.3, lngMax: 16.2
    };
    
    return (
      latitude >= cameroonBounds.latMin && latitude <= cameroonBounds.latMax &&
      longitude >= cameroonBounds.lngMin && longitude <= cameroonBounds.lngMax
    );
  }

  /**
   * Validate email with additional checks
   * @param {string} email - Email address to validate
   * @returns {object} Validation result with details
   */
  static validateEmail(email) {
    if (!email) {
      return { isValid: false, reason: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, reason: 'Invalid email format' };
    }

    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return { isValid: false, reason: 'Disposable email addresses are not allowed' };
    }

    return { isValid: true };
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} Validation result with strength score
   */
  static validatePasswordStrength(password) {
    if (!password) {
      return { isValid: false, score: 0, reason: 'Password is required' };
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommon: !this.isCommonPassword(password)
    };

    Object.values(checks).forEach(check => {
      if (check) score += 1;
    });

    const isValid = score >= 5; // Require at least 5 out of 6 checks
    let strength = 'weak';
    if (score >= 5) strength = 'strong';
    else if (score >= 4) strength = 'medium';

    return {
      isValid,
      score,
      strength,
      checks,
      reason: isValid ? null : 'Password does not meet security requirements'
    };
  }

  /**
   * Check if password is commonly used
   * @param {string} password - Password to check
   * @returns {boolean} True if password is common
   */
  static isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'sunshine', 'iloveyou', 'trustno1'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Validate file upload
   * @param {object} file - File object from multer
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  static validateFileUpload(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
      allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'],
      minSize = 1024 // 1KB
    } = options;

    const errors = [];

    if (!file) {
      return { isValid: false, errors: ['No file provided'] };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    if (file.size < minSize) {
      errors.push(`File size is too small (minimum ${minSize} bytes)`);
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type '${file.mimetype}' is not allowed`);
    }

    // Check file extension
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension '.${fileExtension}' is not allowed`);
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.originalname)) {
      errors.push('File name contains suspicious content');
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        extension: fileExtension
      }
    };
  }

  /**
   * Check if filename is suspicious
   * @param {string} filename - Filename to check
   * @returns {boolean} True if suspicious
   */
  static isSuspiciousFileName(filename) {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i, // Executable files
      /^\./,  // Hidden files
      /[<>:"|?*]/, // Invalid filename characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i // Reserved names
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Validate monetary amount for Cameroon
   * @param {number} amount - Amount to validate
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  static validateAmount(amount, options = {}) {
    const {
      min = 0,
      max = 999999999, // ~1 billion XAF
      currency = 'XAF',
      allowZero = false
    } = options;

    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, reason: 'Amount must be a valid number' };
    }

    if (!allowZero && amount === 0) {
      return { isValid: false, reason: 'Amount cannot be zero' };
    }

    if (amount < min) {
      return { isValid: false, reason: `Amount cannot be less than ${min} ${currency}` };
    }

    if (amount > max) {
      return { isValid: false, reason: `Amount cannot be greater than ${max} ${currency}` };
    }

    // Check for reasonable decimal places (max 2 for currency)
    if (currency === 'XAF' && !Number.isInteger(amount)) {
      return { isValid: false, reason: 'XAF amounts cannot have decimal places' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize input string
   * @param {string} input - Input to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} Sanitized string
   */
  static sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') return '';

    const {
      trim = true,
      removeHtml = true,
      removeSpecialChars = false,
      maxLength = null
    } = options;

    let sanitized = input;

    // Trim whitespace
    if (trim) {
      sanitized = sanitized.trim();
    }

    // Remove HTML tags
    if (removeHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove special characters (keep only alphanumeric, spaces, common punctuation)
    if (removeSpecialChars) {
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.,!?@]/g, '');
    }

    // Limit length
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  static validateDateRange(startDate, endDate, options = {}) {
    const {
      allowSameDate = true,
      maxRangeDays = null,
      minDate = null,
      maxDate = null
    } = options;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      return { isValid: false, reason: 'Invalid start date' };
    }

    if (isNaN(end.getTime())) {
      return { isValid: false, reason: 'Invalid end date' };
    }

    if (start > end) {
      return { isValid: false, reason: 'Start date cannot be after end date' };
    }

    if (!allowSameDate && start.getTime() === end.getTime()) {
      return { isValid: false, reason: 'Start and end dates cannot be the same' };
    }

    if (minDate && start < new Date(minDate)) {
      return { isValid: false, reason: 'Start date is before minimum allowed date' };
    }

    if (maxDate && end > new Date(maxDate)) {
      return { isValid: false, reason: 'End date is after maximum allowed date' };
    }

    if (maxRangeDays) {
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays > maxRangeDays) {
        return { isValid: false, reason: `Date range cannot exceed ${maxRangeDays} days` };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate bulk operation limits
   * @param {Array} items - Items for bulk operation
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  static validateBulkOperation(items, options = {}) {
    const {
      maxItems = 100,
      minItems = 1,
      requireUniqueIds = true
    } = options;

    if (!Array.isArray(items)) {
      return { isValid: false, reason: 'Items must be an array' };
    }

    if (items.length < minItems) {
      return { isValid: false, reason: `Minimum ${minItems} items required` };
    }

    if (items.length > maxItems) {
      return { isValid: false, reason: `Maximum ${maxItems} items allowed` };
    }

    if (requireUniqueIds) {
      const ids = items.map(item => item.id).filter(id => id !== undefined);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        return { isValid: false, reason: 'Duplicate IDs found in bulk operation' };
      }
    }

    return { isValid: true };
  }
}

module.exports = ValidationUtils;