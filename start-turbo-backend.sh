#!/bin/bash

# Load environment variables
export $(cat /home/dev-server/docker/tenantflow-backend/.env | grep -v '^#' | xargs)

# Change to monorepo root
cd /home/dev-server/docker/tenantflow-backend

# First, build the shared dependencies
echo "Building shared dependencies..."
npm run build --filter=@tenantflow/shared

# Then run the backend in dev mode
echo "Starting backend with Turborepo..."
npx turbo run dev --filter=@tenantflow/backend