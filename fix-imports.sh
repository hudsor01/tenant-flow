#!/bin/bash

# Script to fix @tenantflow/shared subpath imports to use main export

find /Users/richard/Developer/tenant-flow/apps/frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e 's|@tenantflow/shared/types/[^'\'']*|@tenantflow/shared|g' \
  -e 's|@tenantflow/shared/constants/[^'\'']*|@tenantflow/shared|g' \
  -e 's|@tenantflow/shared/utils/[^'\'']*|@tenantflow/shared|g' \
  -e 's|@tenantflow/shared/validation/[^'\'']*|@tenantflow/shared|g'

echo "Fixed all @tenantflow/shared imports to use main export"