#!/bin/bash

# Transfer files to Ubuntu server

SERVER_IP="192.168.0.177"
SERVER_USER="dev-server"  # Change this to your actual username
SERVER_DIR="/home/dev-server/docker/tenantflow-backend"

echo "🚀 Transferring files to Ubuntu server"
echo "====================================="

# Method 1: Direct transfer of needed files
echo "Creating directory on server..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR"

echo "Copying Docker and deployment files..."
scp docker-compose.traefik.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/docker-compose.yml
scp .env.traefik $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env
scp scripts/setup-ubuntu-server.sh $SERVER_USER@$SERVER_IP:$SERVER_DIR/

echo "✅ Files transferred!"
echo ""
echo "Now SSH to server and run setup:"
echo "  ssh $SERVER_USER@$SERVER_IP"
echo "  cd $SERVER_DIR"
echo "  chmod +x setup-ubuntu-server.sh"
echo "  ./setup-ubuntu-server.sh"