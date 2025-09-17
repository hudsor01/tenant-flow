#!/bin/bash

echo "🔧 Fixing NestJS Logger migration issues..."

# Step 1: Fix .info() to .log() in all files
echo "1. Converting .info() to .log() method calls..."
find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" -exec sed -i '' 's/\.info(/\.log(/g' {} \;

# Step 2: Fix .setContext() method calls (NestJS Logger doesn't have this)
echo "2. Removing .setContext() calls..."
find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" -exec sed -i '' 's/this\.logger\.setContext([^)]*)/\/\/ Context removed - NestJS Logger doesn'\''t support setContext/g' {} \;

# Step 3: Fix duplicate Logger imports 
echo "3. Fixing duplicate Logger imports..."
find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" -exec sed -i '' '/import.*Logger.*from.*nestjs-pino/d' {} \;
find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" -exec sed -i '' '/import.*Logger.*from.*pino/d' {} \;

# Step 4: Clean up duplicate Logger variable declarations
echo "4. Cleaning duplicate Logger declarations..."
find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" -exec sed -i '' '/^[[:space:]]*Logger[[:space:]]*$/d' {} \;

echo "✅ NestJS Logger migration fixes completed!"
echo "Files processed: $(find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" | wc -l)"