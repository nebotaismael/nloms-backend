# Performance Guide

## Overview

This guide covers performance optimization strategies, monitoring, and best practices for the NLOMS Backend to ensure optimal performance under production loads.

## Performance Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time | < 500ms | < 1000ms |
| Database Query Time | < 100ms | < 300ms |
| Memory Usage | < 512MB | < 1GB |
| CPU Usage | < 70% | < 90% |
| Error Rate | < 1% | < 5% |
| Uptime | > 99.5% | > 99% |

### Response Time Targets
- **Authentication**: < 200ms
- **User Operations**: < 300ms
- **Land Parcel Queries**: < 500ms
- **Report Generation**: < 2000ms
- **File Upload**: < 5000ms

## Database Optimization

### Query Optimization

#### Efficient Queries
```javascript
// ✅ Good: Use indexes and limit results
const getLandParcels = async (filters, pagination) => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT lp.*, u.first_name, u.last_name
    FROM land_parcels lp
    JOIN users u ON lp.owner_id = u.id
    WHERE lp.region_id = $1
      AND lp.status = $2
    ORDER BY lp.created_at DESC
    LIMIT $3 OFFSET $4
  `;
  
  return await db.query(query, [filters.regionId, filters.status, limit, offset]);
};

// ❌ Bad: No pagination, inefficient joins
const getAllLandParcels = async () => {
  const query = `
    SELECT * FROM land_parcels lp, users u, regions r
    WHERE lp.owner_id = u.id AND lp.region_id = r.id
  `;
  
  return await db.query(query);
};
```

#### Index Strategy
```sql
-- Primary indexes for frequent queries
CREATE INDEX CONCURRENTLY idx_land_parcels_owner_id ON land_parcels(owner_id);
CREATE INDEX CONCURRENTLY idx_land_parcels_region_id ON land_parcels(region_id);
CREATE INDEX CONCURRENTLY idx_land_parcels_status ON land_parcels(status);
CREATE INDEX CONCURRENTLY idx_applications_user_id ON applications(user_id);
CREATE INDEX CONCURRENTLY idx_applications_status ON applications(status);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_land_parcels_region_status ON land_parcels(region_id, status);
CREATE INDEX CONCURRENTLY idx_applications_user_status ON applications(user_id, status);

-- Text search indexes
CREATE INDEX CONCURRENTLY idx_land_parcels_search ON land_parcels USING gin(to_tsvector('english', title || ' ' || description));
```

#### Query Analysis
```javascript
// Query performance monitoring
const monitorQuery = async (queryName, queryFn) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const result = await queryFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    if (duration > 100) {
      logger.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }
    
    // Log to monitoring system
    metrics.timing('database.query.duration', duration, { query: queryName });
    
    return result;
  } catch (error) {
    metrics.increment('database.query.error', { query: queryName });
    throw error;
  }
};
```

### Connection Pool Optimization

```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool settings
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
  
  // Performance settings
  statement_timeout: 10000,   // 10s query timeout
  query_timeout: 10000,       // 10s query timeout
  
  // SSL settings
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Monitor pool health
pool.on('connect', () => {
  metrics.increment('database.connection.created');
});

pool.on('remove', () => {
  metrics.increment('database.connection.removed');
});

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
  metrics.increment('database.connection.error');
});
```

### Query Caching

```javascript
// utils/cache.js
const NodeCache = require('node-cache');

class QueryCache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300,        // 5 minutes default TTL
      checkperiod: 60,    // Check for expired keys every minute
      useClones: false    // Better performance
    });
  }

  async get(key, fetchFunction, ttl = 300) {
    let result = this.cache.get(key);
    
    if (result === undefined) {
      result = await fetchFunction();
      this.cache.set(key, result, ttl);
      metrics.increment('cache.miss', { key });
    } else {
      metrics.increment('cache.hit', { key });
    }
    
    return result;
  }

  invalidate(pattern) {
    const keys = this.cache.keys().filter(key => key.includes(pattern));
    this.cache.del(keys);
    metrics.increment('cache.invalidated', { pattern, count: keys.length });
  }
}

const queryCache = new QueryCache();

// Usage example
const getCachedLandParcels = async (regionId) => {
  return await queryCache.get(
    `land_parcels:region:${regionId}`,
    () => LandParcel.findByRegion(regionId),
    600 // 10 minutes TTL
  );
};
```

## API Performance

### Response Optimization

#### Compression
```javascript
// server.js
const compression = require('compression');

app.use(compression({
  level: 6,           // Compression level (1-9)
  threshold: 1024,    // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Fallback to standard filter function
    return compression.filter(req, res);
  }
}));
```

#### Pagination
```javascript
// controllers/landController.js
const getLandParcels = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items
    const offset = (page - 1) * limit;

    const result = await LandParcel.findWithPagination({
      limit,
      offset,
      filters: req.query
    });

    const totalItems = await LandParcel.count(req.query);
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};
```

#### Field Selection
```javascript
// Allow clients to specify which fields they want
const getUsers = async (req, res, next) => {
  try {
    const fields = req.query.fields ? req.query.fields.split(',') : ['*'];
    const allowedFields = ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'];
    
    // Validate and sanitize fields
    const selectedFields = fields.filter(field => allowedFields.includes(field));
    const fieldString = selectedFields.length > 0 ? selectedFields.join(', ') : '*';

    const query = `SELECT ${fieldString} FROM users WHERE active = true`;
    const result = await db.query(query);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};
```

### Rate Limiting Optimization

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Different limits for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    
    // Use Redis for distributed rate limiting in production
    store: process.env.REDIS_URL ? new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }) : undefined,
    
    // Skip successful requests for certain endpoints
    skipSuccessfulRequests: true,
    
    // Custom key generator for user-based limiting
    keyGenerator: (req) => {
      return req.user ? `user:${req.user.id}` : req.ip;
    }
  });
};

// Different rate limits for different operations
const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts');
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many API requests');
const uploadLimiter = createRateLimiter(60 * 60 * 1000, 10, 'Too many file uploads');
```

## Memory Management

### Memory Monitoring

```javascript
// utils/memoryMonitor.js
const monitorMemory = () => {
  const usage = process.memoryUsage();
  
  const memoryMetrics = {
    rss: usage.rss / 1024 / 1024,           // Resident Set Size
    heapTotal: usage.heapTotal / 1024 / 1024, // Total heap allocated
    heapUsed: usage.heapUsed / 1024 / 1024,   // Heap actually used
    external: usage.external / 1024 / 1024    // External memory
  };
  
  // Log memory usage
  logger.info('Memory usage:', memoryMetrics);
  
  // Send to monitoring system
  Object.entries(memoryMetrics).forEach(([key, value]) => {
    metrics.gauge(`memory.${key}`, value);
  });
  
  // Alert if memory usage is high
  if (memoryMetrics.heapUsed > 500) {
    logger.warn('High memory usage detected:', memoryMetrics);
  }
  
  return memoryMetrics;
};

// Monitor every 30 seconds
setInterval(monitorMemory, 30000);
```

### Memory Leak Prevention

```javascript
// Proper event listener cleanup
class ServiceWithEvents extends EventEmitter {
  constructor() {
    super();
    this.timers = new Set();
    this.intervals = new Set();
  }

  setTimeout(callback, delay) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  setInterval(callback, interval) {
    const timer = setInterval(callback, interval);
    this.intervals.add(timer);
    return timer;
  }

  cleanup() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(timer => clearInterval(timer));
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Clear collections
    this.timers.clear();
    this.intervals.clear();
  }
}

// Stream handling for large files
const processLargeFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (chunk) => {
      // Process chunk without storing entire file in memory
      processChunk(chunk);
    });
    
    stream.on('end', resolve);
    stream.on('error', reject);
    
    // Ensure stream is properly closed
    stream.on('close', () => {
      logger.info('File stream closed');
    });
  });
};
```

## Error Handling Performance

### Efficient Error Handling

```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    // Don't capture stack trace for operational errors to save memory
    if (isOperational) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Fast error responses
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};
```

## Monitoring and Profiling

### Performance Monitoring

```javascript
// middleware/performanceMonitor.js
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  // Track request start
  const requestId = req.headers['x-request-id'] || require('uuid').v4();
  req.requestId = requestId;
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    const metrics = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    logger.info('Request completed:', metrics);
    
    // Send to monitoring system
    sendMetrics('api.request.duration', duration, {
      method: req.method,
      endpoint: req.route?.path || req.url,
      status: res.statusCode
    });
    
    // Alert on slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected:', metrics);
    }
  });
  
  next();
};
```

### Health Checks

```javascript
// utils/healthcheck.js
const healthCheck = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  try {
    // Check database connection
    const dbStart = Date.now();
    await db.query('SELECT 1');
    health.database = {
      status: 'connected',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.database = {
      status: 'disconnected',
      error: error.message
    };
  }
  
  try {
    // Check external services
    const cloudinaryStart = Date.now();
    await cloudinary.api.ping();
    health.cloudinary = {
      status: 'connected',
      responseTime: Date.now() - cloudinaryStart
    };
  } catch (error) {
    health.cloudinary = {
      status: 'disconnected',
      error: error.message
    };
  }
  
  return health;
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Load Testing

### Artillery Load Tests

**artillery-config.yml**
```yaml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  
scenarios:
  - name: "API Load Test"
    weight: 100
    flow:
      - post:
          url: "/api/auth/register"
          json:
            email: "test{{ $randomString() }}@example.com"
            password: "Password123!"
            firstName: "Test"
            lastName: "User"
            role: "citizen"
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ email }}"
            password: "Password123!"
          capture:
            - json: "$.data.accessToken"
              as: "token"
      - get:
          url: "/api/users/profile"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/land-parcels"
          headers:
            Authorization: "Bearer {{ token }}"
```

### Performance Testing Script

```javascript
// scripts/performance-test.js
const { performance } = require('perf_hooks');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

const performanceTest = async () => {
  const results = {
    registration: [],
    login: [],
    apiCalls: []
  };

  console.log('Starting performance tests...');

  // Test user registration
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        email: `test${i}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'citizen'
      });
      
      const end = performance.now();
      results.registration.push(end - start);
    } catch (error) {
      console.error(`Registration ${i} failed:`, error.message);
    }
  }

  // Calculate statistics
  const calculateStats = (times) => {
    const sorted = times.sort((a, b) => a - b);
    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  };

  console.log('Registration Performance:', calculateStats(results.registration));
  
  return results;
};

if (require.main === module) {
  performanceTest().then(results => {
    console.log('Performance test completed');
    process.exit(0);
  }).catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}
```

## Production Optimization

### Environment Configuration

```javascript
// config/production.js
module.exports = {
  // Database optimization
  database: {
    max: 20,                    // Connection pool size
    statement_timeout: 10000,   // 10s timeout
    query_timeout: 10000,
    idle_in_transaction_session_timeout: 30000
  },
  
  // Caching
  cache: {
    enabled: true,
    ttl: 300,                   // 5 minutes default
    checkPeriod: 60             // Check every minute
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100                    // Max requests per window
  },
  
  // Compression
  compression: {
    level: 6,                   // Compression level
    threshold: 1024             // Minimum size to compress
  },
  
  // Security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }
};
```

### Docker Optimization

```dockerfile
# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS production

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Set production environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

USER nodejs

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/utils/healthcheck.js

CMD ["node", "src/server.js"]
```

## Performance Checklist

### Database Performance
- [ ] Proper indexes on frequently queried columns
- [ ] Query optimization and analysis
- [ ] Connection pooling configured
- [ ] Query caching implemented
- [ ] Pagination for large result sets
- [ ] Database query monitoring

### API Performance
- [ ] Response compression enabled
- [ ] Rate limiting configured
- [ ] Field selection for responses
- [ ] Proper error handling
- [ ] Request/response monitoring
- [ ] Caching strategies implemented

### Memory Management
- [ ] Memory usage monitoring
- [ ] Proper event listener cleanup
- [ ] Stream processing for large files
- [ ] Memory leak detection
- [ ] Garbage collection optimization

### Monitoring
- [ ] Performance metrics collection
- [ ] Health check endpoints
- [ ] Error tracking and alerting
- [ ] Load testing implemented
- [ ] Production monitoring setup

---

**Last Updated**: June 12, 2025  
**Target Performance**: < 500ms API response time  
**Monitoring**: Real-time performance tracking
