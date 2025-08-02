#!/bin/bash

# Load environment variables
export $(cat /home/dev-server/docker/tenantflow-backend/.env | grep -v '^#' | xargs)

# Change to backend directory
cd /home/dev-server/docker/tenantflow-backend/apps/backend

# Build the app first
echo "Building NestJS app..."
npx nest build

# Start the compiled version
echo "Starting compiled backend..."
node dist/main.js