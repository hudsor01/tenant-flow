#!/bin/bash

# Sync files to Ubuntu server using rsync

SERVER_IP="192.168.0.177"
SERVER_USER="dev-server"  # Change this to your actual username
SERVER_DIR="/home/dev-server/docker/tenantflow-backend"

echo "🚀 Syncing files to Ubuntu server using rsync"
echo "============================================="

# Create directory on server first
echo "Creating directory on server..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR"

# Method 1: Rsync only needed files (FASTEST)
echo "Syncing essential files..."
rsync -avz --progress \
  docker-compose.traefik.yml \
  .env.traefik \
  Dockerfile \
  scripts/setup-ubuntu-server.sh \
  $SERVER_USER@$SERVER_IP:$SERVER_DIR/

# Rename docker-compose file on server
ssh $SERVER_USER@$SERVER_IP "cd $SERVER_DIR && mv docker-compose.traefik.yml docker-compose.yml && mv .env.traefik .env"

echo "✅ Files synced!"
echo ""
echo "Now SSH to server and run:"
echo "  ssh $SERVER_USER@$SERVER_IP"
echo "  cd $SERVER_DIR"
echo "  chmod +x setup-ubuntu-server.sh"
echo "  ./setup-ubuntu-server.sh"