#!/bin/bash

# Transfer files using scp (simpler but one file at a time)

SERVER_IP="192.168.0.177"
SERVER_USER="dev-server"  # Change this to your actual username
SERVER_DIR="/home/dev-server/docker/tenantflow-backend"

echo "🚀 Copying files to Ubuntu server using scp"
echo "=========================================="

# Create directory first
echo "Creating directory..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_DIR"

# Copy each file
echo "Copying Docker compose..."
scp docker-compose.traefik.yml $SERVER_USER@$SERVER_IP:$SERVER_DIR/docker-compose.yml

echo "Copying environment file..."
scp .env.traefik $SERVER_USER@$SERVER_IP:$SERVER_DIR/.env

echo "Copying Dockerfile..."
scp Dockerfile $SERVER_USER@$SERVER_IP:$SERVER_DIR/

echo "Copying setup script..."
scp scripts/setup-ubuntu-server.sh $SERVER_USER@$SERVER_IP:$SERVER_DIR/

echo "Setting permissions..."
ssh $SERVER_USER@$SERVER_IP "chmod +x $SERVER_DIR/setup-ubuntu-server.sh"

echo "✅ All files copied!"
echo ""
echo "Next steps:"
echo "1. ssh $SERVER_USER@$SERVER_IP"
echo "2. cd $SERVER_DIR"
echo "3. ./setup-ubuntu-server.sh"