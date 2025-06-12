# NLOMS Backend - National Land Ownership Management System

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://docker.com/)
[![Heroku](https://img.shields.io/badge/Heroku-Ready-purple.svg)](https://heroku.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Author:** Nebota Ismael  
> **Date:** June 12, 2025  
> **Version:** 1.0.0

A comprehensive backend system for managing land ownership, registration, and certification processes in Cameroon. Built with Node.js, Express.js, and PostgreSQL.

## 🚀 Features

### Core Functionality
- **User Management**: Multi-role user system (Citizens, Officials, Chiefs, Admins)
- **Land Parcel Management**: Complete land registry with GIS support
- **Application Processing**: Land registration, transfer, and subdivision workflows
- **Digital Certificates**: Blockchain-ready certificate generation with QR codes
- **Document Management**: Secure file upload and verification with Cloudinary
- **Audit System**: Comprehensive activity logging and tracking
- **Notification System**: Real-time notifications for application updates
- **Payment Integration**: Transaction tracking and payment processing

### Security Features
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-based Access Control**: Granular permissions based on user roles
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **Input Validation**: Comprehensive data validation and sanitization
- **Audit Logging**: Complete action tracking for compliance
- **File Security**: Secure document upload with virus scanning

### Technical Features
- **RESTful API**: Well-documented REST endpoints
- **Database Migrations**: Automated schema management
- **Error Handling**: Centralized error management
- **Logging**: Structured logging with Winston
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Docker Support**: Containerized deployment
- **Heroku Ready**: Production deployment configuration

## 🏗️ Architecture

```
NLOMS Backend
├── Authentication Layer (JWT + Role-based)
├── API Layer (Express.js Routes)
├── Business Logic Layer (Controllers)
├── Data Access Layer (Models)
├── Database Layer (PostgreSQL)
└── External Services (Cloudinary, Email)
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm >= 9.0.0
- Docker (optional, for local development)

## 🛠️ Installation

### Option 1: Local Development with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/nebotaismael/nloms-backend.git
   cd nloms-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - API: http://localhost:8080
   - Documentation: http://localhost:8080/api-docs

### Option 2: Manual Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/nebotaismael/nloms-backend.git
   cd nloms-backend
   npm install
   ```

2. **Setup PostgreSQL database**
   ```sql
   CREATE DATABASE nloms_db;
   CREATE USER nloms WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE nloms_db TO nloms;
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## 📚 Complete Documentation

### 📖 Documentation Suite
Our comprehensive documentation covers every aspect of the NLOMS Backend system:

| Document | Description | Link |
|----------|-------------|------|
| **🏠 Overview** | Application overview and quick start | [README.md](README.md) |
| **🔌 API Reference** | Complete API documentation with examples | [docs/API.md](docs/API.md) |
| **🗄️ Database Guide** | Schema, relationships, and optimization | [docs/DATABASE.md](docs/DATABASE.md) |
| **🚀 Deployment Guide** | Local, Docker, Heroku, and production setup | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **🤝 Contributing** | Development guidelines and best practices | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| **🧪 Testing Guide** | Testing strategies and implementation | [docs/TESTING.md](docs/TESTING.md) |
| **⚡ Performance** | Optimization and monitoring guide | [docs/PERFORMANCE.md](docs/PERFORMANCE.md) |
| **🔧 Troubleshooting** | Common issues and solutions | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| **🛡️ Security Policy** | Security guidelines and vulnerability reporting | [docs/SECURITY.md](docs/SECURITY.md) |
| **📝 Changelog** | Version history and release notes | [docs/CHANGELOG.md](docs/CHANGELOG.md) |

### 🎯 Quick Navigation

**For Developers:**
- [🚀 Quick Start](#-installation) - Get started in 5 minutes
- [🔌 API Documentation](docs/API.md) - Complete endpoint reference
- [🗄️ Database Schema](docs/DATABASE.md) - Data structure and relationships
- [🧪 Testing Guide](docs/TESTING.md) - Write and run tests

**For DevOps:**
- [🚀 Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [⚡ Performance Guide](docs/PERFORMANCE.md) - Optimization tips
- [🔧 Troubleshooting](docs/TROUBLESHOOTING.md) - Issue resolution
- [🛡️ Security Guide](docs/SECURITY.md) - Security best practices

**📋 Complete Documentation Index: [docs/README.md](docs/README.md)**

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 8080 |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT token expiration | 24h |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required |

See `.env.example` for complete configuration options.

## 📚 Documentation

### Complete Documentation Suite
Our comprehensive documentation covers every aspect of the NLOMS Backend system:

| Document | Description | Link |
|----------|-------------|------|
| **🏠 Overview** | Application overview and quick start | [README.md](README.md) |
| **🔌 API Reference** | Complete API documentation with examples | [docs/API.md](docs/API.md) |
| **🗄️ Database Guide** | Schema, relationships, and optimization | [docs/DATABASE.md](docs/DATABASE.md) |
| **🚀 Deployment Guide** | Local, Docker, Heroku, and production setup | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **🤝 Contributing** | Development guidelines and best practices | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| **🧪 Testing Guide** | Testing strategies and implementation | [docs/TESTING.md](docs/TESTING.md) |
| **⚡ Performance** | Optimization and monitoring guide | [docs/PERFORMANCE.md](docs/PERFORMANCE.md) |
| **🔧 Troubleshooting** | Common issues and solutions | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| **🛡️ Security Policy** | Security guidelines and vulnerability reporting | [docs/SECURITY.md](docs/SECURITY.md) |
| **📝 Changelog** | Version history and release notes | [docs/CHANGELOG.md](docs/CHANGELOG.md) |

### 📖 Documentation Index
Visit **[docs/README.md](docs/README.md)** for a complete documentation index with quick navigation guides.

### 🔌 API Quick Reference

#### Base URLs
- **Development**: http://localhost:8080/api
- **Production**: https://nloms-backend-e20d376292bc.herokuapp.com/api
- **Interactive Docs**: Visit `/api-docs` for Swagger documentation

#### Core Endpoints
```
Authentication    POST   /auth/register          User registration
                 POST   /auth/login             User login
                 POST   /auth/refresh           Refresh JWT token
                 GET    /auth/profile           Get user profile

Users            GET    /users                  List users (Admin only)
                 GET    /users/:id              Get user details
                 PUT    /users/:id              Update user

Land Management  POST   /land/parcels           Create land parcel
                 GET    /land/parcels           Search land parcels
                 GET    /land/parcels/:id       Get parcel details

Applications     POST   /applications           Submit application
                 GET    /applications           Get applications
                 PUT    /applications/:id       Update application

Admin            GET    /admin/dashboard        Admin dashboard
                 GET    /admin/reports          System reports
                 POST   /admin/backup           Create backup
```

**📋 For complete API documentation with request/response examples, authentication, and error codes, see [docs/API.md](docs/API.md)**

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and profiles
- **land_parcels**: Land registry with GIS data
- **land_registrations**: Application workflows
- **certificates**: Digital land certificates
- **documents**: File management system
- **audit_logs**: System activity tracking
- **notifications**: User notifications
- **payment_transactions**: Payment processing

### Key Features
- **UUID Support**: All entities have UUID for external references
- **Audit Trail**: Complete change tracking
- **Soft Deletes**: Data preservation for compliance
- **Full-Text Search**: Advanced search capabilities
- **GIS Support**: Coordinate and boundary management

## 🚀 Deployment

### Heroku Deployment

1. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Add PostgreSQL addon**
   ```bash
   heroku addons:create heroku-postgresql:essential-0
   ```

3. **Set environment variables**
   ```bash
   # Use the provided set-heroku-env.bat script
   ./set-heroku-env.bat
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Docker Deployment

```bash
# Build image
docker build -t nloms-backend .

# Run container
docker run -p 8080:8080 --env-file .env nloms-backend
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔍 Monitoring & Logging

### Log Levels
- **debug**: Detailed information for diagnosing problems
- **info**: General information about system operation
- **warn**: Warning messages for potential issues
- **error**: Error events that might still allow the application to continue
- **critical**: Critical conditions that require immediate attention

### Log Files
- `logs/combined.log`: All log levels
- `logs/error.log`: Error level and above

### Health Check
Visit `/health` for system status information.

## 🛡️ Security

### Authentication
- JWT tokens with configurable expiration
- Refresh token rotation
- Password hashing with bcrypt (12 rounds)

### Authorization
- Role-based access control (RBAC)
- Route-level permission checks
- Resource-level access validation

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Nebota Ismael** - *Initial work* - [GitHub](https://github.com/nebotaismael)

## 🙏 Acknowledgments

- Government of Cameroon for the project initiative
- Open source community for the excellent tools and libraries
- All contributors who help improve this system

## 📞 Support

For support, email nebota.ismael@example.com or create an issue in the GitHub repository.

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

---

**Made with ❤️ for the people of Cameroon** 
