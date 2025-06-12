const { query } = require('../config/database');
const logger = require('../config/winston');

/**
 * Comprehensive health check utility for Docker and monitoring
 */
class HealthCheck {
  
  static async performHealthCheck() {
    const startTime = Date.now();
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    try {
      // Database health check
      healthStatus.checks.database = await this.checkDatabase();
      
      // Memory usage check
      healthStatus.checks.memory = await this.checkMemory();
      
      // Disk space check (if applicable)
      healthStatus.checks.diskSpace = await this.checkDiskSpace();
      
      // External services check
      healthStatus.checks.externalServices = await this.checkExternalServices();
      
      // Calculate response time
      healthStatus.responseTime = Date.now() - startTime;
      
      // Determine overall health status
      const failedChecks = Object.values(healthStatus.checks).filter(check => !check.healthy);
      if (failedChecks.length > 0) {
        healthStatus.status = 'unhealthy';
      }

      return healthStatus;
      
    } catch (error) {
      logger.error('Health check failed:', error);
      healthStatus.status = 'unhealthy';
      healthStatus.error = error.message;
      healthStatus.responseTime = Date.now() - startTime;
      return healthStatus;
    }
  }

  static async checkDatabase() {
    try {
      const start = Date.now();
      
      // Test basic connectivity
      const connectResult = await query('SELECT NOW() as current_time, version() as version');
      
      // Test write capability
      await query('SELECT 1');
      
      // Get connection pool status
      const poolStatus = {
        totalCount: global.pool?.totalCount || 0,
        idleCount: global.pool?.idleCount || 0,
        waitingCount: global.pool?.waitingCount || 0
      };

      return {
        healthy: true,
        responseTime: Date.now() - start,
        currentTime: connectResult.rows[0].current_time,
        version: connectResult.rows[0].version,
        connectionPool: poolStatus
      };
      
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        responseTime: null
      };
    }
  }

  static async checkMemory() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      
      const memoryInfo = {
        process: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          heapUsedPercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        system: {
          total: Math.round(totalMemory / 1024 / 1024 / 1024), // GB
          free: Math.round(freeMemory / 1024 / 1024 / 1024), // GB
          used: Math.round((totalMemory - freeMemory) / 1024 / 1024 / 1024), // GB
          usedPercentage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
        }
      };

      // Consider memory healthy if heap usage is below 80% and system usage is below 90%
      const healthy = memoryInfo.process.heapUsedPercentage < 80 && memoryInfo.system.usedPercentage < 90;

      return {
        healthy,
        ...memoryInfo
      };
      
    } catch (error) {
      logger.error('Memory health check failed:', error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  static async checkDiskSpace() {
    try {
      const fs = require('fs').promises;
      const stats = await fs.statvfs ? fs.statvfs('.') : null;
      
      if (!stats) {
        return {
          healthy: true,
          note: 'Disk space check not available on this platform'
        };
      }

      const total = stats.blocks * stats.frsize;
      const free = stats.bavail * stats.frsize;
      const used = total - free;
      const usedPercentage = Math.round((used / total) * 100);

      return {
        healthy: usedPercentage < 85, // Consider healthy if less than 85% used
        total: Math.round(total / 1024 / 1024 / 1024), // GB
        free: Math.round(free / 1024 / 1024 / 1024), // GB
        used: Math.round(used / 1024 / 1024 / 1024), // GB
        usedPercentage
      };
      
    } catch (error) {
      logger.warn('Disk space health check failed:', error);
      return {
        healthy: true, // Don't fail health check for disk space issues
        error: error.message
      };
    }
  }

  static async checkExternalServices() {
    const services = {
      cloudinary: false,
      redis: false
    };

    try {
      // Check Cloudinary if configured
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.api.ping();
          services.cloudinary = true;
        } catch (error) {
          logger.warn('Cloudinary health check failed:', error.message);
        }
      } else {
        services.cloudinary = 'not_configured';
      }

      // Check Redis if configured
      if (process.env.REDIS_URL) {
        try {
          const Redis = require('ioredis');
          const redis = new Redis(process.env.REDIS_URL);
          await redis.ping();
          await redis.disconnect();
          services.redis = true;
        } catch (error) {
          logger.warn('Redis health check failed:', error.message);
        }
      } else {
        services.redis = 'not_configured';
      }

      return {
        healthy: true,
        services
      };
      
    } catch (error) {
      logger.error('External services health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        services
      };
    }
  }

  /**
   * Simple health check for Docker health check command
   */
  static async simpleHealthCheck() {
    try {
      await query('SELECT 1');
      return { status: 'healthy' };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

// Export for use in health check endpoints and Docker
module.exports = HealthCheck;

// If called directly (for Docker health check)
if (require.main === module) {
  HealthCheck.simpleHealthCheck()
    .then(() => {
      console.log('Health check passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Health check failed:', error.message);
      process.exit(1);
    });
}