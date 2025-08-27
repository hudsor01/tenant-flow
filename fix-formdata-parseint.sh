#!/bin/bash

echo "Fixing FormData.get() parseInt issues..."

# Fix parseInt(formData.get('field', 10) as string) to parseInt(formData.get('field') as string, 10)
find /Users/richard/Developer/tenant-flow/apps/frontend -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  's/parseInt(formData\.get(\([^,)]*\), \([0-9]*\)) as string)/parseInt(formData.get(\1) as string, \2)/g' {} \;

echo "Done! Fixed FormData.get() parseInt patterns."