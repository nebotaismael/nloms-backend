# Testing Guide

## Overview

This guide covers testing strategies, setup, and best practices for the NLOMS Backend. We use Jest as our primary testing framework with additional tools for integration and API testing.

## Testing Strategy

### Testing Pyramid
```
    /\
   /  \ Unit Tests (80%)
  /____\
 /      \
/        \ Integration Tests (15%)
\________/
    ||
    || End-to-End Tests (5%)
    ||
```

### Test Types

1. **Unit Tests**: Individual functions and methods
2. **Integration Tests**: API endpoints and database interactions
3. **Security Tests**: Authentication and authorization flows
4. **Performance Tests**: Load testing and benchmarks

## Setup

### Prerequisites
```cmd
npm install --save-dev jest supertest
```

### Test Configuration

**jest.config.js**
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Database Setup

**tests/setup.js**
```javascript
const { Pool } = require('pg');

// Test database configuration
const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/nloms_test',
  ssl: false
});

beforeAll(async () => {
  // Run migrations
  await runMigrations(testDb);
});

afterAll(async () => {
  // Clean up
  await testDb.end();
});

beforeEach(async () => {
  // Clear test data
  await clearTestData(testDb);
});
```

## Unit Testing

### Testing Controllers

**tests/unit/controllers/auth.controller.test.js**
```javascript
const authController = require('../../../src/controllers/auth.controller');
const authService = require('../../../src/services/auth.service');
const { AppError } = require('../../../src/utils/errors');

jest.mock('../../../src/services/auth.service');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };
    next = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      };
      req.body = userData;

      const mockUser = { id: '123', email: userData.email };
      const mockTokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      };

      authService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens
      });

      // Act
      await authController.register(req, res, next);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(userData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: mockUser,
          accessToken: mockTokens.accessToken
        }
      });
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken, expect.any(Object));
    });

    it('should handle registration errors', async () => {
      // Arrange
      req.body = { email: 'invalid-email' };
      const error = new AppError('Invalid email format', 400);
      authService.register.mockRejectedValue(error);

      // Act
      await authController.register(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!'
      };
      req.body = credentials;

      const mockResult = {
        user: { id: '123', email: credentials.email },
        tokens: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token'
        }
      };

      authService.login.mockResolvedValue(mockResult);

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(credentials);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: mockResult.user,
          accessToken: mockResult.tokens.accessToken
        }
      });
    });
  });
});
```

### Testing Services

**tests/unit/services/auth.service.test.js**
```javascript
const authService = require('../../../src/services/auth.service');
const User = require('../../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../../../src/utils/errors');

jest.mock('../../../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      };

      const hashedPassword = 'hashed_password';
      const mockUser = { id: '123', ...userData, passwordHash: hashedPassword };

      User.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock_token');

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(User.create).toHaveBeenCalledWith({
        ...userData,
        passwordHash: hashedPassword
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      const userData = { email: 'existing@example.com' };
      User.findByEmail.mockResolvedValue({ id: '123' });

      // Act & Assert
      await expect(authService.register(userData))
        .rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mockUser = {
        id: '123',
        email: credentials.email,
        passwordHash: 'hashed_password',
        role: 'citizen'
      };

      User.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_token');

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.passwordHash);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw error with invalid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrong_password'
      };

      User.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(credentials))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Testing Models

**tests/unit/models/User.test.js**
```javascript
const User = require('../../../src/models/User');
const db = require('../../../src/config/database');

jest.mock('../../../src/config/database');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      };

      const mockResult = {
        rows: [{ id: '123', ...userData, created_at: new Date() }]
      };

      db.query.mockResolvedValue(mockResult);

      // Act
      const result = await User.create(userData);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          userData.email,
          userData.passwordHash,
          userData.firstName,
          userData.lastName,
          userData.role
        ])
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = { id: '123', email };
      db.query.mockResolvedValue({ rows: [mockUser] });

      // Act
      const result = await User.findByEmail(email);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE email = $1'),
        [email]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await User.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

## Integration Testing

### API Endpoint Testing

**tests/integration/auth.test.js**
```javascript
const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/config/database');

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    // Clean test database
    await db.query('TRUNCATE TABLE users CASCADE');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role
          },
          accessToken: expect.any(String)
        }
      });

      // Verify user was created in database
      const dbUser = await db.query('SELECT * FROM users WHERE email = $1', [userData.email]);
      expect(dbUser.rows).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Arrange - Create user first
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Act - Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'citizen'
        });
    });

    it('should login with valid credentials', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: 'test@example.com'
          },
          accessToken: expect.any(String)
        }
      });

      // Check refresh token cookie
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });
});
```

### Database Integration Testing

**tests/integration/database.test.js**
```javascript
const db = require('../../src/config/database');

describe('Database Integration', () => {
  it('should connect to database', async () => {
    const result = await db.query('SELECT NOW()');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].now).toBeInstanceOf(Date);
  });

  it('should handle transactions', async () => {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insert test data
      await client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
        ['test@example.com', 'hash', 'John', 'Doe', 'citizen']
      );
      
      // Rollback transaction
      await client.query('ROLLBACK');
      
      // Verify data was not saved
      const result = await db.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
      expect(result.rows).toHaveLength(0);
      
    } finally {
      client.release();
    }
  });
});
```

## Security Testing

### Authentication Testing

**tests/security/auth.security.test.js**
```javascript
const request = require('supertest');
const app = require('../../src/server');

describe('Authentication Security', () => {
  describe('Rate Limiting', () => {
    it('should limit registration attempts', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      };

      // Make multiple rapid requests
      const promises = Array(10).fill().map(() =>
        request(app).post('/api/auth/register').send(userData)
      );

      const responses = await Promise.all(promises);
      
      // Should have rate limit responses
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Security', () => {
    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject expired tokens', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('Token expired');
    });
  });
});
```

## Performance Testing

### Load Testing

**tests/performance/load.test.js**
```javascript
const request = require('supertest');
const app = require('../../src/server');

describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const startTime = Date.now();
    
    // Make 50 concurrent requests
    const promises = Array(50).fill().map(() =>
      request(app).get('/api/health')
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
  });

  it('should handle database queries efficiently', async () => {
    // Create test user first
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'citizen'
      });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    const token = loginResponse.body.data.accessToken;
    
    const startTime = Date.now();
    
    // Make database queries
    const promises = Array(20).fill().map(() =>
      request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
    );

    await Promise.all(promises);
    const endTime = Date.now();
    
    // Should complete quickly
    expect(endTime - startTime).toBeLessThan(2000); // 2 seconds
  });
});
```

## Test Scripts

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:security": "jest tests/security",
    "test:performance": "jest tests/performance",
    "test:ci": "jest --coverage --watchAll=false"
  }
}
```

### Running Tests

```cmd
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:security

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.controller.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"
```

## Test Data Management

### Test Fixtures

**tests/fixtures/users.js**
```javascript
module.exports = {
  validUser: {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'citizen'
  },
  
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  
  officialUser: {
    email: 'official@example.com',
    password: 'OfficialPass123!',
    firstName: 'Official',
    lastName: 'User',
    role: 'official'
  }
};
```

### Test Helpers

**tests/helpers/auth.js**
```javascript
const request = require('supertest');
const app = require('../../src/server');

const createUserAndLogin = async (userData) => {
  // Register user
  await request(app)
    .post('/api/auth/register')
    .send(userData);

  // Login user
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: userData.email,
      password: userData.password
    });

  return loginResponse.body.data.accessToken;
};

module.exports = {
  createUserAndLogin
};
```

## Coverage Reports

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Viewing Coverage
```cmd
# Generate coverage report
npm run test:coverage

# Open HTML report
start coverage\lcov-report\index.html
```

## Continuous Integration

### GitHub Actions Workflow

**.github/workflows/test.yml**
```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: nloms_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run migrations
      run: npm run migrate
      env:
        TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/nloms_test
    
    - name: Run tests
      run: npm run test:ci
      env:
        TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/nloms_test
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
```

## Best Practices

### Test Organization
- Group tests by feature/module
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated
- Use proper mocking and stubbing

### Test Data
- Use factories for test data generation
- Clean up test data after each test
- Use separate test database
- Avoid hardcoded values

### Performance
- Run tests in parallel when possible
- Use database transactions for faster cleanup
- Mock external dependencies
- Optimize test database queries

### Maintenance
- Keep tests up to date with code changes
- Refactor tests when refactoring code
- Monitor test coverage trends
- Remove obsolete tests

---

**Last Updated**: June 12, 2025  
**Framework**: Jest 29.x  
**Coverage Target**: 80%
