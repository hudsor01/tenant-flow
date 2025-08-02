#!/bin/bash

# Load environment variables
export $(cat /home/dev-server/docker/tenantflow-backend/.env | grep -v '^#' | xargs)

# Change to backend directory
cd /home/dev-server/docker/tenantflow-backend/apps/backend

# Start the backend with tsx
echo "Starting TenantFlow backend..."
exec tsx src/main.ts