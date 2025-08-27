#!/bin/bash

echo "Fixing double replacements..."

# Fix stats?.properties?.totalProperties back to stats?.totalProperties
find /Users/richard/Developer/tenant-flow/apps/frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/totalPropertiesProperties/totalProperties/g' \
  -e 's/totalTenantsTenants/totalTenants/g' \
  -e 's/totalTenantsLeases/totalTenants/g' \
  {} \;

echo "Done!"