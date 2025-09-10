#!/bin/bash

# Fix unused variable/import errors by prefixing with underscore or removing them
# This script focuses on the most common patterns we saw in the lint output

echo "🔧 Fixing lint errors: unused variables and imports..."

# Function to fix unused variables by adding underscore prefix
fix_unused_vars() {
    local file="$1"
    echo "  📝 Fixing unused variables in: $file"
    
    # Fix unused imports/variables by adding underscore prefix
    sed -i '' -E 's/([[:space:]]+)([a-zA-Z_][a-zA-Z0-9_]*): ([^,}]+),$/\1_\2: \3,/g' "$file"
    sed -i '' -E 's/\b(const|let) ([a-zA-Z_][a-zA-Z0-9_]*) = /const _\2 = /g' "$file" 2>/dev/null || true
}

# Function to remove unused imports from import statements  
remove_unused_imports() {
    local file="$1"
    echo "  🗑️  Removing unused imports from: $file"
    
    # Common unused imports we saw in the errors
    unused_imports=(
        "CardHeader"
        "CardTitle" 
        "cardClasses"
        "Cell"
        "SEMANTIC_COLORS"
        "Loader"
        "Button"
        "ANIMATION_DURATIONS"
        "TYPOGRAPHY_SCALE"
        "formLabelClasses"
        "tableClasses"
    )
    
    for import_name in "${unused_imports[@]}"; do
        # Remove from import statements (handle various formats)
        sed -i '' -E "s/, *${import_name}//g" "$file" 2>/dev/null || true
        sed -i '' -E "s/${import_name}, *//g" "$file" 2>/dev/null || true
        sed -i '' -E "s/import \{ *${import_name} *\} from/\/\/ import { ${import_name} } from/g" "$file" 2>/dev/null || true
    done
}

# Function to fix specific TypeScript any types
fix_any_types() {
    local file="$1"
    echo "  🎯 Fixing 'any' types in: $file"
    
    # Replace common any patterns with better types
    sed -i '' -E 's/: any\[\]/: unknown[]/g' "$file" 2>/dev/null || true
    sed -i '' -E 's/: any$/: unknown/g' "$file" 2>/dev/null || true
    sed -i '' -E 's/\(.*\): any /(\1): unknown /g' "$file" 2>/dev/null || true
}

# Process the files that had errors
FILES_WITH_ERRORS=(
    "apps/frontend/src/components/finance/financial-metrics-cards.tsx"
    "apps/frontend/src/components/finance/financial-overview.tsx"  
    "apps/frontend/src/components/finance/revenue-trend-chart.tsx"
    "apps/frontend/src/components/magicui/animated-gradient-text.tsx"
    "apps/frontend/src/components/magicui/features-section-demo-2.tsx"
    "apps/frontend/src/components/magicui/features-section-demo-3.tsx"
    "apps/frontend/src/components/magicui/hero-highlight.tsx"
    "apps/frontend/src/components/magicui/magic-card.tsx"
    "apps/frontend/src/components/magicui/number-ticker.tsx"
    "apps/frontend/src/components/ui/input.tsx"
    "apps/frontend/src/components/ui/label.tsx"
    "apps/frontend/src/components/ui/sheet.tsx"
    "apps/frontend/src/components/ui/switch.tsx"
    "apps/frontend/src/components/ui/table.tsx"
    "apps/frontend/src/components/ui/textarea.tsx"
    "apps/frontend/src/hooks/use-infinite-query.ts"
)

# Process each file  
for file in "${FILES_WITH_ERRORS[@]}"; do
    if [[ -f "$file" ]]; then
        echo "🔧 Processing: $file"
        remove_unused_imports "$file"
        fix_any_types "$file"
        # Don't fix variables automatically as it might break code
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "✅ Lint error fixes applied!"
echo "🧪 Running lint check to see remaining issues..."

# Run lint to see what's left
npm run lint