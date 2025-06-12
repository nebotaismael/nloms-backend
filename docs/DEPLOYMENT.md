# Deployment Guide

## Overview

This guide covers deployment options for the NLOMS backend application, including local development, Docker, and production deployment on Heroku.

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm >= 9.0.0
- Git
- Docker (optional)
- Heroku CLI (for Heroku deployment)

## Local Development

### Option 1: Docker Compose (Recommended)

The easiest way to run the application locally with all dependencies.

1. **Clone the repository**
   ```bash
   git clone https://github.com/nebotaismael/nloms-backend.git
   cd nloms-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Verify services are running**
   ```bash
   docker-compose ps
   ```

5. **View logs**
   ```bash
   docker-compose logs -f app
   ```

6. **Access the application**
   - API: http://localhost:8080
   - API Documentation: http://localhost:8080/api-docs
   - Health Check: http://localhost:8080/health

7. **Stop services**
   ```bash
   docker-compose down
   ```

### Option 2: Manual Setup

For development without Docker.

1. **Clone and install**
   ```bash
   git clone https://github.com/nebotaismael/nloms-backend.git
   cd nloms-backend
   npm install
   ```

2. **Setup PostgreSQL database**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database and user
   CREATE DATABASE nloms_db;
   CREATE USER nloms WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE nloms_db TO nloms;
   \q
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your local configuration:
   ```env
   NODE_ENV=development
   PORT=8080
   DATABASE_URL=postgresql://nloms:your_secure_password@localhost:5432/nloms_db
   JWT_SECRET=your-super-secret-jwt-key-for-development-only
   # ... other variables
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Production Deployment

### Heroku Deployment

#### Prerequisites
- Heroku account
- Heroku CLI installed and logged in
- Git repository

#### Step-by-Step Deployment

1. **Create Heroku application**
   ```bash
   heroku create your-app-name
   ```

2. **Add PostgreSQL addon**
   ```bash
   heroku addons:create heroku-postgresql:essential-0 -a your-app-name
   ```

3. **Set environment variables**
   
   Use the provided script:
   ```bash
   # Edit set-heroku-env.bat with your app name
   # Then run:
   ./set-heroku-env.bat
   ```
   
   Or set manually:
   ```bash
   heroku config:set NODE_ENV=production -a your-app-name
   heroku config:set JWT_SECRET=your-production-jwt-secret -a your-app-name
   heroku config:set JWT_EXPIRES_IN=24h -a your-app-name
   # ... other variables
   ```

4. **Deploy the application**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

5. **Verify deployment**
   ```bash
   heroku logs --tail -a your-app-name
   heroku open -a your-app-name
   ```

6. **Check database migration**
   ```bash
   # The migration should run automatically during deployment
   # Check logs to verify successful migration
   heroku logs --tail -a your-app-name | grep -i migration
   ```

#### Heroku Configuration Files

**heroku.yml** - Container deployment configuration:
```yaml
setup:
  addons:
    - plan: heroku-postgresql:essential-0
  config:
    NODE_ENV: production
    NPM_CONFIG_PRODUCTION: true

build:
  docker:
    web: Dockerfile

release:
  command:
    - node scripts/migrate.js
  image: web

run:
  web: node src/server.js
```

**Dockerfile** - Container configuration:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "src/server.js"]
```

### Alternative Cloud Providers

#### AWS Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize application**
   ```bash
   eb init
   ```

3. **Create environment**
   ```bash
   eb create production
   ```

4. **Deploy**
   ```bash
   eb deploy
   ```

#### Google Cloud Platform

1. **Setup gcloud CLI**
   ```bash
   gcloud init
   ```

2. **Deploy to App Engine**
   ```bash
   gcloud app deploy
   ```

#### DigitalOcean App Platform

1. **Create app.yaml**
   ```yaml
   name: nloms-backend
   services:
   - name: api
     source_dir: /
     github:
       repo: your-username/nloms-backend
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
   databases:
   - name: nloms-db
     engine: PG
     version: "13"
   ```

## Docker Deployment

### Building Docker Image

1. **Build the image**
   ```bash
   docker build -t nloms-backend .
   ```

2. **Run container**
   ```bash
   docker run -d \
     --name nloms-backend \
     -p 8080:8080 \
     --env-file .env \
     nloms-backend
   ```

3. **View logs**
   ```bash
   docker logs -f nloms-backend
   ```

### Docker Compose Production

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=nloms_db
      - POSTGRES_USER=nloms
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment type | development | No |
| `PORT` | Server port | 8080 | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | 24h | No |
| `JWT_REFRESH_SECRET` | Refresh token secret | - | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - | Yes |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | - |
| `SMTP_HOST` | Email SMTP host | smtp.gmail.com |
| `SMTP_PORT` | Email SMTP port | 587 |
| `SMTP_USER` | Email username | - |
| `SMTP_PASS` | Email password | - |
| `LOG_LEVEL` | Logging level | info |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | 100 |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |

## SSL/HTTPS Configuration

### Let's Encrypt with Certbot

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Manual SSL Setup

1. **Obtain SSL certificates**
2. **Configure nginx or load balancer**
3. **Update environment variables**
   ```env
   HTTPS=true
   SSL_CERT_PATH=/path/to/cert.pem
   SSL_KEY_PATH=/path/to/key.pem
   ```

## Monitoring and Health Checks

### Health Check Endpoint

The application provides a health check endpoint at `/health`:

```json
{
  "status": "OK",
  "timestamp": "2025-06-12T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Application Monitoring

#### Heroku
```bash
# View logs
heroku logs --tail -a your-app-name

# Monitor dyno status
heroku ps -a your-app-name

# View metrics
heroku addons:create librato:development -a your-app-name
```

#### Docker
```bash
# Container status
docker stats nloms-backend

# Container logs
docker logs -f nloms-backend

# Container health
docker inspect nloms-backend --format='{{.State.Health.Status}}'
```

## Database Migrations

### Automatic Migrations

Migrations run automatically during deployment through the `release` phase in `heroku.yml`.

### Manual Migration

```bash
# Production (Heroku)
heroku run npm run migrate -a your-app-name

# Local/Docker
npm run migrate
```

### Migration Rollback

Currently, rollbacks must be done manually:

1. **Create rollback SQL**
2. **Apply via psql**
   ```bash
   heroku pg:psql -a your-app-name < rollback.sql
   ```

## Backup and Recovery

### Automated Backups (Heroku)

```bash
# Create manual backup
heroku pg:backups:capture -a your-app-name

# List backups
heroku pg:backups -a your-app-name

# Download backup
heroku pg:backups:download b001 -a your-app-name
```

### Manual Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore backup
psql $DATABASE_URL < backup-file.sql
```

## Scaling

### Heroku Scaling

```bash
# Scale dynos
heroku ps:scale web=2 -a your-app-name

# Upgrade database
heroku addons:upgrade postgresql-database-name:standard-0 -a your-app-name
```

### Load Balancing

For high-traffic deployments:

1. **Setup multiple instances**
2. **Configure load balancer (nginx, AWS ALB, etc.)**
3. **Implement session management (Redis)**
4. **Database connection pooling**

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
heroku pg:info -a your-app-name

# Check connection
heroku run node -e "require('./src/config/database').testConnection()" -a your-app-name
```

#### Memory Issues
```bash
# Check memory usage
heroku logs --tail -a your-app-name | grep -i memory

# Upgrade dyno type
heroku ps:type standard-1x -a your-app-name
```

#### SSL/HTTPS Issues
```bash
# Check certificate status
heroku certs:info -a your-app-name

# Check domain configuration
heroku domains -a your-app-name
```

### Log Analysis

```bash
# Search for errors
heroku logs --tail -a your-app-name | grep -i error

# Filter by timestamp
heroku logs --since="1 hour ago" -a your-app-name

# Monitor specific process
heroku logs --ps web.1 -a your-app-name
```

## Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Enable security headers (Helmet.js)
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] Audit logging enabled
- [ ] Backup and recovery tested

### Environment Secrets

Never commit secrets to version control:

```bash
# Use environment variables
heroku config:set SECRET_KEY=value -a your-app-name

# Use .env files (local only)
echo ".env" >> .gitignore

# Use secret management services
# - AWS Secrets Manager
# - Google Secret Manager
# - Azure Key Vault
```

## Performance Optimization

### Database Performance
- Connection pooling configured
- Proper indexing
- Query optimization
- Regular VACUUM and ANALYZE

### Application Performance
- Enable compression
- Optimize middleware order
- Use caching (Redis)
- Minimize dependencies

### Monitoring Performance
- Response time monitoring
- Database query analysis
- Memory usage tracking
- Error rate monitoring

## Support and Maintenance

### Regular Maintenance Tasks

1. **Monitor application logs**
2. **Check database performance**
3. **Update dependencies**
4. **Verify backups**
5. **Security updates**
6. **Performance analysis**

### Getting Support

- **Documentation**: Check this guide and API docs
- **Logs**: Always include relevant log output
- **Environment**: Specify deployment environment
- **Error Messages**: Include complete error messages
- **Steps to Reproduce**: Provide clear reproduction steps

### Emergency Procedures

1. **Application Down**
   - Check dyno status
   - Review recent deployments
   - Check external dependencies

2. **Database Issues**
   - Verify connection
   - Check backup status
   - Monitor query performance

3. **Security Incident**
   - Revoke compromised credentials
   - Review audit logs
   - Update security measures
