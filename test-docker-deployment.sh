#!/bin/bash

# Test Docker deployment locally to debug Railway issues
# This script mimics Railway's deployment process

set -e  # Exit on error

echo "🚀 Testing Docker deployment (Railway simulation)"
echo "=============================================="

# Clean up any existing containers/images
echo "🧹 Cleaning up old containers..."
docker stop tenantflow-test 2>/dev/null || true
docker rm tenantflow-test 2>/dev/null || true

# Build the Docker image exactly as Railway would
echo "🔨 Building Docker image..."
echo "Using Dockerfile from: $(pwd)/Dockerfile"

# Set build-time environment variables similar to Railway
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Build with detailed output
docker build \
  --no-cache \
  --progress=plain \
  -t tenantflow-backend-test \
  -f Dockerfile \
  . 2>&1 | tee docker-build.log

if [ $? -ne 0 ]; then
  echo "❌ Docker build failed!"
  echo "Check docker-build.log for details"
  exit 1
fi

echo "✅ Docker build successful!"

# Now run the container with Railway-like environment
echo "🏃 Running container with Railway environment..."

# Create a test env file with Railway-like variables
cat > .env.docker-test << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=${DATABASE_URL}
DIRECT_URL=${DIRECT_URL}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
JWT_SECRET=${JWT_SECRET}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
RESEND_API_KEY=${RESEND_API_KEY}
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
RAILWAY_ENVIRONMENT=production
RAILWAY_SERVICE_NAME=tenantflow-backend
EOF

# Run container with Railway-like settings
docker run \
  --name tenantflow-test \
  -p 3000:3000 \
  --env-file .env.docker-test \
  --add-host=host.docker.internal:host-gateway \
  -e DOCKER_CONTAINER=true \
  tenantflow-backend-test 2>&1 | tee docker-run.log &

# Wait for container to start
echo "⏳ Waiting for container to start (30 seconds)..."
sleep 30

# Check if container is still running
if docker ps | grep -q tenantflow-test; then
  echo "✅ Container is running!"
  
  # Test health endpoint
  echo "🏥 Testing health endpoint..."
  curl -f http://localhost:3000/health || echo "❌ Health check failed"
  
  # Show logs
  echo "📝 Container logs:"
  docker logs tenantflow-test --tail 50
else
  echo "❌ Container stopped!"
  echo "📝 Container logs:"
  docker logs tenantflow-test
  
  # Get exit code
  EXIT_CODE=$(docker inspect tenantflow-test --format='{{.State.ExitCode}}')
  echo "Exit code: $EXIT_CODE"
  
  if [ "$EXIT_CODE" = "137" ]; then
    echo "⚠️ Container was killed (likely OOM - out of memory)"
    echo "This matches Railway's 1GB memory limit issue"
  fi
fi

# Cleanup
echo "🧹 Cleaning up test environment..."
docker stop tenantflow-test 2>/dev/null || true
docker rm tenantflow-test 2>/dev/null || true
rm -f .env.docker-test

echo "✅ Test complete!"
echo "Check docker-build.log and docker-run.log for details"