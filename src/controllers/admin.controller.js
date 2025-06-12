const { validationResult } = require('express-validator');
const User = require('../models/User');
const LandParcel = require('../models/LandParcel');
const Application = require('../models/Application');
const logger = require('../config/winston');
const { query, transaction } = require('../config/database');

/**
 * @swagger
 * /admin/applications/{id}/review:
 *   put:
 *     tags: [Admin]
 *     summary: Review and approve/reject application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, under_review]
 *               notes:
 *                 type: string
 *                 description: Review notes
 *     responses:
 *       200:
 *         description: Application reviewed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */
exports.reviewApplication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const reviewerId = req.user.userId;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if application can be reviewed
    if (application.status === 'approved' || application.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Application has already been processed'
      });
    }

    // Update application status with transaction for ACID compliance
    const updatedApplication = await transaction(async (client) => {
      // Update application
      const result = await application.updateStatus(status, reviewerId, notes);

      // If approved, create certificate
      if (status === 'approved') {
        const certificateNumber = `CERT-${Date.now()}-${application.land_parcel_id}`;
        await client.query(
          `INSERT INTO certificates (certificate_number, land_parcel_id, application_id, issued_by, issued_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [certificateNumber, application.land_parcel_id, application.application_id, reviewerId, new Date()]
        );

        // Update land parcel ownership
        await client.query(
          `UPDATE land_parcels SET status = 'registered', updated_at = $1 WHERE land_parcel_id = $2`,
          [new Date(), application.land_parcel_id]
        );
      }

      return result;
    });

    logger.info('Application reviewed successfully', {
      applicationId: id,
      status,
      reviewedBy: reviewerId
    });

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: {
        application: updatedApplication
      }
    });

  } catch (error) {
    logger.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
exports.getDashboard = async (req, res) => {
  try {
    const [userStats, parcelStats, applicationStats, recentActivities] = await Promise.all([
      User.getStats(),
      LandParcel.getStats(),
      Application.getStats(),
      query(`
        SELECT al.action, al.details, al.timestamp, u.name as user_name
        FROM audit_logs al
        JOIN users u ON al.user_id = u.user_id
        ORDER BY al.timestamp DESC
        LIMIT 10
      `)
    ]);

    // Get pending applications count
    const pendingApplicationsResult = await query(
      `SELECT COUNT(*) as count FROM land_registrations WHERE status = 'pending'`
    );

    // Get system health metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    logger.info('Admin dashboard accessed', {
      adminId: req.user.userId
    });

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        stats: {
          users: userStats,
          parcels: parcelStats,
          applications: applicationStats,
          pendingApplications: parseInt(pendingApplicationsResult.rows[0].count)
        },
        recentActivities: recentActivities.rows,
        systemMetrics
      }
    });

  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /admin/system/backup:
 *   post:
 *     tags: [Admin]
 *     summary: Create system backup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
exports.createBackup = async (req, res) => {
  try {
    const backupId = `backup_${Date.now()}`;
    
    // Log backup creation
    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)`,
      [req.user.userId, 'SYSTEM_BACKUP', `System backup ${backupId} initiated`]
    );

    // In production, implement actual backup logic here
    // This could involve pg_dump for PostgreSQL or cloud storage backup

    logger.info('System backup initiated', {
      backupId,
      initiatedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Backup process initiated successfully',
      data: {
        backupId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /admin/reports/activity:
 *   get:
 *     tags: [Admin]
 *     summary: Get system activity report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *       - in: query
 *         name: action_type
 *         schema:
 *           type: string
 *         description: Filter by action type
 *     responses:
 *       200:
 *         description: Activity report generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
exports.getActivityReport = async (req, res) => {
  try {
    const { start_date, end_date, action_type } = req.query;

    let queryText = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      JOIN users u ON al.user_id = u.user_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      queryText += ` AND al.timestamp >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      queryText += ` AND al.timestamp <= $${paramCount}`;
      queryParams.push(end_date);
    }

    if (action_type) {
      paramCount++;
      queryText += ` AND al.action ILIKE $${paramCount}`;
      queryParams.push(`%${action_type}%`);
    }

    queryText += ' ORDER BY al.timestamp DESC LIMIT 1000';

    const activities = await query(queryText, queryParams);

    // Generate summary statistics
    const summaryQuery = `
      SELECT 
        action,
        COUNT(*) as count,
        DATE(timestamp) as date
      FROM audit_logs
      WHERE timestamp >= COALESCE($1::date, CURRENT_DATE - INTERVAL '30 days')
        AND timestamp <= COALESCE($2::date, CURRENT_DATE)
      GROUP BY action, DATE(timestamp)
      ORDER BY date DESC, count DESC
    `;

    const summary = await query(summaryQuery, [start_date || null, end_date || null]);

    logger.info('Activity report generated', {
      requestedBy: req.user.userId,
      filters: { start_date, end_date, action_type },
      recordCount: activities.rows.length
    });

    res.json({
      success: true,
      message: 'Activity report generated successfully',
      data: {
        activities: activities.rows,
        summary: summary.rows,
        metadata: {
          total_records: activities.rows.length,
          start_date: start_date || 'N/A',
          end_date: end_date || 'N/A',
          generated_at: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Get activity report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate activity report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};