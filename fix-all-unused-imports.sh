#!/bin/bash

# Comprehensive batch fix for all unused imports in frontend components
echo "🔧 Fixing all remaining unused imports..."

# Helper function to remove unused imports
remove_unused_import() {
    local file="$1"
    local unused_var="$2"
    
    echo "Removing unused import '$unused_var' from $(basename "$file")"
    
    # Use perl for more reliable cross-platform editing
    perl -i -pe "
        # Match import blocks and remove the specific unused variable
        if (/import\s*\{[^}]*\}\s*from/) {
            s/,?\s*${unused_var}\s*,?//g;
            s/\{\s*,+\s*/\{/g;
            s/\s*,+\s*\}/\}/g;
            s/\{\s*\}/\{\}/g;
            # If import is now empty, remove the entire line
            s/^import\s*\{\s*\}\s*from\s*[^;]+;\s*$//;
        }
    " "$file"
}

# Fix UI components
echo "🎨 Fixing UI components..."
remove_unused_import "apps/frontend/src/components/ui/button.tsx" "buttonClasses"
remove_unused_import "apps/frontend/src/components/ui/button.tsx" "SEMANTIC_COLORS"
remove_unused_import "apps/frontend/src/components/ui/card.tsx" "cardClasses"
remove_unused_import "apps/frontend/src/components/ui/card.tsx" "SEMANTIC_COLORS"
remove_unused_import "apps/frontend/src/components/ui/dialog.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/dropdown-menu.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/hover-card.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/label.tsx" "formLabelClasses"
remove_unused_import "apps/frontend/src/components/ui/pagination.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/popover.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/select.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/separator.tsx" "SEMANTIC_COLORS"
remove_unused_import "apps/frontend/src/components/ui/slider.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/table.tsx" "tableClasses"
remove_unused_import "apps/frontend/src/components/ui/tabs.tsx" "ANIMATION_DURATIONS"
remove_unused_import "apps/frontend/src/components/ui/tooltip.tsx" "ANIMATION_DURATIONS"

# Fix remaining component files
echo "🧩 Fixing remaining component files..."
remove_unused_import "apps/frontend/src/components/finance/financial-metrics-cards.tsx" "CardHeader"
remove_unused_import "apps/frontend/src/components/finance/financial-metrics-cards.tsx" "CardTitle"
remove_unused_import "apps/frontend/src/components/finance/financial-metrics-cards.tsx" "cardClasses"
remove_unused_import "apps/frontend/src/components/finance/financial-overview.tsx" "Cell"
remove_unused_import "apps/frontend/src/components/finance/financial-overview.tsx" "Loader"
remove_unused_import "apps/frontend/src/components/finance/revenue-trend-chart.tsx" "Button"

# Fix sections
echo "📄 Fixing section components..."
for file in apps/frontend/src/components/sections/*.tsx; do
    [ -f "$file" ] || continue
    remove_unused_import "$file" "buttonClasses"
    remove_unused_import "$file" "cardClasses"
    remove_unused_import "$file" "ANIMATION_DURATIONS"
    remove_unused_import "$file" "TYPOGRAPHY_SCALE"
done

# Fix magicui components
echo "✨ Fixing magicui components..."
for file in apps/frontend/src/components/magicui/*.tsx; do
    [ -f "$file" ] || continue
    remove_unused_import "$file" "ANIMATION_DURATIONS"
    remove_unused_import "$file" "TYPOGRAPHY_SCALE"
    remove_unused_import "$file" "cardClasses"
done

# Fix pricing components
echo "💰 Fixing pricing components..."
remove_unused_import "apps/frontend/src/components/pricing/checkout-form.tsx" "CardDescription"
remove_unused_import "apps/frontend/src/components/pricing/checkout-form.tsx" "TrendingUp"
remove_unused_import "apps/frontend/src/components/pricing/customer-portal.tsx" "Clock"
remove_unused_import "apps/frontend/src/components/pricing/customer-portal.tsx" "badgeClasses"
remove_unused_import "apps/frontend/src/components/pricing/stripe-pricing-section.tsx" "buttonClasses"
remove_unused_import "apps/frontend/src/components/pricing/stripe-pricing-section.tsx" "cardClasses"
remove_unused_import "apps/frontend/src/components/pricing/stripe-pricing-section.tsx" "CheckCircle2"
remove_unused_import "apps/frontend/src/components/pricing/stripe-pricing-section.tsx" "ArrowRight"

# Fix hook
echo "🎣 Fixing hooks..."
perl -i -pe 's/T,//' "apps/frontend/src/hooks/use-infinite-query.ts"

echo "✅ All unused import fixes applied!"
echo "📋 Running build test to verify fixes..."