# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nloms -u 1001

WORKDIR /app

# Copy built node modules from builder stage
COPY --from=builder --chown=nloms:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nloms:nodejs . .

# Create uploads directory
RUN mkdir -p uploads && chown nloms:nodejs uploads

# Switch to non-root user
USER nloms

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/utils/healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]