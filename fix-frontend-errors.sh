#!/bin/bash

# Fix TypeScript errors in frontend systematically

echo "Fixing 739 TypeScript errors in frontend..."

# 1. Fix all missing Lucide icon imports
echo "Step 1: Fixing missing Lucide icon imports..."

# List of files that need icon imports based on the errors
files_needing_icons=(
  "apps/frontend/src/components/billing/payment-cancelled.tsx"
  "apps/frontend/src/components/billing/payment-success.tsx"
  "apps/frontend/src/components/dashboard/dashboard-onboarding.tsx"
  "apps/frontend/src/components/dashboard/dashboard-quick-actions.tsx"
  "apps/frontend/src/components/dashboard/dashboard-sidebar.tsx"
  "apps/frontend/src/components/dashboard/dashboard-stats-cards.tsx"
  "apps/frontend/src/components/dashboard/dashboard-widgets.tsx"
  "apps/frontend/src/components/forms/contact-form.tsx"
  "apps/frontend/src/components/landing/cta-section.tsx"
  "apps/frontend/src/components/landing/optimized-features-section.tsx"
  "apps/frontend/src/components/landing/stats-section.tsx"
  "apps/frontend/src/components/layout/mobile-nav.tsx"
  "apps/frontend/src/components/layout/Navigation.tsx"
)

for file in "${files_needing_icons[@]}"; do
  if [ -f "$file" ]; then
    echo "  Checking $file for icon usage..."
    
    # Check which icons are used in the file
    icons_used=$(grep -o '[A-Z][a-z]*[A-Z0-9][a-z0-9]*' "$file" | sort -u | grep -E '^(Home|Building2?|Users?|FileText|Wrench|BarChart3|Settings|CheckCircle2?|AlertTriangle|DollarSign|Calendar|Phone|Mail|HelpCircle|Clock|TrendingUp|Zap|Star|Plus|Calculator)$' | sort -u)
    
    if [ ! -z "$icons_used" ]; then
      # Create the import statement
      import_list=$(echo "$icons_used" | tr '\n' ',' | sed 's/,/, /g' | sed 's/, $//')
      import_statement="import { $import_list } from 'lucide-react'"
      
      # Check if lucide-react import already exists
      if grep -q "from 'lucide-react'" "$file"; then
        # Update existing import
        echo "    Updating existing lucide-react import in $file"
        sed -i '' "s|import {.*} from 'lucide-react'|$import_statement|" "$file"
      else
        # Add new import after 'use client' or at the beginning
        echo "    Adding lucide-react import to $file"
        if grep -q "'use client'" "$file"; then
          # Add after 'use client'
          sed -i '' "/^'use client'/a\\
\\
$import_statement" "$file"
        else
          # Add at the beginning
          sed -i '' "1i\\
$import_statement\\
" "$file"
        fi
      fi
    fi
  fi
done

# 2. Fix DashboardStats type structure
echo "Step 2: Fixing DashboardStats type structure..."

# The DashboardStats type needs to be updated to match usage
cat > apps/frontend/src/types/dashboard-stats-fix.ts << 'EOF'
// Temporary fix for DashboardStats type mismatch
export interface DashboardStatsFixed {
  properties: {
    totalProperties: number
    activeProperties?: number
  }
  tenants: {
    totalTenants: number
    activeTenants?: number
  }
  leases: {
    totalLeases?: number
    activeLeases: number
  }
  maintenanceRequests: {
    open: number
    inProgress?: number
  }
  totalMonthlyRevenue: number
}
EOF

# 3. Fix logger.error calls
echo "Step 3: Fixing logger.error calls..."

# Fix logger.error({ error }) to logger.error(error)
sed -i '' 's/logger\.error(\([^,]*\), { error })/logger.error(\1, error)/g' apps/frontend/src/app/actions/*.ts

# 4. Fix FormData.get() with radix parameter
echo "Step 4: Fixing parseInt calls with FormData..."

# Fix parseInt(formData.get('field', 10) as string) to parseInt(formData.get('field') as string, 10)
find apps/frontend/src -name "*.ts" -o -name "*.tsx" | while read file; do
  sed -i '' 's/parseInt(formData\.get(\([^)]*\), \([0-9]*\)) as string)/parseInt(formData.get(\1) as string, \2)/g' "$file"
done

# 5. Fix TenantStats type
echo "Step 5: Adding missing fields to TenantStats..."
# This needs to be added to shared/src/types/tenants.ts

# 6. Fix UnitStats type
echo "Step 6: Adding missing fields to UnitStats..."
# This needs to be added to shared/src/types/units.ts

echo "Script complete! Now run 'npm run typecheck' to see remaining errors."