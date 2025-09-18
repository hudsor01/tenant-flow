#!/bin/bash

# Bulk migration script from PinoLogger to native NestJS Logger

echo "Starting logger migration..."

# Find all .ts files (excluding tests) that use PinoLogger
FILES=$(find src -name "*.ts" -not -name "*.spec.ts" -not -name "*.test.ts" -exec grep -l "PinoLogger" {} \;)

for file in $FILES; do
    echo "Migrating $file..."

    # 1. Replace import
    sed -i '' 's/import { PinoLogger } from '\''nestjs-pino'\''/import { Logger } from '\''@nestjs\/common'\''/g' "$file"

    # 2. Handle case where Logger is already imported
    sed -i '' 's/import { \(.*\), Logger } from '\''@nestjs\/common'\''/import { \1, Logger } from '\''@nestjs\/common'\''/g' "$file"
    sed -i '' 's/import { Logger, \(.*\) } from '\''@nestjs\/common'\''/import { Logger, \1 } from '\''@nestjs\/common'\''/g' "$file"

    # 3. Replace PinoLogger type references
    sed -i '' 's/PinoLogger/Logger/g' "$file"
done

echo "Import migration complete. Manual constructor fixes needed."
echo "Files migrated: $(echo "$FILES" | wc -l)"