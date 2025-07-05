#!/bin/bash

# Server Migration Script for TenantFlow
# Transfers Docker stack to server and provides migration instructions

SERVER_IP="192.168.0.177"  # Update with your actual server IP
SERVER_USER="your-username"  # Update with your server username
SERVER_PATH="/opt/tenantflow"  # Path on server where stack will be deployed

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🚀 TenantFlow Server Migration"
echo "=============================="

# Check if server details are configured
if [ "$SERVER_IP" = "192.168.0.177" ] || [ "$SERVER_USER" = "your-username" ]; then
    print_warning "Please update SERVER_IP and SERVER_USER in this script first!"
    echo "Edit the variables at the top of this file:"
    echo "  SERVER_IP=\"your.server.ip.address\""
    echo "  SERVER_USER=\"your-ssh-username\""
    exit 1
fi

print_status "Preparing files for server deployment..."

# Create server-specific environment file
cp .env.complete .env.server
sed -i "s/192.168.0.177/$SERVER_IP/g" .env.server

print_status "Creating deployment package..."

# Create temporary deployment directory
DEPLOY_DIR="./server-deploy-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
cp docker-compose-complete.yml "$DEPLOY_DIR/"
cp .env.server "$DEPLOY_DIR/.env"
cp docker-stack-manager.sh "$DEPLOY_DIR/"
cp DEPLOYMENT-GUIDE.md "$DEPLOY_DIR/"
cp listmonk-config.toml "$DEPLOY_DIR/"
cp -r init-scripts "$DEPLOY_DIR/"

# Update listmonk config for server
sed -i "s/192.168.0.177/$SERVER_IP/g" "$DEPLOY_DIR/listmonk-config.toml"

print_success "Deployment package created: $DEPLOY_DIR"

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. EXPORT YOUR n8n WORKFLOWS (do this now!):"
echo "   - Access: http://localhost:5678"
echo "   - For each workflow: ... menu → Download"
echo "   - Save all 14 JSON files"
echo ""
echo "2. TRANSFER FILES TO SERVER:"
echo "   ssh $SERVER_USER@$SERVER_IP 'sudo mkdir -p $SERVER_PATH && sudo chown \$USER:$SERVER_USER $SERVER_PATH'"
echo "   scp -r $DEPLOY_DIR/* $SERVER_USER@$SERVER_IP:$SERVER_PATH/"
echo ""
echo "3. SSH TO SERVER AND DEPLOY:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   cd $SERVER_PATH"
echo "   chmod +x docker-stack-manager.sh"
echo "   ./docker-stack-manager.sh start"
echo ""
echo "4. ACCESS SERVER n8n FROM LOCAL MACHINE:"
echo "   Open browser: http://$SERVER_IP:5678"
echo ""
echo "5. IMPORT WORKFLOWS:"
echo "   - In server n8n, import each downloaded JSON file"
echo "   - Configure credentials (NocoDB, Listmonk, Resend)"
echo "   - Test one workflow end-to-end"
echo ""
echo "6. SHUTDOWN LOCAL n8n:"
echo "   docker-compose down  # In your local n8n directory"
echo ""

print_warning "Make sure your server firewall allows these ports:"
echo "  5678 (n8n), 8080 (NocoDB), 9000 (Listmonk), 8082 (Stirling PDF)"
echo "  7700 (MeiliSearch), 2368 (Ghost), 9001 (Penpot), 6333 (Qdrant)"
echo "  3000 (Excalidraw), 8233 (Temporal)"

echo ""
print_status "Ready to deploy? Run the commands above in order."