#!/bin/bash
# Railway deployment fix script

echo "🚀 Railway Deployment Fix"

# 1. Update railway.toml for better health checks
cat > railway.toml << 'EOF'
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
startCommand = "cd apps/backend && node dist/main.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5

[deploy.env]
NODE_ENV = "production"
NODE_OPTIONS = "--max-old-space-size=2048"
PORT = "4600"
EOF

echo "✅ Updated railway.toml"

# 2. Create a production-ready Dockerfile
cat > Dockerfile << 'EOF'
FROM node:24-alpine

# Install dependencies for Alpine
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install dependencies
RUN npm ci --only=production --prefer-offline

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build the app
WORKDIR /app
RUN npx turbo run build --filter=@tenantflow/backend...

# Clean dev dependencies
RUN npm prune --production

WORKDIR /app/apps/backend

# Health check with long start period
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=10 \
  CMD curl -f http://localhost:4600/health || exit 1

EXPOSE 4600

# Direct node execution without migrations
CMD ["node", "dist/main.js"]
EOF

echo "✅ Created optimized Dockerfile"

echo "
📝 Next steps:
1. Commit these changes:
   git add railway.toml Dockerfile
   git commit -m 'fix: optimize Railway deployment configuration'
   git push

2. In Railway dashboard, ensure these environment variables are set:
   - DATABASE_URL
   - DIRECT_URL (same as DATABASE_URL)
   - JWT_SECRET
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET

3. Run database migrations separately:
   railway run npx prisma migrate deploy

4. Monitor deployment logs:
   railway logs -f
"