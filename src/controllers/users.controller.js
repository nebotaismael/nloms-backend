const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../config/winston');
const { query } = require('../config/database');

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin/Official only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [citizen, official, chief]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, suspended]
 *         description: Filter by registration status
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
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build filters
    const filters = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (role) filters.role = role;
    if (status) filters.status = status;

    // Get users
    const users = await User.findAll(filters);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      countQuery += ` AND role = $${paramCount}`;
      countParams.push(role);
    }

    if (status) {
      paramCount++;
      countQuery += ` AND registration_status = $${paramCount}`;
      countParams.push(status);
    }

    const countResult = await query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalUsers / limit);

    logger.info('Users retrieved successfully', {
      requestedBy: req.user.userId,
      count: users.length,
      filters
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: users.map(user => user.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalUsers,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Check if user can access this profile
    if (parseInt(id) !== requestingUserId && !['official', 'chief', 'admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('User retrieved successfully', {
      userId: id,
      requestedBy: requestingUserId
    });

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
exports.updateUser = async (req, res) => {
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
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Check if user can update this profile
    if (parseInt(id) !== requestingUserId && !['official', 'chief', 'admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own profile.'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, phone_number, address } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (address !== undefined) updateData.address = address;

    // Update user
    const updatedUser = await user.update(updateData);

    // Log the update
    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)`,
      [requestingUserId, 'USER_UPDATED', `User ${id} profile updated`]
    );

    logger.info('User updated successfully', {
      userId: id,
      updatedBy: requestingUserId,
      fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /users/{id}/status:
 *   put:
 *     tags: [Users]
 *     summary: Update user status (Admin/Official only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
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
 *                 enum: [pending, verified, suspended]
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
exports.updateUserStatus = async (req, res) => {
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
    const { status } = req.body;
    const requestingUserId = req.user.userId;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user status
    const updatedUser = await user.update({ registration_status: status });

    // Log the status change
    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)`,
      [requestingUserId, 'USER_STATUS_CHANGED', `User ${id} status changed to ${status}`]
    );

    logger.info('User status updated successfully', {
      userId: id,
      newStatus: status,
      updatedBy: requestingUserId
    });

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });

  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user statistics (Admin/Official only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
exports.getUserStats = async (req, res) => {
  try {
    const stats = await User.getStats();

    logger.info('User statistics retrieved', {
      requestedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        stats
      }
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};