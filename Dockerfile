# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build the React dashboard
FROM base AS dashboard
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/bun.lock ./
RUN bun install --frozen-lockfile
COPY dashboard/ ./
RUN bun run build

# Final production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY index.ts tsconfig.json ./
COPY src ./src
COPY --from=dashboard /app/dashboard/dist ./dashboard/dist

# Create database directory
RUN mkdir -p /app/db && chown bun:bun /app/db

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Run the app
USER bun
ENTRYPOINT ["bun", "run", "index.ts"]
