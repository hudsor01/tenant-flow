#!/usr/bin/env node

/**
 * MASS TYPE MIGRATION SCRIPT
 * Systematically replaces all inline types with imports from @repo/shared
 */

const fs = require('fs');
const path = require('path');

// Map of inline types to centralized imports
const TYPE_MIGRATIONS = {
  // Priority type (6 duplicates)
  "export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'": "import type { Priority } from '@repo/shared'",
  "type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'": "import type { Priority } from '@repo/shared'",
  "type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'": "import type { Priority } from '@repo/shared'",
  
  // LeaseStatus type (4 duplicates)
  "export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'": "import type { LeaseStatus } from '@repo/shared'",
  "type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED'": "import type { LeaseStatus } from '@repo/shared'",
  
  // MaintenanceStatus type (3 duplicates)
  "export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'": "import type { MaintenanceStatus } from '@repo/shared'",
  "type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'": "import type { MaintenanceStatus } from '@repo/shared'",
  
  // PropertyStatus type
  "export type PropertyStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'": "import type { PropertyStatus } from '@repo/shared'",
  "type PropertyStatus = 'ACTIVE' | 'INACTIVE'": "import type { PropertyStatus } from '@repo/shared'",
};

// Interface migrations (bigger patterns)
const INTERFACE_MIGRATIONS = [
  {
    pattern: /export interface PropertyFormData \{[^}]*\}/gs,
    replacement: "import type { PropertyFormData } from '@repo/shared'"
  },
  {
    pattern: /export interface LeaseFormData \{[^}]*\}/gs,
    replacement: "import type { LeaseFormData } from '@repo/shared'"
  },
  {
    pattern: /export interface MaintenanceFormData \{[^}]*\}/gs,
    replacement: "import type { MaintenanceFormData } from '@repo/shared'"
  }
];

function findTypeScriptFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !['node_modules', '.next', 'dist', '.turbo'].includes(entry.name)) {
      findTypeScriptFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // Skip shared package files (they're the source of truth)
  if (filePath.includes('/packages/shared/')) {
    return { changes: 0, path: filePath };
  }
  
  // Replace simple type exports
  for (const [oldType, newImport] of Object.entries(TYPE_MIGRATIONS)) {
    if (content.includes(oldType)) {
      content = content.replace(oldType, newImport);
      changes++;
    }
  }
  
  // Replace complex interface patterns
  for (const { pattern, replacement } of INTERFACE_MIGRATIONS) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes++;
    }
  }
  
  // Write back if changes were made
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { changes, path: filePath };
}

function main() {
  console.log('🚀 Starting mass type migration...');
  
  const rootDirs = ['apps/frontend/src', 'apps/backend/src'];
  let totalFiles = 0;
  let totalChanges = 0;
  
  for (const dir of rootDirs) {
    if (fs.existsSync(dir)) {
      console.log(`📁 Processing directory: ${dir}`);
      const files = findTypeScriptFiles(dir);
      
      for (const file of files) {
        const result = migrateFile(file);
        if (result.changes > 0) {
          console.log(`✅ ${result.path}: ${result.changes} migrations`);
          totalChanges += result.changes;
        }
        totalFiles++;
      }
    }
  }
  
  console.log(`\n🎉 Migration complete!`);
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`🔄 Total migrations: ${totalChanges}`);
}

if (require.main === module) {
  main();
}