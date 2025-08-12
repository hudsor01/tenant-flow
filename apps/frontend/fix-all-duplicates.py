#!/usr/bin/env python3
import os
import glob

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Remove duplicate logger imports - keep only the first one
        lines = content.split('\n')
        new_lines = []
        logger_import_seen = False
        
        for line in lines:
            if "import { logger } from '@/lib/logger'" in line and logger_import_seen:
                # Skip duplicate logger import
                continue
            elif "import { logger } from '@/lib/logger'" in line:
                # First logger import, keep it
                logger_import_seen = True
                new_lines.append(line)
            else:
                new_lines.append(line)
        
        # Write back
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        
        print(f"Fixed: {filepath}")
        return True
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
        return False

# Find all TypeScript and TSX files
files_to_fix = []
for pattern in ['src/**/*.ts', 'src/**/*.tsx']:
    files_to_fix.extend(glob.glob(pattern, recursive=True))

fixed_count = 0
for file in files_to_fix:
    if os.path.exists(file):
        if fix_file(file):
            fixed_count += 1

print(f"\nFixed {fixed_count} files")