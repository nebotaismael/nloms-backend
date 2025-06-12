const express = require('express');
const router = express.Router();
const landController = require('../controllers/land.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  validateLandParcel,
  validateApplication,
  validateLandParcelId,
  validateApplicationId,
  validatePagination
} = require('../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     LandParcel:
 *       type: object
 *       required:
 *         - parcel_number
 *         - location
 *         - area
 *         - land_type
 *       properties:
 *         land_parcel_id:
 *           type: integer
 *           description: The auto-generated ID of the land parcel
 *         parcel_number:
 *           type: string
 *           description: Unique parcel identifier
 *         location:
 *           type: string
 *           description: Physical location/address
 *         area:
 *           type: number
 *           description: Area in hectares
 *         land_type:
 *           type: string
 *           enum: [residential, commercial, agricultural, industrial]
 *         coordinates:
 *           type: string
 *           description: GPS coordinates
 *         boundaries:
 *           type: string
 *           description: Boundary description
 *         status:
 *           type: string
 *           enum: [available, registered, disputed]
 *         market_value:
 *           type: number
 *           description: Market value in local currency
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     Application:
 *       type: object
 *       required:
 *         - user_id
 *         - land_parcel_id
 *         - application_type
 *       properties:
 *         application_id:
 *           type: integer
 *           description: The auto-generated ID of the application
 *         user_id:
 *           type: integer
 *           description: ID of the user submitting the application
 *         land_parcel_id:
 *           type: integer
 *           description: ID of the land parcel
 *         application_type:
 *           type: string
 *           enum: [registration, transfer, subdivision]
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, under_review]
 *         submitted_documents:
 *           type: array
 *           items:
 *             type: string
 *           description: List of submitted document URLs
 *         application_fee:
 *           type: number
 *           description: Application fee amount
 *         payment_status:
 *           type: string
 *           enum: [pending, paid, failed]
 *         notes:
 *           type: string
 *           description: Additional notes
 *         reviewed_by:
 *           type: integer
 *           description: ID of the reviewing official
 *         reviewed_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Land Management
 *   description: Land parcel management endpoints
 *   name: Land Applications
 *   description: Land registration application endpoints
 */

// Land Parcel Routes

/**
 * @swagger
 * /land/parcels:
 *   post:
 *     summary: Create a new land parcel (Official/Chief only)
 *     tags: [Land Management]
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
 *                 example: "LP-2025-001"
 *               location:
 *                 type: string
 *                 example: "Block 5, Bonanjo, Douala"
 *               area:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 2.5
 *               land_type:
 *                 type: string
 *                 enum: [residential, commercial, agricultural, industrial]
 *                 example: "residential"
 *               coordinates:
 *                 type: string
 *                 example: "4.0511,-9.7679"
 *               boundaries:
 *                 type: string
 *                 example: "North: Main Road, South: River, East: Plot 006, West: Plot 004"
 *               market_value:
 *                 type: number
 *                 minimum: 0
 *                 example: 50000000
 *     responses:
 *       201:
 *         description: Land parcel created successfully
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
 *                     landParcel:
 *                       $ref: '#/components/schemas/LandParcel'
 *       400:
 *         description: Validation error or parcel already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/parcels', authenticate, authorize(['official', 'chief', 'admin']), validateLandParcel, landController.createLandParcel);

/**
 * @swagger
 * /land/parcels:
 *   get:
 *     summary: Search land parcels
 *     tags: [Land Management]
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
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Land parcels retrieved successfully
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
 *                     parcels:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/LandParcel'
 *                           - type: object
 *                             properties:
 *                               owner_name:
 *                                 type: string
 *                               owner_email:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalParcels:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/parcels', authenticate, validatePagination, landController.searchLandParcels);

/**
 * @swagger
 * /land/parcels/{id}:
 *   get:
 *     summary: Get land parcel by ID
 *     tags: [Land Management]
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
 *                     parcel:
 *                       $ref: '#/components/schemas/LandParcel'
 *                     ownership:
 *                       type: object
 *                       properties:
 *                         owner_name:
 *                           type: string
 *                         owner_email:
 *                           type: string
 *                         registration_date:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Land parcel not found
 */
router.get('/parcels/:id', authenticate, validateLandParcelId, landController.getLandParcelById);

// Application Routes

/**
 * @swagger
 * /land/applications:
 *   post:
 *     summary: Submit a land registration application
 *     tags: [Land Applications]
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
 *                 example: 1
 *               application_type:
 *                 type: string
 *                 enum: [registration, transfer, subdivision]
 *                 example: "registration"
 *               notes:
 *                 type: string
 *                 example: "Initial registration for residential development"
 *     responses:
 *       201:
 *         description: Application submitted successfully
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
 *                     application:
 *                       $ref: '#/components/schemas/Application'
 *       400:
 *         description: Validation error or invalid application
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Land parcel not found
 */
router.post('/applications', authenticate, validateApplication, landController.submitApplication);

/**
 * @swagger
 * /land/applications:
 *   get:
 *     summary: Get applications (user's own or all for officials)
 *     tags: [Land Applications]
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
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
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
 *                     applications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Application'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/applications', authenticate, validatePagination, landController.getApplications);

/**
 * @swagger
 * /land/applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     tags: [Land Applications]
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
 *                     application:
 *                       $ref: '#/components/schemas/Application'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
router.get('/applications/:id', authenticate, validateApplicationId, landController.getApplicationById);

/**
 * @swagger
 * /land/stats:
 *   get:
 *     summary: Get land management statistics
 *     tags: [Land Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     parcels:
 *                       type: object
 *                       properties:
 *                         total_parcels:
 *                           type: string
 *                         available_parcels:
 *                           type: string
 *                         registered_parcels:
 *                           type: string
 *                         disputed_parcels:
 *                           type: string
 *                         total_area:
 *                           type: string
 *                         average_area:
 *                           type: string
 *                     applications:
 *                       type: object
 *                       properties:
 *                         total_applications:
 *                           type: string
 *                         pending_applications:
 *                           type: string
 *                         approved_applications:
 *                           type: string
 *                         rejected_applications:
 *                           type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, landController.getLandStats);

module.exports = router;