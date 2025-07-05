#!/bin/bash

# Quick Deploy Script for NocoDB + Listmonk Lead Magnet System
# Run this script to deploy the complete infrastructure

set -e

echo "🚀 TenantFlow Lead Magnet System - Quick Deploy"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env from template..."
    cp .env.deployment .env
    echo "✅ Please edit .env file with your settings before continuing!"
    echo "   Required: POSTGRES_PASSWORD, JWT_SECRET, RESEND_API_KEY"
    echo ""
    echo "   Then run this script again: ./scripts/quick-deploy.sh"
    exit 1
fi

echo "📋 Checking environment configuration..."
source .env

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your-secure-password-here" ]; then
    echo "❌ Please set POSTGRES_PASSWORD in .env file"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-minimum-256-bits-change-this-now" ]; then
    echo "❌ Please set JWT_SECRET in .env file"
    exit 1
fi

echo "✅ Environment configuration looks good!"

# Create network if it doesn't exist
echo "🌐 Setting up Docker network..."
docker network inspect ${NETWORK_NAME:-tenantflow_network} > /dev/null 2>&1 || \
    docker network create ${NETWORK_NAME:-tenantflow_network}

# Setup databases (if PostgreSQL container exists)
echo "🗄️  Setting up databases..."
if docker ps --format 'table {{.Names}}' | grep -q postgres; then
    echo "Found PostgreSQL container, setting up databases..."
    docker exec -i postgres psql -U postgres < scripts/setup-databases.sql
else
    echo "⚠️  No PostgreSQL container found. Please ensure PostgreSQL is running."
    echo "   The databases (nocodb, listmonk) will be created automatically."
fi

# Deploy services
echo "🚀 Deploying NocoDB and Listmonk..."
docker-compose -f docker-compose.nocodb-listmonk.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
echo "   This may take 2-3 minutes for first startup..."

# Wait for NocoDB
echo "   Waiting for NocoDB..."
until curl -s -f http://localhost:8080 > /dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " ✅ NocoDB is ready!"

# Wait for Listmonk  
echo "   Waiting for Listmonk..."
until curl -s -f http://localhost:9000/api/health > /dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " ✅ Listmonk is ready!"

# Setup Listmonk lists
echo "📧 Setting up Listmonk email lists..."
sleep 10  # Give Listmonk a moment to fully initialize
./n8n-workflows/listmonk-setup.sh

echo ""
echo "🎉 Deployment Complete!"
echo "====================="
echo ""
echo "📊 NocoDB:  http://localhost:8080"
echo "📧 Listmonk: http://localhost:9000"
echo ""
echo "🔑 Next Steps:"
echo "1. Access NocoDB (http://localhost:8080) and create admin account"
echo "2. Create 'lead_magnets' table in NocoDB (see DEPLOYMENT-GUIDE.md)"
echo "3. Access Listmonk (http://localhost:9000) with admin/listmonk"
echo "4. Change Listmonk admin password immediately!"
echo "5. Configure SMTP settings in Listmonk with Resend"
echo "6. Import n8n workflows from n8n-workflows/ directory"
echo "7. Configure NocoDB and Listmonk credentials in n8n"
echo ""
echo "📖 Full instructions: DEPLOYMENT-GUIDE.md"
echo ""
echo "🔍 Check status: docker-compose -f docker-compose.nocodb-listmonk.yml ps"
echo "📄 View logs: docker-compose -f docker-compose.nocodb-listmonk.yml logs -f"