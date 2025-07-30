#!/bin/bash

# Split Monorepo Script
# This script helps split a monorepo into separate frontend and backend repos
# while preserving git history for each part

set -e

echo "🔄 Starting monorepo split..."

# Configuration
ORIGINAL_REPO=$(pwd)
TEMP_DIR="/tmp/tenant-flow-split"
FRONTEND_REPO="tenant-flow-frontend"
BACKEND_REPO="tenant-flow-backend"
SHARED_REPO="tenant-flow-shared"

# Clean up any previous attempts
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Option 1: Create shared types package
echo "📦 Creating shared types package..."
cd $TEMP_DIR
git clone $ORIGINAL_REPO $SHARED_REPO
cd $SHARED_REPO

# Remove everything except shared package
git filter-branch --force --index-filter \
  'git rm -r --cached --ignore-unmatch $(git ls-files | grep -v "^packages/shared/")'  \
  --prune-empty --tag-name-filter cat -- --all

# Move shared to root
git filter-branch --force --tree-filter \
  'if [ -d packages/shared ]; then mkdir -p tmp-shared && mv packages/shared/* tmp-shared/ && rm -rf packages && mv tmp-shared/* . && rmdir tmp-shared; fi' \
  -- --all

echo "✅ Shared types repo created at $TEMP_DIR/$SHARED_REPO"

# Create Frontend Repo
echo "🎨 Creating frontend repo..."
cd $TEMP_DIR
git clone $ORIGINAL_REPO $FRONTEND_REPO
cd $FRONTEND_REPO

# Remove backend and keep frontend
git filter-branch --force --index-filter \
  'git rm -r --cached --ignore-unmatch apps/backend' \
  --prune-empty --tag-name-filter cat -- --all

# Move frontend to root
git filter-branch --force --tree-filter \
  'if [ -d apps/frontend ]; then mv apps/frontend/* . && rm -rf apps packages; fi' \
  -- --all

echo "✅ Frontend repo created at $TEMP_DIR/$FRONTEND_REPO"

# Create Backend Repo
echo "🔧 Creating backend repo..."
cd $TEMP_DIR
git clone $ORIGINAL_REPO $BACKEND_REPO
cd $BACKEND_REPO

# Remove frontend and keep backend
git filter-branch --force --index-filter \
  'git rm -r --cached --ignore-unmatch apps/frontend' \
  --prune-empty --tag-name-filter cat -- --all

# Move backend to root
git filter-branch --force --tree-filter \
  'if [ -d apps/backend ]; then mv apps/backend/* . && rm -rf apps packages; fi' \
  -- --all

echo "✅ Backend repo created at $TEMP_DIR/$BACKEND_REPO"

echo "
🎉 Monorepo split complete!

Created repos at:
- $TEMP_DIR/$FRONTEND_REPO
- $TEMP_DIR/$BACKEND_REPO  
- $TEMP_DIR/$SHARED_REPO

Next steps:
1. Review the split repos
2. Update package.json dependencies
3. Create new GitHub repos
4. Push each repo to its new remote
5. Update CI/CD pipelines
"