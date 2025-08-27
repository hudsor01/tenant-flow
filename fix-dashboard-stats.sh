#!/bin/bash

echo "Fixing DashboardStats usage patterns..."

# Fix properties access
echo "Fixing properties..."
find /Users/richard/Developer/tenant-flow/apps/frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/stats\.properties\.total/stats.totalProperties/g' \
  -e 's/stats\.properties\.occupancyRate/stats.occupancyRate/g' \
  -e 's/stats\?\.properties\?\.total/stats?.totalProperties/g' \
  -e 's/stats\?\.properties\?\.occupancyRate/stats?.occupancyRate/g' \
  -e 's/stats\?\.properties\?\.totalProperties/stats?.totalProperties/g' \
  -e 's/Stats\?\.properties\?\.total/Stats?.totalProperties/g' \
  -e 's/Stats\?\.properties\?\.occupancyRate/Stats?.occupancyRate/g' \
  {} \;

# Fix tenants access
echo "Fixing tenants..."
find /Users/richard/Developer/tenant-flow/apps/frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/stats\.tenants\.total/stats.totalTenants/g' \
  -e 's/stats\.tenants\.activeTenants/stats.totalTenants/g' \
  -e 's/stats\?\.tenants\?\.total/stats?.totalTenants/g' \
  -e 's/stats\?\.tenants\?\.activeTenants/stats?.totalTenants/g' \
  -e 's/Stats\?\.tenants\?\.total/Stats?.totalTenants/g' \
  {} \;

# Fix leases access
echo "Fixing leases..."
find /Users/richard/Developer/tenant-flow/apps/frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/stats\.leases\.active/stats.totalTenants/g' \
  -e 's/stats\.leases\.activeLeases/stats.totalTenants/g' \
  -e 's/stats\?\.leases\?\.active/stats?.totalTenants/g' \
  -e 's/stats\?\.leases\?\.activeLeases/stats?.totalTenants/g' \
  -e 's/Stats\?\.leases\?\.active/Stats?.totalTenants/g' \
  {} \;

# Fix maintenanceRequests.open access
echo "Fixing maintenance requests..."
find /Users/richard/Developer/tenant-flow/apps/frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/maintenanceRequests\.open/maintenanceRequests/g' \
  -e 's/maintenanceRequests\?\.open/maintenanceRequests/g' \
  -e 's/maintenanceRequests\.inProgress/maintenanceRequests/g' \
  {} \;

echo "Done! Fixed DashboardStats usage patterns."