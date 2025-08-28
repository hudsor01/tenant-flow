#!/bin/bash

# Simple Health Check Script
# Tests that health endpoints are working

set -e

echo "🏥 Testing Health Endpoints..."

# Test backend health (if running)
if curl -s http://localhost:3001/health/ping > /dev/null 2>&1; then
  echo "✅ Backend health endpoint responding"
else
  echo "⚠️  Backend health endpoint not responding (may not be running locally)"
fi

# Test frontend health (if running)  
if curl -s http://localhost:4500/api/auth/health > /dev/null 2>&1; then
  echo "✅ Frontend health endpoint responding"
else
  echo "⚠️  Frontend health endpoint not responding (may not be running locally)"
fi

echo "🎯 Health check complete"