#!/bin/bash

# Deploy Full TenantFlow Project (Frontend + Backend) to Vercel
echo "🚀 Deploying TenantFlow (Frontend + Backend) to Vercel..."

# Build frontend
echo "🏗️ Building frontend..."
npm run build:frontend

# Build backend  
echo "🏗️ Building backend..."
npm run build:backend

# Deploy everything to single Vercel project
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Frontend: https://tenantflow.app"
echo "🔗 API: https://tenantflow.app/api/v1"
echo "🔗 Health Check: https://tenantflow.app/api/v1/health"