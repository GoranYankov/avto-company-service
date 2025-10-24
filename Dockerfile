# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev for nodemon)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/api/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use npm run start for production, npm run dev for development
CMD ["npm", "run", "dev"]
