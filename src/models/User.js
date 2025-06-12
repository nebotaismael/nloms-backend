const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../config/winston');

class User {
  constructor(userData) {
    this.user_id = userData.user_id;
    this.name = userData.name;
    this.email = userData.email;
    this.password_hash = userData.password_hash;
    this.role = userData.role;
    this.registration_status = userData.registration_status;
    this.phone_number = userData.phone_number;
    this.address = userData.address;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  static async create(userData) {
    try {
      const { name, email, password, role, phone_number, address } = userData;
      
      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await query(
        `INSERT INTO users (name, email, password_hash, role, phone_number, address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, name, email, role, registration_status, phone_number, address, created_at`,
        [name, email, password_hash, role, phone_number, address]
      );

      logger.info('User created successfully', { userId: result.rows[0].user_id });
      return new User(result.rows[0]);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(userId) {
    try {
      const result = await query(
        'SELECT user_id, name, email, role, registration_status, phone_number, address, created_at, updated_at FROM users WHERE user_id = $1',
        [userId]
      );
      
      return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let queryText = `
        SELECT user_id, name, email, role, registration_status, phone_number, address, created_at, updated_at 
        FROM users WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 0;

      if (filters.role) {
        paramCount++;
        queryText += ` AND role = $${paramCount}`;
        queryParams.push(filters.role);
      }

      if (filters.status) {
        paramCount++;
        queryText += ` AND registration_status = $${paramCount}`;
        queryParams.push(filters.status);
      }

      queryText += ' ORDER BY created_at DESC';

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
      return result.rows.map(row => new User(row));
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    }
  }

  async update(updateData) {
    try {
      const allowedFields = ['name', 'phone_number', 'address', 'registration_status'];
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
      values.push(this.user_id);

      const queryText = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING user_id, name, email, role, registration_status, phone_number, address, updated_at
      `;

      const result = await query(queryText, values);
      
      if (result.rows[0]) {
        Object.assign(this, result.rows[0]);
        logger.info('User updated successfully', { userId: this.user_id });
      }

      return this;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async validatePassword(password) {
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      logger.error('Error validating password:', error);
      throw error;
    }
  }

  async changePassword(newPassword) {
    try {
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      await query(
        'UPDATE users SET password_hash = $1, updated_at = $2 WHERE user_id = $3',
        [password_hash, new Date(), this.user_id]
      );

      logger.info('Password changed successfully', { userId: this.user_id });
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'citizen' THEN 1 END) as citizens,
          COUNT(CASE WHEN role = 'official' THEN 1 END) as officials,
          COUNT(CASE WHEN role = 'chief' THEN 1 END) as chiefs,
          COUNT(CASE WHEN registration_status = 'verified' THEN 1 END) as verified_users,
          COUNT(CASE WHEN registration_status = 'pending' THEN 1 END) as pending_users
        FROM users
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;