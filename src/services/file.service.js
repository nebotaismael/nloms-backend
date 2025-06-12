const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/winston');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class FileService {
  
  /**
   * Configure multer storage for different file types
   */
  static getMulterConfig(options = {}) {
    const {
      folder = 'nloms-documents',
      allowedFormats = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      maxFileSize = 10 * 1024 * 1024, // 10MB
      maxFiles = 5
    } = options;

    // Cloudinary storage configuration
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: folder,
        allowed_formats: allowedFormats,
        resource_type: 'auto',
        public_id: (req, file) => {
          const timestamp = Date.now();
          const originalName = path.parse(file.originalname).name;
          return `${timestamp}_${originalName}`;
        }
      }
    });

    return multer({
      storage: storage,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles
      },
      fileFilter: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
        
        if (allowedFormats.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error(`File type .${fileExtension} is not allowed. Allowed types: ${allowedFormats.join(', ')}`));
        }
      }
    });
  }

  /**
   * Upload single file to Cloudinary
   * @param {Object} file - File object from multer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  static async uploadFile(file, options = {}) {
    try {
      const {
        folder = 'nloms-documents',
        transformation = null,
        tags = []
      } = options;

      const uploadOptions = {
        folder: folder,
        resource_type: 'auto',
        tags: ['nloms', ...tags]
      };

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      const result = await cloudinary.uploader.upload(file.path, uploadOptions);
      
      logger.info('File uploaded successfully', {
        publicId: result.public_id,
        originalName: file.originalname,
        size: result.bytes
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        original_filename: file.originalname,
        size: result.bytes,
        format: result.format,
        resource_type: result.resource_type,
        created_at: result.created_at
      };

    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of file objects
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of upload results
   */
  static async uploadMultipleFiles(files, options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, options));
      const results = await Promise.all(uploadPromises);
      
      logger.info('Multiple files uploaded successfully', {
        count: files.length
      });

      return results;
    } catch (error) {
      logger.error('Multiple file upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Public ID of the file to delete
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      logger.info('File deleted successfully', {
        publicId,
        result: result.result
      });

      return result;
    } catch (error) {
      logger.error('File deletion error:', error);
      throw error;
    }
  }

  /**
   * Generate signed URL for secure file access
   * @param {string} publicId - Public ID of the file
   * @param {Object} options - URL generation options
   * @returns {string} Signed URL
   */
  static generateSignedUrl(publicId, options = {}) {
    try {
      const {
        expiration = Math.floor(Date.now() / 1000) + 3600, // 1 hour
        transformation = null
      } = options;

      const urlOptions = {
        sign_url: true,
        expires_at: expiration
      };

      if (transformation) {
        urlOptions.transformation = transformation;
      }

      const signedUrl = cloudinary.utils.private_download_link_url(publicId, 'auto', urlOptions);
      
      return signedUrl;
    } catch (error) {
      logger.error('Signed URL generation error:', error);
      throw error;
    }
  }

  /**
   * Get file information
   * @param {string} publicId - Public ID of the file
   * @returns {Promise<Object>} File information
   */
  static async getFileInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      
      return {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        created_at: result.created_at,
        resource_type: result.resource_type
      };
    } catch (error) {
      logger.error('Get file info error:', error);
      throw error;
    }
  }

  /**
   * Create file thumbnail (for images)
   * @param {string} publicId - Public ID of the image
   * @param {Object} options - Thumbnail options
   * @returns {string} Thumbnail URL
   */
  static createThumbnail(publicId, options = {}) {
    try {
      const {
        width = 200,
        height = 200,
        crop = 'fill',
        quality = 'auto'
      } = options;

      const thumbnailUrl = cloudinary.url(publicId, {
        transformation: [
          { width, height, crop, quality }
        ]
      });

      return thumbnailUrl;
    } catch (error) {
      logger.error('Thumbnail creation error:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object
   * @param {Object} constraints - Validation constraints
   * @returns {Object} Validation result
   */
  static validateFile(file, constraints = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
      allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf']
    } = constraints;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension .${fileExtension} is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean up temporary files
   * @param {Array} filePaths - Array of file paths to clean up
   */
  static async cleanupTempFiles(filePaths) {
    try {
      const deletePromises = filePaths.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
          logger.debug('Temporary file deleted', { filePath });
        } catch (error) {
          logger.warn('Failed to delete temporary file', { filePath, error: error.message });
        }
      });

      await Promise.all(deletePromises);
    } catch (error) {
      logger.error('Cleanup temp files error:', error);
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  static async getStorageStats() {
    try {
      const result = await cloudinary.api.usage();
      
      return {
        used_storage: result.storage.used,
        max_storage: result.storage.limit,
        used_percentage: (result.storage.used / result.storage.limit) * 100,
        total_resources: result.resources,
        transformations: result.transformations.used,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Get storage stats error:', error);
      throw error;
    }
  }
}

module.exports = FileService;