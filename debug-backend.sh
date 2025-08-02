#!/bin/bash

# Load environment variables
export $(cat /home/dev-server/docker/tenantflow-backend/.env | grep -v '^#' | xargs)

# Add debug mode
export DEBUG=*
export NODE_ENV=development

# Change to backend directory
cd /home/dev-server/docker/tenantflow-backend/apps/backend

# Start the backend with tsx
echo "Starting TenantFlow backend with debug..."
exec tsx --inspect=0.0.0.0:9229 src/main.ts