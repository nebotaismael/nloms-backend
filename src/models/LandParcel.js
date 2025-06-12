const { query, transaction } = require('../config/database');
const logger = require('../config/winston');

class LandParcel {
  constructor(parcelData) {
    this.land_parcel_id = parcelData.land_parcel_id;
    this.parcel_number = parcelData.parcel_number;
    this.location = parcelData.location;
    this.area = parcelData.area;
    this.land_type = parcelData.land_type;
    this.coordinates = parcelData.coordinates;
    this.boundaries = parcelData.boundaries;
    this.status = parcelData.status;
    this.market_value = parcelData.market_value;
    this.created_at = parcelData.created_at;
    this.updated_at = parcelData.updated_at;
  }

  static async create(parcelData) {
    try {
      const {
        parcel_number,
        location,
        area,
        land_type,
        coordinates,
        boundaries,
        market_value
      } = parcelData;

      const result = await query(
        `INSERT INTO land_parcels 
         (parcel_number, location, area, land_type, coordinates, boundaries, market_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [parcel_number, location, area, land_type, coordinates, boundaries, market_value]
      );

      logger.info('Land parcel created successfully', { 
        parcelId: result.rows[0].land_parcel_id 
      });
      return new LandParcel(result.rows[0]);
    } catch (error) {
      logger.error('Error creating land parcel:', error);
      throw error;
    }
  }

  static async findById(parcelId) {
    try {
      const result = await query(
        'SELECT * FROM land_parcels WHERE land_parcel_id = $1',
        [parcelId]
      );
      
      return result.rows[0] ? new LandParcel(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding land parcel by ID:', error);
      throw error;
    }
  }

  static async findByParcelNumber(parcelNumber) {
    try {
      const result = await query(
        'SELECT * FROM land_parcels WHERE parcel_number = $1',
        [parcelNumber]
      );
      
      return result.rows[0] ? new LandParcel(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding land parcel by number:', error);
      throw error;
    }
  }

  static async search(searchParams) {
    try {
      let queryText = `
        SELECT lp.*, u.name as owner_name, u.email as owner_email
        FROM land_parcels lp
        LEFT JOIN land_registrations lr ON lp.land_parcel_id = lr.land_parcel_id 
          AND lr.status = 'approved'
        LEFT JOIN users u ON lr.user_id = u.user_id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 0;

      if (searchParams.parcel_number) {
        paramCount++;
        queryText += ` AND lp.parcel_number ILIKE $${paramCount}`;
        queryParams.push(`%${searchParams.parcel_number}%`);
      }

      if (searchParams.location) {
        paramCount++;
        queryText += ` AND lp.location ILIKE $${paramCount}`;
        queryParams.push(`%${searchParams.location}%`);
      }

      if (searchParams.land_type) {
        paramCount++;
        queryText += ` AND lp.land_type = $${paramCount}`;
        queryParams.push(searchParams.land_type);
      }

      if (searchParams.status) {
        paramCount++;
        queryText += ` AND lp.status = $${paramCount}`;
        queryParams.push(searchParams.status);
      }

      if (searchParams.owner_name) {
        paramCount++;
        queryText += ` AND u.name ILIKE $${paramCount}`;
        queryParams.push(`%${searchParams.owner_name}%`);
      }

      queryText += ' ORDER BY lp.created_at DESC';

      if (searchParams.limit) {
        paramCount++;
        queryText += ` LIMIT $${paramCount}`;
        queryParams.push(searchParams.limit);
      }

      if (searchParams.offset) {
        paramCount++;
        queryText += ` OFFSET $${paramCount}`;
        queryParams.push(searchParams.offset);
      }

      const result = await query(queryText, queryParams);
      return result.rows.map(row => ({
        ...new LandParcel(row),
        owner_name: row.owner_name,
        owner_email: row.owner_email
      }));
    } catch (error) {
      logger.error('Error searching land parcels:', error);
      throw error;
    }
  }

  async update(updateData) {
    try {
      const allowedFields = ['location', 'area', 'land_type', 'coordinates', 'boundaries', 'status', 'market_value'];
      const updates = [];
      const values = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      paramCount++;
      updates.push(`updated_at = $${paramCount}`);
      values.push(new Date());

      paramCount++;
      values.push(this.land_parcel_id);

      const queryText = `
        UPDATE land_parcels 
        SET ${updates.join(', ')}
        WHERE land_parcel_id = $${paramCount}
        RETURNING *
      `;

      const result = await query(queryText, values);
      
      if (result.rows[0]) {
        Object.assign(this, result.rows[0]);
        logger.info('Land parcel updated successfully', { 
          parcelId: this.land_parcel_id 
        });
      }

      return this;
    } catch (error) {
      logger.error('Error updating land parcel:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_parcels,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_parcels,
          COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered_parcels,
          COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_parcels,
          SUM(area) as total_area,
          AVG(area) as average_area,
          COUNT(DISTINCT land_type) as land_types_count
        FROM land_parcels
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting land parcel stats:', error);
      throw error;
    }
  }
}

module.exports = LandParcel;