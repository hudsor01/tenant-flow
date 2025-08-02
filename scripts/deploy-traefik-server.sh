#!/bin/bash

# Traefik deployment script for TenantFlow backend

set -e

echo "🚀 TenantFlow Backend Deployment with Traefik"
echo "=============================================="

# Configuration
SERVER_IP="192.168.0.177"
SERVER_USER="dev-server"  # Change this to your actual username
SERVER_DIR="/home/dev-server/docker/tenantflow-backend"
DOMAIN="tenantflow.app"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .env.traefik exists
if [ ! -f ".env.traefik" ]; then
    echo -e "${RED}Error: .env.traefik not found!${NC}"
    echo "Please create .env.traefik with your configuration"
    exit 1
fi

# Step 1: Build the Docker image locally
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t tenantflow-backend:latest .

# Step 2: Save the image
echo -e "${YELLOW}Saving Docker image...${NC}"
docker save tenantflow-backend:latest | gzip > tenantflow-backend.tar.gz

# Step 3: Prepare server
echo -e "${YELLOW}Preparing server...${NC}"
ssh $SERVER_USER@$SERVER_IP << EOF
# Create directories
mkdir -p $SERVER_DIR/letsencrypt

# Create Traefik network if it doesn't exist
docker network create traefik-public || true
EOF

# Step 4: Copy files to server
echo -e "${YELLOW}Copying files to server...${NC}"

# Copy Docker image
scp tenantflow-backend.tar.gz $SERVER_USER@$SERVER_IP:$SERVER_DIR/

# Copy docker-compose
scp docker-compose.traefik.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/docker-compose.yml

# Copy environment file
scp .env.traefik $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env

# Step 5: Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/tenantflow

# Load Docker image
echo "Loading Docker image..."
docker load < tenantflow-backend.tar.gz

# Pull Traefik image
docker pull traefik:v3.0

# Stop existing containers
docker-compose down || true

# Start services
docker-compose up -d

# Wait for services to start
sleep 10

# Check status
docker-compose ps

# Show initial logs
echo ""
echo "Traefik logs:"
docker-compose logs traefik --tail=20

echo ""
echo "Backend logs:"
docker-compose logs tenantflow-backend --tail=20

# Clean up
rm tenantflow-backend.tar.gz
EOF

# Clean up local file
rm tenantflow-backend.tar.gz

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services should be accessible at:"
echo "  - API: https://api.$DOMAIN"
echo "  - Traefik Dashboard: https://traefik.$DOMAIN (password protected)"
echo ""
echo "To check logs:"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $SERVER_DIR && docker-compose logs -f'"
echo ""
echo "To update backend only:"
echo "  docker build -t tenantflow-backend:latest ."
echo "  docker save tenantflow-backend:latest | ssh $SERVER_USER@$SERVER_IP 'docker load && cd $SERVER_DIR && docker-compose up -d tenantflow-backend'"
echo ""
echo "Important: Update your DNS records:"
echo "  - api.$DOMAIN → $SERVER_IP (A record)"
echo "  - traefik.$DOMAIN → $SERVER_IP (A record)"