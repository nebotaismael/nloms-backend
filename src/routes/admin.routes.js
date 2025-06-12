const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  validateApplicationId,
  validateApplicationReview,
  validatePagination
} = require('../middleware/validation.middleware');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints for system management
 */

/**
 * @swagger
 * /admin/applications/{id}/review:
 *   put:
 *     summary: Review and approve/reject application
 *     tags: [Admin]
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
 *                 example: "approved"
 *               notes:
 *                 type: string
 *                 example: "Application meets all requirements. Certificate will be issued."
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
 */
router.put('/applications/:id/review', authenticate, authorize(['official', 'chief', 'admin']), validateApplicationId, validateApplicationReview, adminController.reviewApplication);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: object
 *                         parcels:
 *                           type: object
 *                         applications:
 *                           type: object
 *                         pendingApplications:
 *                           type: integer
 *                     recentActivities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           details:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           user_name:
 *                             type: string
 *                     systemMetrics:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                         timestamp:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', authenticate, authorize(['official', 'chief', 'admin']), adminController.getDashboard);

/**
 * @swagger
 * /admin/system/backup:
 *   post:
 *     summary: Create system backup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/system/backup', authenticate, authorize(['admin']), adminController.createBackup);

/**
 * @swagger
 * /admin/reports/activity:
 *   get:
 *     summary: Get system activity report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report (YYYY-MM-DD)
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
 */
router.get('/reports/activity', authenticate, authorize(['official', 'chief', 'admin']), adminController.getActivityReport);

module.exports = router;