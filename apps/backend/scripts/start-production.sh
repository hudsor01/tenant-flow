#!/bin/sh
# Production startup script with better error handling and logging

echo "🚀 Starting TenantFlow Backend..."
echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Check critical environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set!"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ ERROR: JWT_SECRET is not set!"
    exit 1
fi

echo "✅ DATABASE_URL is configured (${DATABASE_URL:0:15}...)"
echo "✅ JWT_SECRET is configured"

# Run Prisma migrations
echo "📦 Running database migrations..."
if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed!"
    exit 1
fi

# Start the application
echo "🎯 Starting NestJS application..."
exec node dist/main.js