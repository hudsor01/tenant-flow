#!/usr/bin/env python3

import os
import re
import sys

def fix_orphaned_syntax(file_path):
    """Fix orphaned syntax in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        lines = content.split('\n')
        new_lines = []
        i = 0
        changes = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Check if this line contains handleErrorEnhanced with closing parenthesis
            if 'handleErrorEnhanced(' in line and line.strip().endswith(')'):
                new_lines.append(line)
                i += 1
                
                # Skip orphaned property lines until we find })
                while i < len(lines):
                    next_line = lines[i].strip()
                    
                    # If this looks like an orphaned property (key: value,)
                    if (next_line and 
                        ':' in next_line and 
                        (next_line.endswith(',') or next_line.endswith('}') or next_line.endswith('})')) and
                        not next_line.startswith('//') and
                        not next_line.startswith('*')):
                        
                        # Skip this orphaned line
                        changes += 1
                        i += 1
                        
                        # If this line ends with }), we're done with this orphaned block
                        if next_line.endswith('})'):
                            break
                    else:
                        # This is not an orphaned line, keep it
                        new_lines.append(lines[i])
                        break
            else:
                new_lines.append(line)
                i += 1
        
        new_content = '\n'.join(new_lines)
        
        if new_content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return changes
        
        return 0
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return 0

def main():
    """Main function to process all TypeScript files"""
    src_dir = 'src'
    if not os.path.exists(src_dir):
        print("Error: src directory not found")
        sys.exit(1)
    
    total_files = 0
    files_changed = 0
    total_changes = 0
    
    print("🔧 Fixing orphaned syntax from handleErrorEnhanced method calls...")
    
    # Walk through all TypeScript files
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts'):
                file_path = os.path.join(root, file)
                total_files += 1
                
                changes = fix_orphaned_syntax(file_path)
                if changes > 0:
                    files_changed += 1
                    total_changes += changes
                    print(f"  ✅ Fixed {changes} orphaned blocks in: {file_path}")
    
    print(f"\n🎉 Completed fixing orphaned syntax!")
    print(f"📊 Files processed: {total_files}")
    print(f"📊 Files changed: {files_changed}")
    print(f"📊 Total orphaned blocks removed: {total_changes}")
    
    if files_changed > 0:
        print("\n🧪 Running TypeScript check...")
        os.system("npx tsc --noEmit")

if __name__ == "__main__":
    main()