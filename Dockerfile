FROM node:20-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --verbose

# Copy source
COPY . .

# Build frontend assets
RUN npm run build

# Runtime image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* .npmrc* ./

# Install production dependencies only
RUN npm ci --omit=dev --verbose

# Copy built client and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api

# Create uploads directory if it doesn't exist
RUN mkdir -p ./uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server (serves API and frontend build)
CMD ["npx", "tsx", "api/server.ts"]
