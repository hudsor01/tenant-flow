#!/bin/bash

# Simple script to copy shared types to both frontend and backend

set -e

echo "📁 Copying shared types to frontend and backend..."

# Copy to frontend
echo "📋 Copying to frontend..."
rm -rf apps/frontend/src/shared
cp -r packages/shared/src apps/frontend/src/shared

# Copy to backend  
echo "📋 Copying to backend..."
rm -rf apps/backend/src/shared
cp -r packages/shared/src apps/backend/src/shared

echo "✅ Done! Shared types copied to both apps"

echo "
Next steps:
1. Update imports in frontend from '@tenantflow/shared' to '@/shared'
2. Update imports in backend from '@tenantflow/shared' to './shared' or '../shared'
3. Remove packages/shared folder
4. Update tsconfig paths if needed
"