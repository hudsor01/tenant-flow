#!/bin/bash

# Script to resolve merge conflicts by choosing the version with more content/features

echo "🔧 Resolving merge conflicts in backend files..."

# Function to resolve conflicts in a file
resolve_file() {
    local file=$1
    echo "  Processing: $file"
    
    # Create a backup
    cp "$file" "$file.backup"
    
    # Extract both versions and choose the one with more non-empty lines
    # This generally picks the more complete/feature-rich version
    awk '
    /^<<<<<<< HEAD/ { in_conflict = 1; head_content = ""; next }
    /^=======/ { if (in_conflict) { in_merge = 1; merge_content = ""; } next }
    /^>>>>>>> / { 
        if (in_conflict && in_merge) {
            # Count non-empty lines in each version
            head_lines = gsub(/[^\n]+/, "&", head_content)
            merge_lines = gsub(/[^\n]+/, "&", merge_content)
            
            # Choose the version with more content
            if (merge_lines > head_lines) {
                printf "%s", merge_content
            } else {
                printf "%s", head_content
            }
            in_conflict = 0
            in_merge = 0
        }
        next
    }
    {
        if (in_conflict && !in_merge) {
            head_content = head_content $0 "\n"
        } else if (in_conflict && in_merge) {
            merge_content = merge_content $0 "\n"
        } else {
            print
        }
    }
    ' "$file" > "$file.tmp"
    
    mv "$file.tmp" "$file"
    echo "    ✓ Resolved conflicts in $file"
}

# Files with conflicts
files=(
    "apps/backend/src/dashboard/dashboard.service.ts"
    "apps/backend/src/dashboard/dashboard.module.ts"
    "apps/backend/src/maintenance/maintenance.service.ts"
    "apps/backend/src/maintenance/maintenance.module.ts"
    "apps/backend/src/maintenance/maintenance.controller.ts"
    "apps/backend/src/notifications/dto/notification.dto.ts"
    "apps/backend/src/email/email.service.ts"
    "apps/backend/src/shared/guards/unified-auth.guard.ts"
)

for file in "${files[@]}"; do
    if [ -f "/Users/richard/Developer/tenant-flow/$file" ]; then
        resolve_file "/Users/richard/Developer/tenant-flow/$file"
    fi
done

echo "✅ All merge conflicts resolved!"