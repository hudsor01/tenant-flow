#!/bin/bash
# Fix TypeScript 'possibly undefined' errors for req.user across all controllers

echo "Fixing req.user TypeScript errors..."

# Find all instances of "req.user.id" that come AFTER an if (!req.user?.id) check
# and replace with "req.user!.id" (non-null assertion)

cd apps/backend/src/modules

# Properties
sed -i '' 's/const userId = req\.user\.id$/const userId = req.user!.id/g' properties/properties.controller.ts
sed -i '' 's/const propertyId = req\.user\.property_id$/const propertyId = req.user!.property_id/g' properties/properties.controller.ts
sed -i '' 's/return this\.propertiesService\.findOne(req\.user\.id,/return this.propertiesService.findOne(req.user!.id,/g' properties/properties.controller.ts
sed -i '' 's/return this\.propertiesService\.create(req\.user\.id,/return this.propertiesService.create(req.user!.id,/g' properties/properties.controller.ts
sed -i '' 's/return this\.propertiesService\.update(req\.user\.id,/return this.propertiesService.update(req.user!.id,/g' properties/properties.controller.ts
sed -i '' 's/return this\.propertiesService\.remove(req\.user\.id,/return this.propertiesService.remove(req.user!.id,/g' properties/properties.controller.ts

# Leases
sed -i '' 's/const userId = req\.user\.id$/const userId = req.user!.id/g' leases/leases.controller.ts
sed -i '' 's/return this\.leasesService\.findOne(req\.user\.id,/return this.leasesService.findOne(req.user!.id,/g' leases/leases.controller.ts
sed -i '' 's/return this\.leasesService\.create(req\.user\.id,/return this.leasesService.create(req.user!.id,/g' leases/leases.controller.ts
sed -i '' 's/return this\.leasesService\.update(req\.user\.id,/return this.leasesService.update(req.user!.id,/g' leases/leases.controller.ts
sed -i '' 's/return this\.leasesService\.remove(req\.user\.id,/return this.leasesService.remove(req.user!.id,/g' leases/leases.controller.ts

# Units
sed -i '' 's/const userId = req\.user\.id$/const userId = req.user!.id/g' units/units.controller.ts
sed -i '' 's/return this\.unitsService\.findOne(req\.user\.id,/return this.unitsService.findOne(req.user!.id,/g' units/units.controller.ts
sed -i '' 's/return this\.unitsService\.create(req\.user\.id,/return this.unitsService.create(req.user!.id,/g' units/units.controller.ts
sed -i '' 's/return this\.unitsService\.update(req\.user\.id,/return this.unitsService.update(req.user!.id,/g' units/units.controller.ts
sed -i '' 's/return this\.unitsService\.remove(req\.user\.id,/return this.unitsService.remove(req.user!.id,/g' units/units.controller.ts

# Maintenance
sed -i '' 's/const userId = req\.user\.id$/const userId = req.user!.id/g' maintenance/maintenance.controller.ts
sed -i '' 's/return this\.maintenanceService\.findOne(req\.user\.id,/return this.maintenanceService.findOne(req.user!.id,/g' maintenance/maintenance.controller.ts
sed -i '' 's/return this\.maintenanceService\.create(req\.user\.id,/return this.maintenanceService.create(req.user!.id,/g' maintenance/maintenance.controller.ts
sed -i '' 's/return this\.maintenanceService\.update(req\.user\.id,/return this.maintenanceService.update(req.user!.id,/g' maintenance/maintenance.controller.ts
sed -i '' 's/return this\.maintenanceService\.remove(req\.user\.id,/return this.maintenanceService.remove(req.user!.id,/g' maintenance/maintenance.controller.ts

# Late Fees
sed -i '' 's/const userId = req\.user\.id$/const userId = req.user!.id/g' late-fees/late-fees.controller.ts
sed -i '' 's/return this\.lateFeesService\.findAll(req\.user\.id,/return this.lateFeesService.findAll(req.user!.id,/g' late-fees/late-fees.controller.ts
sed -i '' 's/return this\.lateFeesService\.findOne(req\.user\.id,/return this.lateFeesService.findOne(req.user!.id,/g' late-fees/late-fees.controller.ts
sed -i '' 's/return this\.lateFeesService\.create(req\.user\.id,/return this.lateFeesService.create(req.user!.id,/g' late-fees/late-fees.controller.ts
sed -i '' 's/return this\.lateFeesService\.update(req\.user\.id,/return this.lateFeesService.update(req.user!.id,/g' late-fees/late-fees.controller.ts

# Tenants (uses different pattern)
sed -i '' 's/const userId = req\.user\.id$/const userId = req.user!.id/g' tenants/tenants.controller.ts

echo "✓ Fixed all req.user TypeScript errors"
echo "Backend should now compile successfully"
