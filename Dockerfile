FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# Copy source
COPY . .

# Build frontend assets
RUN npm run build

# Runtime image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install runtime deps (include dev for tsx runtime)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# Copy built client and server code, uploads directory
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/uploads ./uploads

# Expose port
EXPOSE 3001

# Start server (serves API and frontend build)
CMD ["npx", "tsx", "api/server.ts"]
