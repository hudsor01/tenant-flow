#!/bin/bash

# Simple Health Check Script
# Tests that health endpoints are working

set -e

echo "Testing Health Endpoints..."

# Test backend health (if running)
if curl -s http://localhost:3001/health/ping > /dev/null 2>&1; then
  echo "SUCCESS: Backend health endpoint responding"
else
  echo "WARNING:  Backend health endpoint not responding (may not be running locally)"
fi

# Test frontend health (if running)  
if curl -s http://localhost:4500/api/auth/health > /dev/null 2>&1; then
  echo "SUCCESS: Frontend health endpoint responding"
else
  echo "WARNING:  Frontend health endpoint not responding (may not be running locally)"
fi

echo "TARGET: Health check complete"