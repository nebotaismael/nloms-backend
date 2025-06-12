const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nloms-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transports in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error'
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log')
  }));
}

module.exports = logger;