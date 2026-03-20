# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app

# Install pnpm and build dependencies
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN apk add --no-cache python3 make g++

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma:generate

# Build the application
RUN pnpm build

# Remove dev dependencies
RUN pnpm prune --prod

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nodejs:nodejs /app/apps/api/prisma ./prisma

# Copy package.json for scripts
COPY --from=build --chown=nodejs:nodejs /app/apps/api/package.json ./package.json

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Copy entrypoint script
COPY --chown=nodejs:nodejs docker/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Install PostgreSQL client for health checks in entrypoint
USER root
RUN apk add --no-cache postgresql-client
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/main"]