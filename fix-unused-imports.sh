#!/bin/bash

# Batch fix unused imports across all components based on ESLint errors

echo "🔧 Fixing unused imports across all components..."

# Create a function to remove unused imports from a file
fix_unused_import() {
    local file="$1"
    local unused_var="$2"
    
    echo "Removing unused import '$unused_var' from $file"
    
    # Use sed to remove the unused import while preserving structure
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "/import.*{/,/}.*from/ { s/,*[[:space:]]*${unused_var}[[:space:]]*,*//g; s/{[[:space:]]*,*[[:space:]]*}/{}/g; s/{,/{/g; s/,}}/}/g; }" "$file"
    else
        # Linux
        sed -i "/import.*{/,/}.*from/ { s/,*[[:space:]]*${unused_var}[[:space:]]*,*//g; s/{[[:space:]]*,*[[:space:]]*}/{}/g; s/{,/{/g; s/,}}/}/g; }" "$file"
    fi
}

# Fix auth components
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/sign-up-form.tsx" "buttonClasses"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/sign-up-form.tsx" "inputClasses"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/sign-up-form.tsx" "cardClasses"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/sign-up-form.tsx" "ANIMATION_DURATIONS"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/sign-up-form.tsx" "TYPOGRAPHY_SCALE"

fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/social-login-form.tsx" "formErrorClasses"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/auth/social-login-form.tsx" "SEMANTIC_COLORS"

# Fix data-table
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/data-table.tsx" "tableClasses"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/data-table.tsx" "ANIMATION_DURATIONS"

# Fix finance components
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/account-overview.tsx" "SEMANTIC_COLORS"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/expense-summary.tsx" "Separator"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/financial-metrics-cards.tsx" "CardHeader"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/financial-metrics-cards.tsx" "CardTitle"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/financial-metrics-cards.tsx" "cardClasses"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/financial-overview.tsx" "Cell"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/financial-overview.tsx" "SEMANTIC_COLORS"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/financial-overview.tsx" "Loader"
fix_unused_import "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/finance/revenue-trend-chart.tsx" "Button"

echo "✅ Batch fix completed for auth and finance components!"