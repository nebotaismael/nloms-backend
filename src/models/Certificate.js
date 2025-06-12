const { query, transaction } = require('../config/database');
const logger = require('../config/winston');

class Certificate {
  constructor(certificateData) {
    this.certificate_id = certificateData.certificate_id;
    this.certificate_number = certificateData.certificate_number;
    this.land_parcel_id = certificateData.land_parcel_id;
    this.application_id = certificateData.application_id;
    this.issued_by = certificateData.issued_by;
    this.issued_date = certificateData.issued_date;
    this.status = certificateData.status;
    this.certificate_hash = certificateData.certificate_hash;
    this.qr_code_url = certificateData.qr_code_url;
    this.created_at = certificateData.created_at;
    this.updated_at = certificateData.updated_at;
  }

  static async create(certificateData) {
    try {
      const {
        certificate_number,
        land_parcel_id,
        application_id,
        issued_by,
        certificate_hash,
        qr_code_url
      } = certificateData;

      const result = await query(
        `INSERT INTO certificates 
         (certificate_number, land_parcel_id, application_id, issued_by, certificate_hash, qr_code_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [certificate_number, land_parcel_id, application_id, issued_by, certificate_hash, qr_code_url]
      );

      logger.info('Certificate created successfully', {
        certificateId: result.rows[0].certificate_id,
        certificateNumber: certificate_number
      });

      return new Certificate(result.rows[0]);
    } catch (error) {
      logger.error('Error creating certificate:', error);
      throw error;
    }
  }

  static async findById(certificateId) {
    try {
      const result = await query(
        `SELECT c.*, lp.parcel_number, lp.location, lp.area, lp.land_type,
                u.name as owner_name, u.email as owner_email,
                issuer.name as issuer_name
         FROM certificates c
         JOIN land_parcels lp ON c.land_parcel_id = lp.land_parcel_id
         JOIN land_registrations lr ON c.application_id = lr.application_id
         JOIN users u ON lr.user_id = u.user_id
         JOIN users issuer ON c.issued_by = issuer.user_id
         WHERE c.certificate_id = $1`,
        [certificateId]
      );

      return result.rows[0] ? new Certificate(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding certificate by ID:', error);
      throw error;
    }
  }

  static async findByCertificateNumber(certificateNumber) {
    try {
      const result = await query(
        `SELECT c.*, lp.parcel_number, lp.location, lp.area, lp.land_type,
                u.name as owner_name, u.email as owner_email,
                issuer.name as issuer_name
         FROM certificates c
         JOIN land_parcels lp ON c.land_parcel_id = lp.land_parcel_id
         JOIN land_registrations lr ON c.application_id = lr.application_id
         JOIN users u ON lr.user_id = u.user_id
         JOIN users issuer ON c.issued_by = issuer.user_id
         WHERE c.certificate_number = $1`,
        [certificateNumber]
      );

      return result.rows[0] ? new Certificate(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding certificate by number:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const result = await query(
        `SELECT c.*, lp.parcel_number, lp.location, lp.area, lp.land_type,
                issuer.name as issuer_name
         FROM certificates c
         JOIN land_parcels lp ON c.land_parcel_id = lp.land_parcel_id
         JOIN land_registrations lr ON c.application_id = lr.application_id
         JOIN users issuer ON c.issued_by = issuer.user_id
         WHERE lr.user_id = $1 AND c.status = 'active'
         ORDER BY c.issued_date DESC`,
        [userId]
      );

      return result.rows.map(row => new Certificate(row));
    } catch (error) {
      logger.error('Error finding certificates by user ID:', error);
      throw error;
    }
  }

  async revoke(revokedBy, reason) {
    try {
      const result = await transaction(async (client) => {
        // Update certificate status
        const updateResult = await client.query(
          `UPDATE certificates 
           SET status = 'revoked', updated_at = $1
           WHERE certificate_id = $2
           RETURNING *`,
          [new Date(), this.certificate_id]
        );

        // Log the revocation
        await client.query(
          `INSERT INTO audit_logs (user_id, action, details)
           VALUES ($1, $2, $3)`,
          [revokedBy, 'CERTIFICATE_REVOKED', 
           `Certificate ${this.certificate_number} revoked. Reason: ${reason}`]
        );

        return updateResult.rows[0];
      });

      Object.assign(this, result);
      logger.info('Certificate revoked successfully', {
        certificateId: this.certificate_id,
        revokedBy,
        reason
      });

      return this;
    } catch (error) {
      logger.error('Error revoking certificate:', error);
      throw error;
    }
  }

  static async verify(certificateNumber, certificateHash) {
    try {
      const result = await query(
        `SELECT certificate_id, certificate_number, status, certificate_hash
         FROM certificates
         WHERE certificate_number = $1`,
        [certificateNumber]
      );

      if (result.rows.length === 0) {
        return { valid: false, reason: 'Certificate not found' };
      }

      const certificate = result.rows[0];

      if (certificate.status !== 'active') {
        return { valid: false, reason: 'Certificate is not active' };
      }

      if (certificate.certificate_hash !== certificateHash) {
        return { valid: false, reason: 'Certificate hash does not match' };
      }

      return { valid: true, certificate: new Certificate(certificate) };
    } catch (error) {
      logger.error('Error verifying certificate:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_certificates,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_certificates,
          COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_certificates,
          COUNT(CASE WHEN issued_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as certificates_last_30_days,
          COUNT(CASE WHEN issued_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as certificates_last_7_days
        FROM certificates
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting certificate stats:', error);
      throw error;
    }
  }
}

module.exports = Certificate;