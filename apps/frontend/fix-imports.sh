#!/bin/bash

# Fix inconsistent imports in frontend
echo "Fixing inconsistent imports in frontend..."

# Find all files with the wrong import pattern and fix them
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@tenantflow/shared/src/types/|@tenantflow/shared/types/|g'

echo "Fixed imports from @tenantflow/shared/src/types/ to @tenantflow/shared/types/"

# Now also check for any remaining @/types/ imports that should be shared package imports
echo "Checking for local @/types/ imports that could be shared..."

# List files that might need manual review
echo "Files that still import from @/types/:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from ['\"]@/types/" || echo "None found"

echo "Import fixing complete!"