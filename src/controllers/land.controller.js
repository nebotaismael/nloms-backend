const { validationResult } = require('express-validator');
const LandParcel = require('../models/LandParcel');
const Application = require('../models/Application');
const logger = require('../config/winston');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * /land/parcels:
 *   post:
 *     tags: [Land Management]
 *     summary: Create a new land parcel (Official/Chief only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parcel_number
 *               - location
 *               - area
 *               - land_type
 *             properties:
 *               parcel_number:
 *                 type: string
 *                 description: Unique parcel identifier
 *               location:
 *                 type: string
 *                 description: Physical location/address
 *               area:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Area in hectares
 *               land_type:
 *                 type: string
 *                 enum: [residential, commercial, agricultural, industrial]
 *               coordinates:
 *                 type: string
 *                 description: GPS coordinates (lat,lng format)
 *               boundaries:
 *                 type: string
 *                 description: Boundary description
 *               market_value:
 *                 type: number
 *                 minimum: 0
 *                 description: Market value in local currency
 *     responses:
 *       201:
 *         description: Land parcel created successfully
 *       400:
 *         description: Validation error or parcel already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
exports.createLandParcel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      parcel_number,
      location,
      area,
      land_type,
      coordinates,
      boundaries,
      market_value
    } = req.body;

    // Check if parcel number already exists
    const existingParcel = await LandParcel.findByParcelNumber(parcel_number);
    if (existingParcel) {
      return res.status(400).json({
        success: false,
        message: 'Land parcel with this number already exists'
      });
    }

    // Create land parcel
    const landParcel = await LandParcel.create({
      parcel_number,
      location,
      area: parseFloat(area),
      land_type,
      coordinates,
      boundaries,
      market_value: market_value ? parseFloat(market_value) : null
    });

    // Log the creation
    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)`,
      [req.user.userId, 'LAND_PARCEL_CREATED', `Land parcel ${parcel_number} created`]
    );

    logger.info('Land parcel created successfully', {
      parcelId: landParcel.land_parcel_id,
      parcelNumber: parcel_number,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Land parcel created successfully',
      data: {
        landParcel
      }
    });

  } catch (error) {
    logger.error('Create land parcel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create land parcel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /land/parcels:
 *   get:
 *     tags: [Land Management]
 *     summary: Search land parcels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parcel_number
 *         schema:
 *           type: string
 *         description: Search by parcel number
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Search by location
 *       - in: query
 *         name: land_type
 *         schema:
 *           type: string
 *           enum: [residential, commercial, agricultural, industrial]
 *         description: Filter by land type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, registered, disputed]
 *         description: Filter by status
 *       - in: query
 *         name: owner_name
 *         schema:
 *           type: string
 *         description: Search by owner name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of parcels per page
 *     responses:
 *       200:
 *         description: Land parcels retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.searchLandParcels = async (req, res) => {
  try {
    const {
      parcel_number,
      location,
      land_type,
      status,
      owner_name,
      page = 1,
      limit = 20
    } = req.query;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build search parameters
    const searchParams = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (parcel_number) searchParams.parcel_number = parcel_number;
    if (location) searchParams.location = location;
    if (land_type) searchParams.land_type = land_type;
    if (status) searchParams.status = status;
    if (owner_name) searchParams.owner_name = owner_name;

    // Search land parcels
    const parcels = await LandParcel.search(searchParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT lp.land_parcel_id)
      FROM land_parcels lp
      LEFT JOIN land_registrations lr ON lp.land_parcel_id = lr.land_parcel_id 
        AND lr.status = 'approved'
      LEFT JOIN users u ON lr.user_id = u.user_id
      WHERE 1=1
    `;
    const countParams = [];
    let paramCount = 0;

    if (parcel_number) {
      paramCount++;
      countQuery += ` AND lp.parcel_number ILIKE $${paramCount}`;
      countParams.push(`%${parcel_number}%`);
    }

    if (location) {
      paramCount++;
      countQuery += ` AND lp.location ILIKE $${paramCount}`;
      countParams.push(`%${location}%`);
    }

    if (land_type) {
      paramCount++;
      countQuery += ` AND lp.land_type = $${paramCount}`;
      countParams.push(land_type);
    }

    if (status) {
      paramCount++;
      countQuery += ` AND lp.status = $${paramCount}`;
      countParams.push(status);
    }

    if (owner_name) {
      paramCount++;
      countQuery += ` AND u.name ILIKE $${paramCount}`;
      countParams.push(`%${owner_name}%`);
    }

    const countResult = await query(countQuery, countParams);
    const totalParcels = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalParcels / limit);

    logger.info('Land parcels searched successfully', {
      requestedBy: req.user.userId,
      searchParams,
      resultsCount: parcels.length
    });

    res.json({
      success: true,
      message: 'Land parcels retrieved successfully',
      data: {
        parcels,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalParcels,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Search land parcels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search land parcels',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /land/parcels/{id}:
 *   get:
 *     tags: [Land Management]
 *     summary: Get land parcel by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Land parcel ID
 *     responses:
 *       200:
 *         description: Land parcel retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Land parcel not found
 *       500:
 *         description: Server error
 */
exports.getLandParcelById = async (req, res) => {
  try {
    const { id } = req.params;

    const parcel = await LandParcel.findById(id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Land parcel not found'
      });
    }

    // Get ownership information if exists
    const ownershipResult = await query(
      `SELECT u.name as owner_name, u.email as owner_email, lr.created_at as registration_date
       FROM land_registrations lr
       JOIN users u ON lr.user_id = u.user_id
       WHERE lr.land_parcel_id = $1 AND lr.status = 'approved'
       ORDER BY lr.created_at DESC LIMIT 1`,
      [id]
    );

    const ownership = ownershipResult.rows[0] || null;

    logger.info('Land parcel retrieved successfully', {
      parcelId: id,
      requestedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Land parcel retrieved successfully',
      data: {
        parcel,
        ownership
      }
    });

  } catch (error) {
    logger.error('Get land parcel by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve land parcel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /land/applications:
 *   post:
 *     tags: [Land Applications]
 *     summary: Submit a land registration application
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - land_parcel_id
 *               - application_type
 *             properties:
 *               land_parcel_id:
 *                 type: integer
 *                 description: ID of the land parcel
 *               application_type:
 *                 type: string
 *                 enum: [registration, transfer, subdivision]
 *                 description: Type of application
 *               notes:
 *                 type: string
 *                 description: Additional notes or comments
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Validation error or invalid application
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Land parcel not found
 *       500:
 *         description: Server error
 */
exports.submitApplication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { land_parcel_id, application_type, notes } = req.body;
    const userId = req.user.userId;

    // Check if land parcel exists
    const landParcel = await LandParcel.findById(land_parcel_id);
    if (!landParcel) {
      return res.status(404).json({
        success: false,
        message: 'Land parcel not found'
      });
    }

    // Check if user already has a pending application for this parcel
    const existingApplication = await query(
      `SELECT application_id FROM land_registrations 
       WHERE user_id = $1 AND land_parcel_id = $2 AND status = 'pending'`,
      [userId, land_parcel_id]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application for this land parcel'
      });
    }

    // Calculate application fee based on land type and area
    const baseFee = 50000; // Base fee in local currency
    const areaMultiplier = parseFloat(landParcel.area) * 1000;
    const typeMultiplier = {
      residential: 1.0,
      commercial: 2.0,
      agricultural: 0.5,
      industrial: 1.5
    };
    
    const applicationFee = baseFee + (areaMultiplier * (typeMultiplier[landParcel.land_type] || 1.0));

    // Create application
    const application = await Application.create({
      user_id: userId,
      land_parcel_id: parseInt(land_parcel_id),
      application_type,
      submitted_documents: [],
      application_fee: applicationFee,
      notes
    });

    logger.info('Land registration application submitted', {
      applicationId: application.application_id,
      userId,
      landParcelId: land_parcel_id,
      applicationType: application_type
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application
      }
    });

  } catch (error) {
    logger.error('Submit application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /land/applications:
 *   get:
 *     tags: [Land Applications]
 *     summary: Get applications (user's own or all for officials)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, under_review]
 *         description: Filter by application status
 *       - in: query
 *         name: application_type
 *         schema:
 *           type: string
 *           enum: [registration, transfer, subdivision]
 *         description: Filter by application type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of applications per page
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.getApplications = async (req, res) => {
  try {
    const { status, application_type, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Build filters
    const filters = {
      limit: parseInt(limit),
      offset: (page - 1) * limit
    };

    if (status) filters.status = status;
    if (application_type) filters.application_type = application_type;

    let applications;

    // If user is citizen, get only their applications
    if (userRole === 'citizen') {
      applications = await Application.findByUserId(userId, filters);
    } else {
      // Officials can see all applications
      applications = await Application.findAll(filters);
    }

    // Get total count for pagination
    let countQuery, countParams;
    
    if (userRole === 'citizen') {
      countQuery = 'SELECT COUNT(*) FROM land_registrations WHERE user_id = $1';
      countParams = [userId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        countQuery += ` AND status = $${paramCount}`;
        countParams.push(status);
      }

      if (application_type) {
        paramCount++;
        countQuery += ` AND application_type = $${paramCount}`;
        countParams.push(application_type);
      }
    } else {
      countQuery = 'SELECT COUNT(*) FROM land_registrations WHERE 1=1';
      countParams = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        countQuery += ` AND status = $${paramCount}`;
        countParams.push(status);
      }

      if (application_type) {
        paramCount++;
        countQuery += ` AND application_type = $${paramCount}`;
        countParams.push(application_type);
      }
    }

    const countResult = await query(countQuery, countParams);
    const totalApplications = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalApplications / limit);

    logger.info('Applications retrieved successfully', {
      requestedBy: userId,
      userRole,
      count: applications.length,
      filters
    });

    res.json({
      success: true,
      message: 'Applications retrieved successfully',
      data: {
        applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalApplications,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /land/applications/{id}:
 *   get:
 *     tags: [Land Applications]
 *     summary: Get application by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user can access this application
    if (userRole === 'citizen' && application.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own applications.'
      });
    }

    logger.info('Application retrieved successfully', {
      applicationId: id,
      requestedBy: userId
    });

    res.json({
      success: true,
      message: 'Application retrieved successfully',
      data: {
        application
      }
    });

  } catch (error) {
    logger.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /land/stats:
 *   get:
 *     tags: [Land Management]
 *     summary: Get land management statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.getLandStats = async (req, res) => {
  try {
    const [parcelStats, applicationStats] = await Promise.all([
      LandParcel.getStats(),
      Application.getStats()
    ]);

    logger.info('Land statistics retrieved', {
      requestedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Land statistics retrieved successfully',
      data: {
        parcels: parcelStats,
        applications: applicationStats
      }
    });

  } catch (error) {
    logger.error('Get land stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve land statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};