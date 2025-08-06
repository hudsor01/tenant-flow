# syntax=docker/dockerfile:1.6

# Single-stage production build since Railway handles the build complexity
FROM node:22-slim AS production

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y tini ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Copy the built application (Railway's build process handles this)
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Railway manages the port via $PORT
EXPOSE $PORT

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use tini for signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "apps/backend/dist/apps/backend/src/main.js"]
