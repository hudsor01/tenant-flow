#!/bin/bash

# Setup Turbo Remote Caching
# This script configures Turborepo to use Vercel's free remote caching service

set -e

echo "🚀 Setting up Turbo Remote Caching..."
echo ""

# Check if turbo is installed
if ! command -v turbo &> /dev/null; then
    echo "❌ Turbo is not installed. Installing..."
    npm install -g turbo
fi

# Function to check if user is already logged in
check_login_status() {
    if turbo whoami &> /dev/null; then
        echo "✅ Already logged in to Turbo"
        return 0
    else
        return 1
    fi
}

# Function to setup CI environment variables
setup_ci_env() {
    echo ""
    echo "📋 CI/CD Environment Setup"
    echo "========================="
    echo ""
    echo "Add these environment variables to your CI/CD pipeline:"
    echo ""
    echo "1. TURBO_TOKEN - Your personal or team access token"
    echo "2. TURBO_TEAM - Your team slug (if using team account)"
    echo ""
    echo "To get your token:"
    echo "- Personal: https://vercel.com/account/tokens"
    echo "- Team: Run 'npx turbo login --sso-team=<team-name>'"
    echo ""
}

# Main setup flow
main() {
    # Check if already logged in
    if ! check_login_status; then
        echo "📝 Logging in to Turbo..."
        echo "This will open your browser to authenticate with Vercel."
        echo ""
        read -p "Press Enter to continue..."
        
        npx turbo login
        
        if [ $? -ne 0 ]; then
            echo "❌ Login failed. Please try again."
            exit 1
        fi
    fi
    
    # Link the repository
    echo ""
    echo "🔗 Linking repository to remote cache..."
    npx turbo link
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to link repository. Please check your authentication."
        exit 1
    fi
    
    # Verify remote caching is enabled in turbo.json
    if grep -q '"enabled": true' turbo.json; then
        echo "✅ Remote caching is enabled in turbo.json"
    else
        echo "⚠️  Remote caching is not enabled in turbo.json"
        echo "Please ensure 'remoteCache.enabled' is set to true"
    fi
    
    # Optional: Setup artifact signing
    echo ""
    read -p "Would you like to enable artifact signing for additional security? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔐 Enabling artifact signing..."
        echo ""
        echo "1. Add to turbo.json:"
        echo '   "remoteCache": {'
        echo '     "enabled": true,'
        echo '     "signature": true'
        echo '   }'
        echo ""
        echo "2. Set environment variable:"
        echo "   TURBO_REMOTE_CACHE_SIGNATURE_KEY=<your-secret-key>"
        echo ""
        echo "Generate a secret key with: openssl rand -base64 32"
    fi
    
    # Setup CI environment variables
    setup_ci_env
    
    # Test the setup
    echo ""
    echo "🧪 Testing remote cache..."
    echo ""
    echo "1. Clear local cache: rm -rf node_modules/.cache/turbo"
    echo "2. Run a build: npm run build"
    echo "3. Clear local cache again"
    echo "4. Run build again - it should be fetched from remote cache"
    echo ""
    
    echo "✅ Turbo remote caching setup complete!"
    echo ""
    echo "📊 Expected improvements:"
    echo "- 10-100x faster CI/CD builds"
    echo "- Shared cache across team members"
    echo "- Reduced build times from minutes to seconds"
}

# Run main function
main