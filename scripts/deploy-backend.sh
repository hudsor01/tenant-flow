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
echo "🔗 Backend: https://tenantflow.app/backend"
echo "💡 To set up custom domain api.tenantflow.app:"
echo "   1. Go to Vercel Dashboard → tenantflow project"
echo "   2. Go to Settings > Domains"  
echo "   3. Add 'api.tenantflow.app' as custom domain"
echo "   4. Configure routing: api.tenantflow.app/* → /backend/*"