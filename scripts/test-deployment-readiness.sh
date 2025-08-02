#!/bin/bash

# Test deployment readiness after infrastructure fixes
set -e

echo "🔧 Testing deployment infrastructure fixes..."

# Test 1: Verify single Docker configuration
echo ""
echo "📋 Test 1: Docker Configuration"
if [ -f "Dockerfile" ]; then
    echo "✅ Primary Dockerfile exists"
else
    echo "❌ Primary Dockerfile missing"
    exit 1
fi

if [ -f "Dockerfile.railway" ]; then
    echo "❌ Duplicate Dockerfile.railway still exists - should be removed"
    exit 1
else
    echo "✅ No duplicate Dockerfile configurations"
fi

# Test 2: Verify railway.toml configuration
echo ""
echo "📋 Test 2: Railway Configuration"
if grep -q 'dockerfilePath = "./Dockerfile"' railway.toml; then
    echo "✅ Railway points to correct Dockerfile"
else
    echo "❌ Railway configuration error"
    exit 1
fi

if grep -q 'NODE_OPTIONS = "--max-old-space-size=4096"' railway.toml; then
    echo "✅ Consistent memory allocation (4096MB)"
else
    echo "❌ Memory allocation inconsistency"
    exit 1
fi

# Test 3: Verify GitHub Actions workflow
echo ""
echo "📋 Test 3: GitHub Actions Configuration"
if [ -f ".github/workflows/railway-deploy.yml" ]; then
    echo "❌ Duplicate railway-deploy.yml workflow still exists"
    exit 1
else
    echo "✅ No duplicate workflows"
fi

if grep -q 'file: ./Dockerfile' .github/workflows/deploy.yml; then
    echo "✅ Deploy workflow uses correct Dockerfile"
else
    echo "❌ Deploy workflow configuration error"
    exit 1
fi

# Test 4: Verify Docker build works
echo ""
echo "📋 Test 4: Docker Build Test"
echo "Building Docker image to verify configuration..."
if docker build -t tenantflow-test . --no-cache --progress=plain; then
    echo "✅ Docker build successful"
    docker rmi tenantflow-test
else
    echo "❌ Docker build failed"
    exit 1
fi

echo ""
echo "🎉 All deployment infrastructure tests passed!"
echo ""
echo "Summary of fixes applied:"
echo "- ✅ Removed duplicate railway-deploy.yml workflow"
echo "- ✅ Standardized Docker configuration to use optimized Railway version"
echo "- ✅ Fixed memory allocation consistency (4096MB across all environments)"
echo "- ✅ Updated health check timeout to 45s for better reliability"
echo "- ✅ Implemented multi-stage Docker build for smaller production image"
echo "- ✅ Added IPv6 support for Railway health checks"
echo "- ✅ Fixed bcrypt native dependency compilation"
echo ""
echo "Ready for deployment! 🚀"