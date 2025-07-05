#!/bin/bash

# Complete Setup Script for TenantFlow Lead Magnet System
# This script deploys everything on the same Docker network for proper communication

set -e

echo "🚀 TenantFlow Lead Magnet System - Complete Setup"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env from complete template..."
    cp .env.complete .env
    echo "✅ Please edit .env file with your settings before continuing!"
    echo ""
    echo "   Required settings:"
    echo "   - POSTGRES_PASSWORD"
    echo "   - N8N_BASIC_AUTH_PASSWORD" 
    echo "   - JWT_SECRET"
    echo "   - LISTMONK_ADMIN_PASSWORD"
    echo "   - RESEND_API_KEY"
    echo ""
    echo "   Then run this script again: ./scripts/complete-setup.sh"
    exit 1
fi

echo "📋 Checking environment configuration..."
source .env

# Check required variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "N8N_BASIC_AUTH_PASSWORD" "JWT_SECRET" "LISTMONK_ADMIN_PASSWORD")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"change-this"* ]] || [[ "${!var}" == *"your-"* ]]; then
        echo "❌ Please set $var in .env file"
        exit 1
    fi
done

echo "✅ Environment configuration looks good!"

# Update workflow URLs for container communication
echo "🔧 Updating workflow URLs for Docker containers..."
node scripts/update-workflow-urls.js

# Stop any existing services
echo "🛑 Stopping any existing services..."
docker-compose -f docker-compose-complete.yml down 2>/dev/null || true

# Deploy complete stack
echo "🚀 Deploying complete TenantFlow stack..."
docker-compose -f docker-compose-complete.yml up -d

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec tenantflow-postgres pg_isready -U postgres > /dev/null 2>&1; do
    printf "."
    sleep 2
done
echo " ✅ PostgreSQL is ready!"

# Create additional databases
echo "🗄️  Setting up databases..."
docker exec tenantflow-postgres psql -U postgres -c "CREATE DATABASE IF NOT EXISTS nocodb;"
docker exec tenantflow-postgres psql -U postgres -c "CREATE DATABASE IF NOT EXISTS listmonk;"
docker exec tenantflow-postgres psql -U postgres -c "CREATE DATABASE IF NOT EXISTS n8n;"

# Wait for Ollama and pull model
echo "🤖 Setting up Ollama AI model..."
until docker exec tenantflow-ollama ollama list > /dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " ✅ Ollama is ready!"

# Pull llama3.2 model
echo "📥 Pulling llama3.2 model (this may take a few minutes)..."
docker exec tenantflow-ollama ollama pull llama3.2

# Wait for n8n
echo "⏳ Waiting for n8n to be ready..."
until curl -s -f http://localhost:5678/healthz > /dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " ✅ n8n is ready!"

# Wait for NocoDB
echo "⏳ Waiting for NocoDB to be ready..."
until curl -s -f http://localhost:8080 > /dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " ✅ NocoDB is ready!"

# Wait for Listmonk
echo "⏳ Waiting for Listmonk to be ready..."
until curl -s -f http://localhost:9000/api/health > /dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " ✅ Listmonk is ready!"

# Setup Listmonk lists
echo "📧 Setting up Listmonk email lists..."
sleep 15  # Give Listmonk time to fully initialize
# Update the listmonk setup script to use container name
sed 's/localhost:9000/localhost:9000/g' n8n-workflows/listmonk-setup.sh > /tmp/listmonk-setup-local.sh
chmod +x /tmp/listmonk-setup-local.sh
/tmp/listmonk-setup-local.sh

echo ""
echo "🎉 Complete Setup Finished!"
echo "=========================="
echo ""
echo "🌐 Service URLs:"
echo "📊 n8n:        http://localhost:5678 (admin/${N8N_BASIC_AUTH_PASSWORD})"
echo "🗄️  NocoDB:     http://localhost:8080"
echo "📧 Listmonk:   http://localhost:9000 (admin/${LISTMONK_ADMIN_PASSWORD})"
echo "🤖 Ollama:     http://localhost:11434"
echo "🐘 PostgreSQL: localhost:5432"
echo ""
echo "🔧 Container Names (for internal communication):"
echo "   - tenantflow-n8n"
echo "   - tenantflow-nocodb" 
echo "   - tenantflow-listmonk"
echo "   - tenantflow-ollama"
echo "   - tenantflow-postgres"
echo ""
echo "📝 Next Steps:"
echo "1. Access NocoDB and create 'lead_magnets' table"
echo "2. Configure SMTP in Listmonk with Resend settings"
echo "3. Import n8n workflows (they're already configured for container URLs)"
echo "4. Set up NocoDB and Listmonk credentials in n8n"
echo "5. Test a workflow to verify everything works"
echo ""
echo "📖 Detailed instructions: DEPLOYMENT-GUIDE.md"
echo ""
echo "🔍 Check all services: docker-compose -f docker-compose-complete.yml ps"
echo "📄 View logs: docker-compose -f docker-compose-complete.yml logs -f [service-name]"