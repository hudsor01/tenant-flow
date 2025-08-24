#!/bin/bash

# Script to replace ErrorHandlerService with native NestJS exceptions
# Following CLAUDE.md RULE #3: No abstractions - direct library usage only

echo "🔄 Replacing custom ErrorHandlerService with native NestJS exceptions..."

# Files to update (found via grep)
files=(
  "src/database/storage.service.ts"
  "src/pdf/pdf-generator.service.ts"
  "src/pdf/pdf.controller.ts"
  "src/dashboard/dashboard.service.ts"
  "src/maintenance/maintenance.service.ts"
  "src/notifications/notifications.controller.ts"
  "src/billing/stripe.service.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Updating $file..."
    
    # Add required imports if they don't exist
    if ! grep -q "BadRequestException" "$file"; then
      sed -i '' 's/import { Injectable/import { Injectable, BadRequestException, InternalServerErrorException/g' "$file"
    fi
    
    # Replace ErrorHandlerService import (remove the import line)
    sed -i '' '/import.*ErrorHandlerService.*from/d' "$file"
    
    # Replace constructor parameter
    sed -i '' 's/private.*errorHandler.*ErrorHandlerService[,)]//g' "$file"
    sed -i '' 's/,private.*errorHandler.*ErrorHandlerService[,)]/)/g' "$file"
    
    # Replace method calls
    sed -i '' 's/this\.errorHandler\.createBusinessError(/throw new BadRequestException(/g' "$file"
    sed -i '' 's/this\.errorHandler\.createValidationError(/throw new BadRequestException(/g' "$file"
    sed -i '' 's/this\.errorHandler\.createConfigError(/throw new InternalServerErrorException(/g' "$file"
    sed -i '' 's/this\.errorHandler\.createNotFoundError(/throw new NotFoundException(/g' "$file"
    
    # Fix double throws
    sed -i '' 's/throw throw new/throw new/g' "$file"
    
    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Error handler replacement complete!"
echo "📋 Manual review needed for proper exception types and context"