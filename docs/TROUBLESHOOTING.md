# Troubleshooting Guide

## Overview

This guide provides solutions to common issues you may encounter while developing, deploying, or running the NLOMS Backend application.

## Quick Diagnosis

### Health Check Commands

```cmd
REM Check application health
curl http://localhost:8080/health

REM Check database connection
node scripts/debug-env.js

REM Check Heroku app status
heroku ps:scale web=1 --app nloms-backend
heroku logs --tail --app nloms-backend
```

### Environment Verification

```cmd
REM Verify environment variables
echo %NODE_ENV%
echo %DATABASE_URL%
echo %JWT_SECRET%

REM Check Node.js version
node --version
npm --version

REM Check PostgreSQL connection
psql %DATABASE_URL% -c "SELECT version();"
```

## Common Issues

### Database Issues

#### Issue: Database Connection Failed
**Symptoms:**
- Error: "Connection refused" or "Connection timeout"
- Application fails to start
- Database queries fail

**Solutions:**

1. **Check Database URL**
   ```cmd
   REM Verify DATABASE_URL format
   echo %DATABASE_URL%
   REM Should be: postgresql://username:password@host:port/database
   ```

2. **Test Connection**
   ```cmd
   REM Test direct connection
   psql %DATABASE_URL% -c "SELECT NOW();"
   
   REM Check if database exists
   psql %DATABASE_URL% -c "\l"
   ```

3. **Heroku Database Issues**
   ```cmd
   REM Check Heroku database status
   heroku pg:info --app nloms-backend
   
   REM Reset database connection
   heroku pg:reset DATABASE_URL --app nloms-backend --confirm nloms-backend
   
   REM Run migrations
   heroku run npm run migrate --app nloms-backend
   ```

4. **Local Database Setup**
   ```cmd
   REM Create local database
   createdb nloms_dev
   
   REM Run migrations locally
   set DATABASE_URL=postgresql://localhost:5432/nloms_dev
   npm run migrate
   ```

#### Issue: Migration Errors
**Symptoms:**
- "Table already exists" errors
- "Column does not exist" errors
- Migration script fails

**Solutions:**

1. **Check Migration Status**
   ```cmd
   REM Check which tables exist
   psql %DATABASE_URL% -c "\dt"
   
   REM Check table structure
   psql %DATABASE_URL% -c "\d users"
   ```

2. **Reset and Re-run Migrations**
   ```cmd
   REM Backup data if needed
   pg_dump %DATABASE_URL% > backup.sql
   
   REM Drop all tables (CAUTION: Data loss)
   psql %DATABASE_URL% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   
   REM Re-run migrations
   npm run migrate
   ```

3. **Manual Migration Fixes**
   ```sql
   -- Add missing columns
   ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
   
   -- Create missing indexes
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
   
   -- Fix data types
   ALTER TABLE land_parcels ALTER COLUMN area TYPE DECIMAL(10,2);
   ```

#### Issue: Query Performance Problems
**Symptoms:**
- Slow API responses
- Database timeouts
- High CPU usage

**Solutions:**

1. **Analyze Slow Queries**
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   
   -- Find slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

2. **Add Missing Indexes**
   ```sql
   -- Check index usage
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE tablename = 'land_parcels';
   
   -- Add indexes for common queries
   CREATE INDEX CONCURRENTLY idx_land_parcels_owner_status 
   ON land_parcels(owner_id, status);
   ```

3. **Optimize Queries**
   ```javascript
   // Before: N+1 query problem
   const parcels = await LandParcel.findAll();
   for (const parcel of parcels) {
     const owner = await User.findById(parcel.owner_id);
   }
   
   // After: Single query with JOIN
   const query = `
     SELECT lp.*, u.first_name, u.last_name
     FROM land_parcels lp
     LEFT JOIN users u ON lp.owner_id = u.id
   `;
   const parcels = await db.query(query);
   ```

### Authentication Issues

#### Issue: JWT Token Errors
**Symptoms:**
- "Invalid token" errors
- "Token expired" errors
- Authentication failures

**Solutions:**

1. **Verify JWT Secret**
   ```cmd
   REM Check if JWT_SECRET is set
   echo %JWT_SECRET%
   
   REM Generate new secret if needed
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Debug Token Issues**
   ```javascript
   // Debug token verification
   const jwt = require('jsonwebtoken');
   
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
     console.log('Token is valid:', decoded);
   } catch (error) {
     console.log('Token error:', error.message);
   }
   ```

3. **Check Token Expiration**
   ```javascript
   // Check if token is expired
   const decoded = jwt.decode(token);
   const now = Math.floor(Date.now() / 1000);
   
   if (decoded.exp < now) {
     console.log('Token expired');
     // Use refresh token to get new access token
   }
   ```

#### Issue: Permission Denied
**Symptoms:**
- "Access denied" errors
- Users can't access resources
- Role-based access not working

**Solutions:**

1. **Check User Roles**
   ```sql
   -- Verify user roles
   SELECT id, email, role, active FROM users WHERE email = 'user@example.com';
   
   -- Update user role if needed
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

2. **Debug Authorization Middleware**
   ```javascript
   // Add debug logging to auth middleware
   const authorize = (roles) => {
     return (req, res, next) => {
       console.log('User role:', req.user.role);
       console.log('Required roles:', roles);
       
       if (!roles.includes(req.user.role)) {
         return res.status(403).json({
           success: false,
           message: 'Access denied'
         });
       }
       
       next();
     };
   };
   ```

### File Upload Issues

#### Issue: File Upload Failures
**Symptoms:**
- Files not uploading
- "File too large" errors
- Cloudinary errors

**Solutions:**

1. **Check Cloudinary Configuration**
   ```cmd
   REM Verify Cloudinary credentials
   echo %CLOUDINARY_CLOUD_NAME%
   echo %CLOUDINARY_API_KEY%
   echo %CLOUDINARY_API_SECRET%
   ```

2. **Test Cloudinary Connection**
   ```javascript
   // Test Cloudinary upload
   const cloudinary = require('cloudinary').v2;
   
   cloudinary.uploader.upload('test-image.jpg')
     .then(result => console.log('Upload successful:', result.secure_url))
     .catch(error => console.error('Upload failed:', error));
   ```

3. **Check File Size Limits**
   ```javascript
   // Increase file size limit if needed
   const upload = multer({
     storage: cloudinaryStorage,
     limits: {
       fileSize: 50 * 1024 * 1024 // 50MB limit
     }
   });
   ```

#### Issue: File Type Validation
**Symptoms:**
- Invalid file types accepted
- Security concerns with uploads

**Solutions:**

1. **Implement Strict File Validation**
   ```javascript
   const fileFilter = (req, file, cb) => {
     const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
     
     if (allowedTypes.includes(file.mimetype)) {
       cb(null, true);
     } else {
       cb(new Error('Invalid file type'), false);
     }
   };
   ```

### Heroku Deployment Issues

#### Issue: Build Failures
**Symptoms:**
- Deployment fails
- "Build error" messages
- Application won't start

**Solutions:**

1. **Check Build Logs**
   ```cmd
   REM View deployment logs
   heroku logs --tail --app nloms-backend
   
   REM Check build logs specifically
   heroku logs --source app --app nloms-backend
   ```

2. **Verify package.json**
   ```json
   {
     "engines": {
       "node": ">=18.0.0",
       "npm": ">=9.0.0"
     },
     "scripts": {
       "start": "node src/server.js",
       "heroku-postbuild": "echo 'Build completed successfully'"
     }
   }
   ```

3. **Check Dependencies**
   ```cmd
   REM Install missing dependencies
   npm install --save compression
   npm install --save helmet
   
   REM Remove unused dependencies
   npm uninstall unused-package
   ```

#### Issue: Environment Variables Missing
**Symptoms:**
- Application errors on startup
- Database connection failures
- Missing configuration

**Solutions:**

1. **Set Required Environment Variables**
   ```cmd
   REM Set all required variables
   heroku config:set NODE_ENV=production --app nloms-backend
   heroku config:set JWT_SECRET=your-secret-here --app nloms-backend
   heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name --app nloms-backend
   ```

2. **Verify Configuration**
   ```cmd
   REM List all config variables
   heroku config --app nloms-backend
   
   REM Check specific variable
   heroku config:get DATABASE_URL --app nloms-backend
   ```

#### Issue: Application Crashes
**Symptoms:**
- App keeps restarting
- "Application error" page
- Process crashes

**Solutions:**

1. **Check Process Status**
   ```cmd
   REM Check running processes
   heroku ps --app nloms-backend
   
   REM Restart application
   heroku restart --app nloms-backend
   
   REM Scale dynos
   heroku ps:scale web=1 --app nloms-backend
   ```

2. **Debug Crashes**
   ```cmd
   REM View crash logs
   heroku logs --tail --app nloms-backend | findstr ERROR
   
   REM Check memory usage
   heroku logs --tail --app nloms-backend | findstr "Memory"
   ```

### API Issues

#### Issue: CORS Errors
**Symptoms:**
- "Access-Control-Allow-Origin" errors
- Frontend can't connect to API
- Preflight request failures

**Solutions:**

1. **Configure CORS Properly**
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

2. **Handle Preflight Requests**
   ```javascript
   app.options('*', cors()); // Enable preflight for all routes
   ```

#### Issue: Rate Limiting Problems
**Symptoms:**
- "Too many requests" errors
- Legitimate users blocked
- Rate limits too strict

**Solutions:**

1. **Adjust Rate Limits**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   // More lenient limits for development
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: process.env.NODE_ENV === 'production' ? 100 : 1000,
     message: 'Too many requests, please try again later'
   });
   ```

2. **Implement User-based Limiting**
   ```javascript
   const createLimiter = (max) => rateLimit({
     windowMs: 15 * 60 * 1000,
     max,
     keyGenerator: (req) => req.user ? req.user.id : req.ip,
     skip: (req) => req.user && req.user.role === 'admin'
   });
   ```

### Performance Issues

#### Issue: Slow API Responses
**Symptoms:**
- Long response times
- Timeouts
- Poor user experience

**Solutions:**

1. **Add Response Time Monitoring**
   ```javascript
   app.use((req, res, next) => {
     const start = Date.now();
     
     res.on('finish', () => {
       const duration = Date.now() - start;
       console.log(`${req.method} ${req.url} - ${duration}ms`);
       
       if (duration > 1000) {
         console.warn('Slow request detected:', {
           method: req.method,
           url: req.url,
           duration
         });
       }
     });
     
     next();
   });
   ```

2. **Implement Caching**
   ```javascript
   const NodeCache = require('node-cache');
   const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes
   
   const cacheMiddleware = (duration) => {
     return (req, res, next) => {
       const key = req.originalUrl;
       const cached = cache.get(key);
       
       if (cached) {
         return res.json(cached);
       }
       
       res.sendResponse = res.json;
       res.json = (body) => {
         cache.set(key, body, duration);
         res.sendResponse(body);
       };
       
       next();
     };
   };
   ```

#### Issue: Memory Leaks
**Symptoms:**
- Increasing memory usage
- Application becomes slow
- Eventually crashes

**Solutions:**

1. **Monitor Memory Usage**
   ```javascript
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory usage:', {
       rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`,
       heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
       heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`
     });
   }, 30000);
   ```

2. **Fix Common Memory Leaks**
   ```javascript
   // Proper event listener cleanup
   class MyService extends EventEmitter {
     constructor() {
       super();
       this.timers = [];
     }
     
     addTimer(callback, delay) {
       const timer = setTimeout(callback, delay);
       this.timers.push(timer);
       return timer;
     }
     
     cleanup() {
       this.timers.forEach(timer => clearTimeout(timer));
       this.timers = [];
       this.removeAllListeners();
     }
   }
   ```

## Debugging Tools

### Environment Debug Script

```javascript
// scripts/debug-env.js
const debug = {
  environment: process.env.NODE_ENV,
  port: process.env.PORT,
  databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
  jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
    apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
    apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
  },
  nodeVersion: process.version,
  platform: process.platform,
  memory: process.memoryUsage(),
  uptime: process.uptime()
};

console.log('Environment Debug Info:');
console.log(JSON.stringify(debug, null, 2));

// Test database connection
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  pool.query('SELECT NOW()')
    .then(() => console.log('✓ Database connection successful'))
    .catch(err => console.error('✗ Database connection failed:', err.message))
    .finally(() => pool.end());
}
```

### Database Debug Queries

```sql
-- Check database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;

-- Check active connections
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE state = 'active';

-- Check locks
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity 
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

### Log Analysis

```cmd
REM Analyze error patterns
heroku logs --app nloms-backend | findstr "ERROR" > errors.log

REM Monitor real-time logs
heroku logs --tail --app nloms-backend | findstr /v "GET /health"

REM Check specific time period
heroku logs --app nloms-backend --since="2 hours ago"
```

## Recovery Procedures

### Database Recovery

1. **Backup Current State**
   ```cmd
   REM Create backup
   heroku pg:backups:capture --app nloms-backend
   
   REM Download backup
   heroku pg:backups:download --app nloms-backend
   ```

2. **Restore from Backup**
   ```cmd
   REM List available backups
   heroku pg:backups --app nloms-backend
   
   REM Restore from backup
   heroku pg:backups:restore BACKUP_ID DATABASE_URL --app nloms-backend
   ```

### Application Recovery

1. **Rollback Deployment**
   ```cmd
   REM View release history
   heroku releases --app nloms-backend
   
   REM Rollback to previous version
   heroku rollback v123 --app nloms-backend
   ```

2. **Emergency Fixes**
   ```cmd
   REM Scale down to prevent further issues
   heroku ps:scale web=0 --app nloms-backend
   
   REM Apply emergency fix
   git commit -m "Emergency fix"
   git push heroku main
   
   REM Scale back up
   heroku ps:scale web=1 --app nloms-backend
   ```

## Prevention Strategies

### Monitoring Setup

1. **Health Checks**
   ```javascript
   // Implement comprehensive health checks
   app.get('/health', async (req, res) => {
     const health = await checkSystemHealth();
     res.status(health.status === 'healthy' ? 200 : 503).json(health);
   });
   ```

2. **Error Tracking**
   ```javascript
   // Implement error tracking
   process.on('uncaughtException', (error) => {
     console.error('Uncaught Exception:', error);
     // Send to error tracking service
     process.exit(1);
   });
   
   process.on('unhandledRejection', (reason, promise) => {
     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
     // Send to error tracking service
   });
   ```

### Testing Strategy

1. **Automated Testing**
   ```cmd
   REM Run tests before deployment
   npm test
   npm run test:integration
   npm run test:security
   ```

2. **Load Testing**
   ```cmd
   REM Regular load testing
   artillery run artillery-config.yml
   ```

## Getting Help

### Resources
- [GitHub Issues](https://github.com/nebotaismael/nloms-backend/issues)
- [Documentation](./README.md)
- [API Reference](./API.md)

### Contact Information
- **Technical Support**: nebota.ismael@example.com
- **Emergency Contact**: +237-XXX-XXX-XXX
- **GitHub**: @nebotaismael

### Escalation Process
1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Create new issue with detailed information
4. Contact technical support for urgent issues

---

**Last Updated**: June 12, 2025  
**Version**: 1.0.0  
**Support Level**: Production Ready
