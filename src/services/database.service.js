const { pool, query, transaction } = require('../config/database');
const logger = require('../config/winston');

class DatabaseService {
  
  /**
   * Execute a raw SQL query with parameters
   * @param {string} text - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  static async executeQuery(text, params = []) {
    try {
      return await query(text, params);
    } catch (error) {
      logger.error('Database query execution error:', {
        query: text,
        params,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Function containing transaction operations
   * @returns {Promise<any>} Transaction result
   */
  static async executeTransaction(callback) {
    try {
      return await transaction(callback);
    } catch (error) {
      logger.error('Database transaction error:', error);
      throw error;
    }
  }

  /**
   * Check database connection health
   * @returns {Promise<boolean>} Connection status
   */
  static async checkHealth() {
    try {
      const result = await query('SELECT NOW() as current_time, version() as version');
      logger.info('Database health check successful', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version
      });
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  static async getStatistics() {
    try {
      const queries = [
        {
          name: 'total_connections',
          query: `SELECT count(*) as value FROM pg_stat_activity`
        },
        {
          name: 'database_size',
          query: `SELECT pg_size_pretty(pg_database_size(current_database())) as value`
        },
        {
          name: 'table_count',
          query: `SELECT count(*) as value FROM information_schema.tables WHERE table_schema = 'public'`
        },
        {
          name: 'index_count',
          query: `SELECT count(*) as value FROM pg_indexes WHERE schemaname = 'public'`
        }
      ];

      const stats = {};
      
      for (const { name, query: sqlQuery } of queries) {
        try {
          const result = await query(sqlQuery);
          stats[name] = result.rows[0].value;
        } catch (error) {
          logger.warn(`Failed to get ${name} statistic:`, error);
          stats[name] = 'unavailable';
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting database statistics:', error);
      throw error;
    }
  }

  /**
   * Execute database backup (placeholder for production implementation)
   * @param {string} backupName - Name for the backup
   * @returns {Promise<Object>} Backup result
   */
  static async createBackup(backupName) {
    try {
      // In production, this would execute pg_dump or similar
      // For now, we'll just log the backup creation
      const backupId = `${backupName}_${Date.now()}`;
      
      await query(
        `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)`,
        [1, 'DATABASE_BACKUP', `Backup ${backupId} created`]
      );

      logger.info('Database backup created', { backupId });
      
      return {
        backupId,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
    } catch (error) {
      logger.error('Error creating database backup:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs (retention policy)
   * @param {number} retentionDays - Number of days to retain logs
   * @returns {Promise<number>} Number of deleted records
   */
  static async cleanupAuditLogs(retentionDays = 90) {
    try {
      const result = await query(
        `DELETE FROM audit_logs 
         WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
         RETURNING log_id`
      );

      const deletedCount = result.rowCount;
      logger.info('Audit logs cleaned up', { 
        deletedCount, 
        retentionDays 
      });

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }

  /**
   * Get table sizes for monitoring
   * @returns {Promise<Array>} Array of table sizes
   */
  static async getTableSizes() {
    try {
      const result = await query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting table sizes:', error);
      throw error;
    }
  }

  /**
   * Analyze query performance
   * @param {string} sqlQuery - Query to analyze
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query execution plan
   */
  static async analyzeQuery(sqlQuery, params = []) {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sqlQuery}`;
      const result = await query(explainQuery, params);
      
      return result.rows[0]['QUERY PLAN'][0];
    } catch (error) {
      logger.error('Error analyzing query:', error);
      throw error;
    }
  }

  /**
   * Get slow queries from pg_stat_statements (if extension is available)
   * @param {number} limit - Number of queries to return
   * @returns {Promise<Array>} Array of slow queries
   */
  static async getSlowQueries(limit = 10) {
    try {
      const result = await query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          stddev_time,
          rows
        FROM pg_stat_statements
        ORDER BY mean_time DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      // pg_stat_statements extension might not be available
      logger.warn('Could not retrieve slow queries (pg_stat_statements not available)');
      return [];
    }
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  static async closeConnections() {
    try {
      await pool.end();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;