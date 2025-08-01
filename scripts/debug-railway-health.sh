#!/bin/bash

echo "🚂 Railway Health Check Debug"
echo "============================"

# Test the health endpoint
echo "Testing health endpoint..."
curl -v https://llvy9r08.up.railway.app/health 2>&1 | head -20

echo -e "\n\nTesting simple health endpoint..."
curl -v https://llvy9r08.up.railway.app/health/simple 2>&1 | head -20

echo -e "\n\nTesting root endpoint..."
curl -v https://llvy9r08.up.railway.app/ 2>&1 | head -20

echo -e "\n\n📋 Next Steps:"
echo "1. Check Railway dashboard logs for startup errors"
echo "2. Look for missing environment variables"
echo "3. Check if database connection is working"
echo "4. Verify NestJS app is binding to port 4600"
echo "5. Check if health endpoints are registered correctly"