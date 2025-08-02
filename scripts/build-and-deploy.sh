#!/bin/bash

# Build and deploy script for TenantFlow backend

set -e

echo "🚀 TenantFlow Backend Build & Deploy"
echo "===================================="

# Configuration
SERVER_IP="192.168.0.177"
SERVER_USER="dev-server"
SERVER_DIR="/home/dev-server/docker/tenantflow-backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Build shared package
echo -e "${YELLOW}Building shared package...${NC}"
cd packages/shared
npm run build
cd ../..

# Step 2: Build backend using standard TypeScript compilation
echo -e "${YELLOW}Building backend with TypeScript...${NC}"
cd apps/backend

# Generate Prisma client
npx prisma generate

# Build with TypeScript directly
npx tsc --build tsconfig.build.json

cd ../..

# Step 3: Copy production env
echo -e "${YELLOW}Copying production environment...${NC}"
cp apps/backend/.env.production apps/backend/.env

# Step 4: Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -f Dockerfile.simple -t tenantflow-backend:latest .

# Step 5: Save and transfer image
echo -e "${YELLOW}Saving Docker image...${NC}"
docker save tenantflow-backend:latest | gzip > tenantflow-backend.tar.gz

# Step 6: Transfer to server
echo -e "${YELLOW}Transferring to server...${NC}"
scp tenantflow-backend.tar.gz $SERVER_USER@$SERVER_IP:$SERVER_DIR/
scp docker-compose.traefik.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/docker-compose.yml
scp .env.traefik $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env

# Step 7: Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /home/dev-server/docker/tenantflow-backend

# Load Docker image
echo "Loading Docker image..."
docker load < tenantflow-backend.tar.gz

# Start services
docker-compose down || true
docker-compose up -d

# Show logs
sleep 5
docker-compose logs --tail=50

# Cleanup
rm tenantflow-backend.tar.gz
EOF

# Cleanup local
rm tenantflow-backend.tar.gz

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services should be accessible at:"
echo "  - API: https://api.tenantflow.app"
echo "  - Traefik Dashboard: https://traefik.tenantflow.app"