#!/usr/bin/env python3
import os
import re

def fix_file(filepath):
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

# Fix the specific failing files
failing_files = [
    'src/app/contact/page.tsx',
    'src/components/auth/client-auth-guard.tsx',
    'src/components/auth/supabase-auth-processor.tsx',
    'src/components/landing/footer-section.tsx',
    'src/hooks/api/use-dashboard.ts'
]

for file in failing_files:
    if os.path.exists(file):
        fix_file(file)
    else:
        print(f"File not found: {file}")