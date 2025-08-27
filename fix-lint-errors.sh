#!/bin/bash

# Fix lint errors in action files

cd /Users/richard/Developer/tenant-flow/apps/frontend/src/app/actions

# Remove unused type imports from action files
sed -i '' '/CreateLeaseInput/d' leases.ts
sed -i '' '/CreateMaintenanceInput/d' maintenance.ts
sed -i '' '/UpdateMaintenanceInput/d' maintenance.ts
sed -i '' '/CreatePropertyInput/d' properties.ts
sed -i '' '/CreateTenantInput/d' tenants.ts
sed -i '' '/CreateUnitInput/d' units.ts
sed -i '' '/UpdateUnitInput/d' units.ts

# Fix parseInt missing radix - add , 10 to all parseInt calls
for file in *.ts; do
  sed -i '' 's/parseInt(\([^)]*\))/parseInt(\1, 10)/g' "$file"
done

# Remove the 'as any' type assertions and replace with proper typing
# This is more complex so we'll handle it differently

echo "Lint fixes applied!"