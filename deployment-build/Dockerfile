FROM node:22-alpine

# Install dumb-init
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy everything
COPY . .

# Install only production dependencies
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
