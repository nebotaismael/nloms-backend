const { query, transaction } = require('../config/database');
const logger = require('../config/winston');

class Application {
  constructor(applicationData) {
    this.application_id = applicationData.application_id;
    this.user_id = applicationData.user_id;
    this.land_parcel_id = applicationData.land_parcel_id;
    this.application_type = applicationData.application_type;
    this.status = applicationData.status;
    this.submitted_documents = applicationData.submitted_documents;
    this.application_fee = applicationData.application_fee;
    this.payment_status = applicationData.payment_status;
    this.notes = applicationData.notes;
    this.reviewed_by = applicationData.reviewed_by;
    this.reviewed_at = applicationData.reviewed_at;
    this.created_at = applicationData.created_at;
    this.updated_at = applicationData.updated_at;
  }

  static async create(applicationData) {
    try {
      const {
        user_id,
        land_parcel_id,
        application_type,
        submitted_documents,
        application_fee,
        notes
      } = applicationData;

      const result = await transaction(async (client) => {
        // Create application
        const appResult = await client.query(
          `INSERT INTO land_registrations 
           (user_id, land_parcel_id, application_type, submitted_documents, application_fee, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [user_id, land_parcel_id, application_type, submitted_documents, application_fee, notes]
        );

        // Log the application creation
        await client.query(
          `INSERT INTO audit_logs (user_id, action, details)
           VALUES ($1, $2, $3)`,
          [user_id, 'APPLICATION_CREATED', `Application ${appResult.rows[0].application_id} created`]
        );

        return appResult.rows[0];
      });

      logger.info('Application created successfully', { 
        applicationId: result.application_id 
      });
      return new Application(result);
    } catch (error) {
      logger.error('Error creating application:', error);
      throw error;
    }
  }

  static async findById(applicationId) {
    try {
      const result = await query(
        `SELECT lr.*, u.name as applicant_name, u.email as applicant_email,
                lp.parcel_number, lp.location, lp.area
         FROM land_registrations lr
         JOIN users u ON lr.user_id = u.user_id
         JOIN land_parcels lp ON lr.land_parcel_id = lp.land_parcel_id
         WHERE lr.application_id = $1`,
        [applicationId]
      );
      
      return result.rows[0] ? new Application(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding application by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    try {
      let queryText = `
        SELECT lr.*, lp.parcel_number, lp.location, lp.area
        FROM land_registrations lr
        JOIN land_parcels lp ON lr.land_parcel_id = lp.land_parcel_id
        WHERE lr.user_id = $1
      `;
      const queryParams = [userId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        queryText += ` AND lr.status = $${paramCount}`;
        queryParams.push(filters.status);
      }

      if (filters.application_type) {
        paramCount++;
        queryText += ` AND lr.application_type = $${paramCount}`;
        queryParams.push(filters.application_type);
      }

      queryText += ' ORDER BY lr.created_at DESC';

      if (filters.limit) {
        paramCount++;
        queryText += ` LIMIT $${paramCount}`;
        queryParams.push(filters.limit);
      }

      const result = await query(queryText, queryParams);
      return result.rows.map(row => new Application(row));
    } catch (error) {
      logger.error('Error finding applications by user ID:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let queryText = `
        SELECT lr.*, u.name as applicant_name, u.email as applicant_email,
               lp.parcel_number, lp.location, lp.area,
               reviewer.name as reviewer_name
        FROM land_registrations lr
        JOIN users u ON lr.user_id = u.user_id
        JOIN land_parcels lp ON lr.land_parcel_id = lp.land_parcel_id
        LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.user_id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        queryText += ` AND lr.status = $${paramCount}`;
        queryParams.push(filters.status);
      }

      if (filters.application_type) {
        paramCount++;
        queryText += ` AND lr.application_type = $${paramCount}`;
        queryParams.push(filters.application_type);
      }

      if (filters.payment_status) {
        paramCount++;
        queryText += ` AND lr.payment_status = $${paramCount}`;
        queryParams.push(filters.payment_status);
      }

      queryText += ' ORDER BY lr.created_at DESC';

      if (filters.limit) {
        paramCount++;
        queryText += ` LIMIT $${paramCount}`;
        queryParams.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        queryText += ` OFFSET $${paramCount}`;
        queryParams.push(filters.offset);
      }

      const result = await query(queryText, queryParams);
      return result.rows.map(row => new Application(row));
    } catch (error) {
      logger.error('Error finding applications:', error);
      throw error;
    }
  }

  async updateStatus(newStatus, reviewerId, notes = null) {
    try {
      const result = await transaction(async (client) => {
        // Update application status
        const updateResult = await client.query(
          `UPDATE land_registrations 
           SET status = $1, reviewed_by = $2, reviewed_at = $3, notes = COALESCE($4, notes), updated_at = $5
           WHERE application_id = $6
           RETURNING *`,
          [newStatus, reviewerId, new Date(), notes, new Date(), this.application_id]
        );

        // Log the status change
        await client.query(
          `INSERT INTO audit_logs (user_id, action, details)
           VALUES ($1, $2, $3)`,
          [reviewerId, 'APPLICATION_STATUS_CHANGED', 
           `Application ${this.application_id} status changed to ${newStatus}`]
        );

        // If approved, update land parcel status
        if (newStatus === 'approved') {
          await client.query(
            `UPDATE land_parcels 
             SET status = 'registered', updated_at = $1
             WHERE land_parcel_id = $2`,
            [new Date(), this.land_parcel_id]
          );
        }

        return updateResult.rows[0];
      });

      Object.assign(this, result);
      logger.info('Application status updated successfully', { 
        applicationId: this.application_id,
        newStatus: newStatus
      });

      return this;
    } catch (error) {
      logger.error('Error updating application status:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_applications,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_applications,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as payment_pending,
          AVG(application_fee) as average_fee,
          SUM(application_fee) as total_fees
        FROM land_registrations
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting application stats:', error);
      throw error;
    }
  }
}

module.exports = Application;