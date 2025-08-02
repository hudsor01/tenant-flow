#!/bin/bash

# Test local deployment
cd /Users/richard/Developer/tenant-flow

echo "🧪 Testing TenantFlow Backend Local Deployment"
echo "============================================="

# Start container
echo "Starting container..."
docker run -d \
  --name tenantflow-test \
  -p 3000:3000 \
  --env-file /Users/richard/Developer/tenant-flow/deployment-build/.env \
  tenantflow-backend:latest

# Wait for startup
echo "Waiting for startup..."
sleep 10

# Test health endpoint
echo "Testing health endpoint..."
curl -f http://localhost:3000/health || echo "Health check failed"

# Show logs
echo ""
echo "Container logs:"
docker logs tenantflow-test

# Cleanup
echo ""
echo "Cleaning up..."
docker stop tenantflow-test
docker rm tenantflow-test

echo "✅ Test complete"