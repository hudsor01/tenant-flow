#!/bin/bash

# Local server deployment script for TenantFlow backend

set -e

echo "🚀 TenantFlow Backend Local Server Deployment"
echo "============================================="

# Configuration
SERVER_IP="192.168.1.100"  # Change this to your server's IP
SERVER_USER="root"          # Change this to your server's username
SERVER_DIR="/opt/tenantflow"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Build the Docker image locally
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t tenantflow-backend:latest .

# Step 2: Save the image
echo -e "${YELLOW}Saving Docker image...${NC}"
docker save tenantflow-backend:latest | gzip > tenantflow-backend.tar.gz

# Step 3: Copy files to server
echo -e "${YELLOW}Copying files to server...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR"

# Copy Docker image
scp tenantflow-backend.tar.gz $SERVER_USER@$SERVER_IP:$SERVER_DIR/

# Copy docker-compose and nginx config
scp docker-compose.local.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/docker-compose.yml
scp nginx.conf $SERVER_USER@$SERVER_IP:$SERVER_DIR/

# Copy .env file (make sure it exists!)
if [ -f ".env.production" ]; then
    scp .env.production $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env
else
    echo -e "${RED}Warning: .env.production not found. Create it from .env.example${NC}"
fi

# Step 4: Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/tenantflow

# Load Docker image
echo "Loading Docker image..."
docker load < tenantflow-backend.tar.gz

# Stop existing containers
docker-compose down

# Start new containers
docker-compose up -d

# Check status
docker-compose ps

# Show logs
echo "Recent logs:"
docker-compose logs --tail=50

# Clean up
rm tenantflow-backend.tar.gz
EOF

# Clean up local file
rm tenantflow-backend.tar.gz

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Backend should be accessible at:"
echo "  - HTTP: http://$SERVER_IP:4600"
echo "  - HTTPS: https://$SERVER_IP (if nginx is configured)"
echo ""
echo "To check logs on server:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_DIR && docker-compose logs -f'"
echo ""
echo "To restart services:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_DIR && docker-compose restart'"