#!/bin/bash

# Ubuntu server setup script for TenantFlow backend

set -e

echo "🚀 Ubuntu Server Setup for TenantFlow"
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    
    # Remove old versions
    sudo apt remove -y docker docker-engine docker.io containerd runc || true
    
    # Install prerequisites
    sudo apt install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose standalone (for older systems)
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
fi

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 4600/tcp  # Backend (optional, remove if using Traefik only)
sudo ufw --force enable

# Create application directory
echo -e "${YELLOW}Creating application directory...${NC}"
sudo mkdir -p /opt/tenantflow
sudo chown $USER:$USER /opt/tenantflow

# Create Docker network for Traefik
echo -e "${YELLOW}Creating Docker network...${NC}"
docker network create traefik-public || true

# Install useful tools
echo -e "${YELLOW}Installing useful tools...${NC}"
sudo apt install -y \
    htop \
    ncdu \
    jq \
    net-tools \
    apache2-utils  # For htpasswd

# Set up automatic security updates
echo -e "${YELLOW}Configuring automatic security updates...${NC}"
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Docker daemon configuration for better performance
echo -e "${YELLOW}Optimizing Docker configuration...${NC}"
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker

# Create swap file if not exists (helpful for smaller VMs)
if [ ! -f /swapfile ]; then
    echo -e "${YELLOW}Creating 4GB swap file...${NC}"
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo -e "${GREEN}✅ Ubuntu server setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Log out and back in for Docker group changes to take effect"
echo "2. Copy your deployment files to /opt/tenantflow"
echo "3. Run the deployment script"
echo ""
echo "Server info:"
echo "  - Ubuntu version: $(lsb_release -d | cut -f2)"
echo "  - Docker version: $(docker --version)"
echo "  - IP address: $(hostname -I | awk '{print $1}')"