# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Features

The NLOMS Backend implements multiple layers of security:

### Authentication & Authorization
- **JWT Tokens**: Secure authentication with access and refresh tokens
- **Role-Based Access Control**: Granular permissions (Admin, Official, Chief, Citizen)
- **Password Security**: bcryptjs hashing with salt rounds
- **Session Management**: Secure token expiration and refresh mechanisms

### Input Validation & Sanitization
- **Express Validator**: Comprehensive input validation
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Token-based CSRF prevention

### Infrastructure Security
- **Rate Limiting**: Protection against brute force attacks
- **Helmet.js**: Security headers and protection middleware
- **CORS**: Controlled cross-origin resource sharing
- **Environment Variables**: Secure configuration management

### Data Protection
- **Encryption at Rest**: Database encryption
- **Secure File Upload**: Type validation and virus scanning
- **Audit Logging**: Comprehensive activity tracking
- **Data Validation**: Strict data type and format enforcement

## Reporting a Vulnerability

### How to Report

**DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report security vulnerabilities via email to:
**security@nloms.com** or **nebota.ismael@example.com**

### What to Include

Please include the following information:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Development**: 14-30 days depending on severity
- **Public Disclosure**: After fix is deployed and users have been notified

## Security Best Practices for Contributors

### Code Security
```javascript
// ✅ Good: Parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// ❌ Bad: String concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

```javascript
// ✅ Good: Input validation
const { body, validationResult } = require('express-validator');

router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

### Environment Security
```bash
# ✅ Good: Use environment variables
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-256-bit-secret

# ❌ Bad: Hardcoded secrets
const secret = 'hardcoded-secret';
```

### Error Handling
```javascript
// ✅ Good: Generic error messages
catch (error) {
  logger.error('Authentication failed:', error);
  res.status(401).json({ message: 'Invalid credentials' });
}

// ❌ Bad: Detailed error exposure
catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}
```

## Known Security Considerations

### Current Mitigations

1. **Rate Limiting**
   - 100 requests per 15 minutes for general API
   - 5 requests per 15 minutes for auth endpoints

2. **File Upload Security**
   - File type validation
   - Size limits (10MB)
   - Cloudinary virus scanning

3. **Database Security**
   - Connection pooling with limits
   - Read-only query users for reporting
   - Audit logging for all modifications

4. **API Security**
   - HTTPS enforcement in production
   - Security headers via Helmet.js
   - Request validation middleware

### Areas for Enhancement

1. **API Versioning**: Implement versioning for breaking changes
2. **API Rate Limiting**: Per-user rate limiting
3. **Advanced Monitoring**: Real-time security monitoring
4. **Penetration Testing**: Regular security assessments

## Security Headers

The application implements the following security headers:

```javascript
// Security headers via Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Authentication Flow Security

### JWT Token Security
```javascript
// Access token: 15 minutes
// Refresh token: 7 days
// Secure HTTP-only cookies in production
// Token rotation on refresh
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Account Security
- Account lockout after 5 failed attempts
- Password reset with secure tokens
- Email verification for new accounts
- Audit logging for all authentication events

## Database Security

### Connection Security
```javascript
// SSL enforcement
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Security
```javascript
// All queries use parameterized statements
const insertUser = 'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id';
const values = [email, hashedPassword];
await db.query(insertUser, values);
```

## File Upload Security

### Allowed File Types
- Images: jpg, jpeg, png, pdf
- Documents: pdf, doc, docx
- Maximum size: 10MB

### Security Measures
```javascript
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nloms-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    resource_type: 'auto'
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Additional file validation
  }
});
```

## Incident Response Plan

### Immediate Response (0-2 hours)
1. Assess the vulnerability severity
2. Isolate affected systems if necessary
3. Document the incident
4. Notify relevant stakeholders

### Short-term Response (2-24 hours)
1. Develop and test a fix
2. Prepare security advisory
3. Plan deployment strategy
4. Coordinate with users if needed

### Long-term Response (1-7 days)
1. Deploy fix to production
2. Monitor for related issues
3. Update documentation
4. Conduct post-incident review

## Security Contacts

- **Security Team**: security@nloms.com
- **Lead Developer**: nebota.ismael@example.com
- **Emergency Contact**: +237-XXX-XXX-XXX

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated**: January 2025  
**Next Review**: July 2025
