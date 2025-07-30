#!/bin/bash

# Configure Prisma Accelerate for TenantFlow
set -e

echo "🚀 Prisma Accelerate Configuration Helper"
echo "========================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "apps/backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found. Please create it from .env.example first"
    exit 1
fi

echo "This script will help you configure Prisma Accelerate."
echo ""
echo "Prerequisites:"
echo "1. Sign up at https://www.prisma.io/data-platform"
echo "2. Create a project and enable Accelerate"
echo "3. Copy your Accelerate connection string"
echo ""
read -p "Do you have your Accelerate connection string ready? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please get your Accelerate connection string first, then run this script again."
    exit 0
fi

# Get Accelerate URL
echo ""
echo "Enter your Prisma Accelerate connection string:"
echo "(It should look like: prisma://accelerate.prisma-data.net/?api_key=...)"
read -p "> " ACCELERATE_URL

# Validate URL format
if [[ ! "$ACCELERATE_URL" =~ ^prisma:// ]]; then
    echo "❌ Invalid Accelerate URL. It should start with 'prisma://'"
    exit 1
fi

# Update .env.local
echo ""
echo "📝 Updating .env.local..."

# Check if PRISMA_ACCELERATE_URL already exists
if grep -q "^PRISMA_ACCELERATE_URL=" .env.local; then
    # Update existing
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^PRISMA_ACCELERATE_URL=.*|PRISMA_ACCELERATE_URL=$ACCELERATE_URL|" .env.local
        sed -i '' "s|^ENABLE_PRISMA_ACCELERATE=.*|ENABLE_PRISMA_ACCELERATE=true|" .env.local
    else
        sed -i "s|^PRISMA_ACCELERATE_URL=.*|PRISMA_ACCELERATE_URL=$ACCELERATE_URL|" .env.local
        sed -i "s|^ENABLE_PRISMA_ACCELERATE=.*|ENABLE_PRISMA_ACCELERATE=true|" .env.local
    fi
    echo "✅ Updated existing Accelerate configuration"
else
    # Add new
    echo "" >> .env.local
    echo "# Prisma Accelerate Configuration" >> .env.local
    echo "ENABLE_PRISMA_ACCELERATE=true" >> .env.local
    echo "PRISMA_ACCELERATE_URL=$ACCELERATE_URL" >> .env.local
    echo "✅ Added Accelerate configuration"
fi

# Regenerate Prisma client
echo ""
echo "🔄 Regenerating Prisma client..."
cd apps/backend
npx prisma generate
cd ../..

echo ""
echo "✅ Prisma Accelerate configuration complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Check health endpoint: curl http://localhost:3000/api/v1/health | jq '.database.accelerate'"
echo "3. Monitor performance in Prisma Data Platform dashboard"
echo ""
echo "Your queries are now:"
echo "• Cached at edge locations worldwide"
echo "• Using connection pooling"
echo "• Automatically optimized for performance"
echo ""
echo "🎉 Happy coding with Prisma Accelerate!"