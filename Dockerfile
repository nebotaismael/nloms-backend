# Use Node.js 18 LTS Alpine for consistency with production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies for building
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    postgresql-client \
    curl \
    bash \
    tini \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nloms -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application from builder stage
COPY --from=builder --chown=nloms:nodejs /app/src ./src
COPY --from=builder --chown=nloms:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nloms:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nloms:nodejs /app/server.js ./
COPY --from=builder --chown=nloms:nodejs /app/.env.example ./

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nloms:nodejs logs uploads && \
    chmod +x scripts/*.js

# Switch to non-root user
USER nloms

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node src/utils/healthcheck.js || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "server.js"]