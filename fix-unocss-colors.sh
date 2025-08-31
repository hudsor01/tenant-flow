#!/bin/bash

# Fix UnoCSS color patterns to Tailwind CSS conventions
# Convert text-color-X to text-color-X00 format

echo "🎨 Converting UnoCSS color patterns to Tailwind CSS conventions..."

# Define color mappings from UnoCSS single digit to Tailwind 3-digit
declare -A color_map=(
    ["1"]="100"
    ["2"]="200" 
    ["3"]="300"
    ["4"]="400"
    ["5"]="500"
    ["6"]="600"
    ["7"]="700"
    ["8"]="800"
    ["9"]="900"
)

# Function to convert color patterns in a file
convert_colors() {
    local file="$1"
    echo "Processing: $file"
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Apply all color conversions
    cp "$file" "$temp_file"
    
    # Convert text-color-digit patterns
    for digit in "${!color_map[@]}"; do
        value="${color_map[$digit]}"
        
        # text-{color}-{digit} -> text-{color}-{value}
        sed -i.bak "s/text-\([a-z]*\)-$digit\([^0-9]\)/text-\1-$value\2/g" "$temp_file"
        
        # bg-{color}-{digit} -> bg-{color}-{value}  
        sed -i.bak "s/bg-\([a-z]*\)-$digit\([^0-9]\)/bg-\1-$value\2/g" "$temp_file"
        
        # border-{color}-{digit} -> border-{color}-{value}
        sed -i.bak "s/border-\([a-z]*\)-$digit\([^0-9]\)/border-\1-$value\2/g" "$temp_file"
        
        # ring-{color}-{digit} -> ring-{color}-{value}
        sed -i.bak "s/ring-\([a-z]*\)-$digit\([^0-9]\)/ring-\1-$value\2/g" "$temp_file"
        
        # shadow-{color}-{digit} -> shadow-{color}-{value}
        sed -i.bak "s/shadow-\([a-z]*\)-$digit\([^0-9]\)/shadow-\1-$value\2/g" "$temp_file"
    done
    
    # Remove backup files created by sed
    rm -f "$temp_file".bak*
    
    # Replace original file if changes were made
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "✅ Converted colors in $file"
    else
        rm "$temp_file"
        echo "ℹ️  No changes needed in $file"
    fi
}

# Convert colors in all the mentioned files
files=(
    "apps/frontend/src/app/page.tsx"
    "apps/frontend/src/components/billing/payment-methods.tsx"
    "apps/frontend/src/components/landing/blog-header-section.tsx"
    "apps/frontend/src/components/landing/blog-sidebar-section.tsx"
    "apps/frontend/src/components/error/dashboard-error-boundary.tsx"
    "apps/frontend/src/components/data-table/data-table-action-factory.tsx"
    "apps/frontend/src/components/invoice/invoice-items-section.tsx"
    "apps/frontend/src/components/maintenance/maintenance-status-update.tsx"
    "apps/frontend/src/components/modals/base-form-modal.tsx"
    "apps/frontend/src/components/layout/navigation/navigation-group.tsx"
    "apps/frontend/src/components/layout/navigation/navigation-link.tsx"
    "apps/frontend/src/components/onboarding/onboarding-wizard.tsx"
    "apps/frontend/src/components/properties/property-details-drawer.tsx"
    "apps/frontend/src/components/properties/property-form.tsx"
    "apps/frontend/src/components/properties/sections/property-features-section.tsx"
    "apps/frontend/src/components/properties/units/unit-form.tsx"
    "apps/frontend/src/components/ui/offline-indicator.tsx"
)

# Process each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        convert_colors "$file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "🎨 UnoCSS to Tailwind color conversion completed!"