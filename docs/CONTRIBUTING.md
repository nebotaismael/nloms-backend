# Contributing to NLOMS Backend

Thank you for considering contributing to the National Land Ownership Management System (NLOMS) Backend! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Security Considerations](#security-considerations)
- [Performance Guidelines](#performance-guidelines)

## Code of Conduct

This project follows a professional code of conduct. We expect all contributors to:

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment
- Follow security best practices
- Respect intellectual property rights

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15+ or Docker
- Git
- Code editor with ESLint support

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/nloms-backend.git
   cd nloms-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Database Setup**
   ```bash
   # Option 1: Local PostgreSQL
   createdb nloms_dev
   npm run migrate
   
   # Option 2: Docker
   docker-compose up -d postgres
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Feature development
- `hotfix/issue-description` - Critical bug fixes

### Feature Development Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Test**
   - Write code following our standards
   - Add/update tests
   - Update documentation
   - Test locally

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

## Coding Standards

### JavaScript/Node.js Standards

#### Code Style
- Use ESLint configuration (`.eslintrc.js`)
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in objects/arrays

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userName = 'john_doe';
function getUserData() {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// Classes: PascalCase
class UserController {}

// Files: kebab-case
user-controller.js
auth-middleware.js

// Database: snake_case
table_name, column_name
```

#### Function Structure
```javascript
/**
 * Brief description of function
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @throws {Error} When condition occurs
 */
async function exampleFunction(paramName) {
  try {
    // Implementation
    return result;
  } catch (error) {
    logger.error('Function failed:', error);
    throw new AppError('User-friendly message', 500);
  }
}
```

### API Development Standards

#### Route Structure
```javascript
// routes/users.js
router.get('/:id', 
  validateObjectId('id'),
  authorize(['admin', 'user']),
  userController.getUser
);
```

#### Controller Pattern
```javascript
// controllers/userController.js
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};
```

#### Service Layer Pattern
```javascript
// services/userService.js
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};
```

### Database Standards

#### Query Patterns
```javascript
// Use parameterized queries
const query = 'SELECT * FROM users WHERE id = $1 AND role = $2';
const values = [userId, userRole];
const result = await db.query(query, values);

// Use transactions for multi-step operations
const client = await db.getClient();
try {
  await client.query('BEGIN');
  await client.query(query1, values1);
  await client.query(query2, values2);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

#### Migration Standards
```sql
-- migrations/001_create_users.sql
-- Clear descriptive comments
-- Up migration
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);

-- Down migration (commented)
-- DROP TABLE IF EXISTS users;
```

## Testing Guidelines

### Test Structure
```javascript
// tests/unit/userService.test.js
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when ID exists', async () => {
      // Arrange
      const userId = 'test-id';
      const expectedUser = { id: userId, name: 'Test User' };
      
      // Act
      const result = await userService.getUserById(userId);
      
      // Assert
      expect(result).toEqual(expectedUser);
    });
    
    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      
      // Act & Assert
      await expect(userService.getUserById(userId))
        .rejects.toThrow('User not found');
    });
  });
});
```

### Test Coverage Requirements
- Unit tests: 80% minimum coverage
- Integration tests for API endpoints
- Database tests for complex queries
- Security tests for authentication flows

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- userService.test.js

# Run tests in watch mode
npm run test:watch
```

## Documentation Standards

### Code Documentation
- JSDoc comments for all functions
- README updates for new features
- API documentation updates
- Database schema documentation

### API Documentation
```javascript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 */
```

## Commit Message Guidelines

### Format
```
type(scope): subject

body

footer
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(auth): add refresh token functionality

Add support for JWT refresh tokens to improve security
and user experience. Users can now stay logged in longer
without compromising security.

Closes #123
```

```bash
fix(database): resolve connection pool exhaustion

Fix issue where database connections weren't being properly
released, causing the application to hang under high load.

Fixes #456
```

## Pull Request Process

### PR Requirements
1. **Branch up to date** with target branch
2. **All tests pass** locally
3. **Code review** by at least one maintainer
4. **Documentation** updated if needed
5. **No merge conflicts**

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
```

### Review Process
1. Automated checks (linting, tests)
2. Code review by maintainer
3. Address feedback
4. Final approval and merge

## Security Considerations

### Security Best Practices
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Use parameterized queries
- Implement proper authentication/authorization
- Keep dependencies updated

### Security Testing
- Test authentication flows
- Validate input sanitization
- Check for SQL injection vulnerabilities
- Test rate limiting
- Verify access controls

### Reporting Security Issues
Email security issues privately to: security@nloms.com

## Performance Guidelines

### Code Performance
- Use async/await properly
- Implement database query optimization
- Use connection pooling
- Cache frequently accessed data
- Monitor memory usage

### Database Performance
- Add appropriate indexes
- Optimize query patterns
- Use transactions appropriately
- Monitor query performance
- Implement pagination for large datasets

## Getting Help

### Resources
- [API Documentation](./API.md)
- [Database Documentation](./DATABASE.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Contact
- GitHub Issues for bugs and features
- Email: nebota.ismael@example.com
- Project maintainer: Nebota Ismael

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- README.md contributors section
- GitHub contributors page

Thank you for contributing to NLOMS Backend! 🎉
