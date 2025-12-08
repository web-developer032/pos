# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy config files first (changes less often)
COPY package.json pnpm-lock.yaml* tsconfig.json next.config.js postcss.config.js tailwind.config.ts ./

# Copy source files (separate layers for better caching)
COPY lib ./lib
COPY app ./app
COPY components ./components
COPY scripts ./scripts
COPY instrumentation.ts ./

# Create public directory (may not exist)
RUN mkdir -p ./public

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build with cache mount for Next.js cache
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory from builder (will be empty if it doesn't exist, which is fine)
COPY --from=builder /app/public ./public

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy necessary files for database initialization
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml* ./pnpm-lock.yaml
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install production dependencies with cache mount
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Install tsx and typescript globally for database initialization (using npm for global installs)
RUN npm install -g tsx typescript

# Create default database directory and initialize default database (as root before switching user)
# Store default database outside the mounted volume path so it's accessible at runtime
RUN mkdir -p /app/data/db-default && \
    mkdir -p /app/data/db/temp && \
    (DATABASE_URL=file:///app/data/db/temp/local.db tsx scripts/init-db.ts || true) && \
    if [ -f /app/data/db/temp/local.db ]; then \
      cp /app/data/db/temp/local.db /app/data/db-default/local.db && \
      rm -rf /app/data/db/temp && \
      echo "Default database created successfully"; \
    else \
      echo "Warning: Default database creation may have failed"; \
    fi

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh

# Create data directory for database with proper permissions
RUN mkdir -p /app/data/db && \
    mkdir -p /app/data/db-default && \
    chown -R nextjs:nodejs /app/data

# Set correct permissions (including node_modules)
RUN chown -R nextjs:nodejs /app && chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]

