#!/usr/bin/env node

/**
 * Eliminate Barrel Exports Script
 * 
 * This script automatically replaces all barrel imports from @repo/shared 
 * with direct imports to fix TypeScript circular dependency issues.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of exported items to their source files
const IMPORT_MAP = {
  // Constants
  'STRIPE_ERRORS': 'constants/stripe',
  'PLAN_TYPE': 'constants/billing',
  'UNIT_STATUS': 'constants/properties',
  'LEASE_STATUS': 'constants/leases',
  'LEASE_TYPE': 'constants/leases',
  'REQUEST_STATUS': 'constants/maintenance',
  'PRIORITY': 'constants/maintenance',
  'MAINTENANCE_CATEGORY': 'constants/maintenance',
  'USER_ROLE': 'constants/auth',
  'PROPERTY_STATUS': 'constants/properties',
  'PROPERTY_TYPE': 'constants/properties',
  'TENANT_STATUS': 'constants/tenants',
  
  // Types
  'AuthUser': 'types/auth',
  'UserRole': 'types/auth',
  'User': 'types/auth',
  'Property': 'types/properties',
  'PropertyQuery': 'types/properties',
  'CreatePropertyInput': 'types/properties',
  'UpdatePropertyInput': 'types/properties',
  'PropertyStats': 'types/properties',
  'Tenant': 'types/tenants',
  'CreateTenantInput': 'types/tenants',
  'UpdateTenantInput': 'types/tenants',
  'TenantQuery': 'types/tenants',
  'TenantStats': 'types/tenants',
  'Unit': 'types/properties',
  'CreateUnitInput': 'types/properties',
  'UpdateUnitInput': 'types/properties',
  'UnitQuery': 'types/properties',
  'Lease': 'types/leases',
  'CreateLeaseInput': 'types/leases',
  'UpdateLeaseInput': 'types/leases',
  'LeaseQuery': 'types/leases',
  'MaintenanceRequest': 'types/maintenance',
  'CreateMaintenanceInput': 'types/maintenance',
  'UpdateMaintenanceInput': 'types/maintenance',
  'MaintenanceQuery': 'types/maintenance',
  'CreateActivityInput': 'types/activity',
  'CreateUserInput': 'types/auth',
  'UpdateUserProfileInput': 'types/auth',
  'Plan': 'types/billing',
  'AppError': 'types/errors',
  'ErrorContext': 'types/errors',
  'StandardError': 'types/errors',
  'getErrorLogLevel': 'utils/errors',
  'PaymentError': 'types/errors',
  'UsageMetrics': 'types/usage',
  
  // Missing types - API Inputs
  'EnsureUserExistsInput': 'types/api-inputs',
  
  // Missing types - Billing
  'Subscription': 'types/billing',
  'PaymentMethod': 'types/billing',
  'Invoice': 'types/billing',
  
  // Missing types - Error types
  'AuthError': 'types/errors',
  'ValidationError': 'types/errors',
  'NetworkError': 'types/errors',
  'ServerError': 'types/errors',
  'BusinessError': 'types/errors',
  'FileUploadError': 'types/errors',
  
  // Security types
  'SecurityEventType': 'types/security',
  'SecurityEventSeverity': 'types/security',
  'SecurityAuditLog': 'types/security',
  'SecurityEvent': 'types/security',
  'SecurityMetrics': 'types/security'
};

class BarrelImportFixer {
  constructor() {
    this.backendSrcPath = path.join(__dirname, '../src');
    this.changedFiles = [];
    this.errors = [];
  }

  // Find all TypeScript files that import from @repo/shared
  async findFilesWithBarrelImports() {
    const pattern = path.join(this.backendSrcPath, '**/*.ts');
    const files = glob.sync(pattern, { 
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'] 
    });
    
    const filesWithBarrelImports = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes("from '@repo/shared'")) {
        filesWithBarrelImports.push(file);
      }
    }
    
    return filesWithBarrelImports;
  }

  // Parse imports from a TypeScript file
  parseImports(content) {
    const importRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]@tenantflow\/shared['"]/g;
    const typeImportRegex = /import\s+type\s+{([^}]+)}\s+from\s+['"]@tenantflow\/shared['"]/g;
    const singleImportRegex = /import\s+(?:type\s+)?(\w+)\s+from\s+['"]@tenantflow\/shared['"]/g;
    
    const imports = [];
    let match;

    // Parse multi-import statements
    while ((match = importRegex.exec(content)) !== null) {
      const isTypeOnly = match[0].includes('import type');
      const importList = match[1].split(',').map(imp => imp.trim());
      imports.push({
        originalStatement: match[0],
        imports: importList,
        isTypeOnly,
        index: match.index
      });
    }

    // Parse single imports
    const singleContent = content.replace(importRegex, ''); // Remove multi-imports first
    while ((match = singleImportRegex.exec(singleContent)) !== null) {
      const isTypeOnly = match[0].includes('import type');
      imports.push({
        originalStatement: match[0],
        imports: [match[1]],
        isTypeOnly,
        index: match.index
      });
    }

    return imports;
  }

  // Generate direct import statements
  generateDirectImports(imports) {
    const directImports = new Map();
    
    for (const importData of imports) {
      for (const importName of importData.imports) {
        const cleanImportName = importName.trim();
        const sourcePath = IMPORT_MAP[cleanImportName];
        
        if (!sourcePath) {
          this.errors.push(`Unknown import: ${cleanImportName}`);
          continue;
        }
        
        const fullPath = `@repo/shared/src/${sourcePath}`;
        
        if (!directImports.has(fullPath)) {
          directImports.set(fullPath, {
            types: [],
            values: [],
            isTypeOnly: importData.isTypeOnly
          });
        }
        
        const importGroup = directImports.get(fullPath);
        if (importData.isTypeOnly) {
          importGroup.types.push(cleanImportName);
        } else {
          importGroup.values.push(cleanImportName);
        }
      }
    }
    
    // Generate import statements
    const statements = [];
    for (const [filePath, importGroup] of directImports.entries()) {
      if (importGroup.types.length > 0) {
        statements.push(`import type { ${importGroup.types.join(', ')} } from '${filePath}'`);
      }
      if (importGroup.values.length > 0) {
        statements.push(`import { ${importGroup.values.join(', ')} } from '${filePath}'`);
      }
    }
    
    return statements;
  }

  // Replace barrel imports in a file
  async replaceBarrelImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = this.parseImports(content);
      
      if (imports.length === 0) {
        return false; // No changes needed
      }
      
      const directImportStatements = this.generateDirectImports(imports);
      
      // Remove all barrel import statements
      let newContent = content;
      for (const importData of imports) {
        newContent = newContent.replace(importData.originalStatement, '');
      }
      
      // Add direct imports at the top (after other imports)
      const lines = newContent.split('\n');
      let insertIndex = 0;
      
      // Find the last import statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i + 1;
        }
      }
      
      // Insert direct imports
      lines.splice(insertIndex, 0, ...directImportStatements, '');
      
      // Clean up extra blank lines
      const finalContent = lines
        .filter((line, index, arr) => {
          // Remove multiple consecutive blank lines
          if (line.trim() === '' && arr[index - 1] && arr[index - 1].trim() === '') {
            return false;
          }
          return true;
        })
        .join('\n');
      
      fs.writeFileSync(filePath, finalContent, 'utf8');
      
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ Fixed: ${relativePath}`);
      this.changedFiles.push(relativePath);
      
      return true;
    } catch (error) {
      const relativePath = path.relative(process.cwd(), filePath);
      this.errors.push(`Error processing ${relativePath}: ${error.message}`);
      return false;
    }
  }

  // Main execution function
  async run() {
    console.log('🔍 Finding files with barrel imports...');
    
    const files = await this.findFilesWithBarrelImports();
    console.log(`📁 Found ${files.length} files with barrel imports`);
    
    console.log('\n🔧 Replacing barrel imports with direct imports...');
    
    for (const file of files) {
      await this.replaceBarrelImports(file);
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully processed: ${this.changedFiles.length} files`);
    
    if (this.errors.length > 0) {
      console.log(`❌ Errors encountered: ${this.errors.length}`);
      for (const error of this.errors) {
        console.log(`   ${error}`);
      }
    }
    
    console.log('\n📝 Changed files:');
    for (const file of this.changedFiles) {
      console.log(`   ${file}`);
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Test TypeScript compilation: npm run typecheck');
    console.log('2. Remove barrel export file if all tests pass');
    console.log('3. Update package.json exports');
    
    return {
      changedFiles: this.changedFiles,
      errors: this.errors
    };
  }
}

// Only run if called directly
if (require.main === module) {
  const fixer = new BarrelImportFixer();
  fixer.run().catch(console.error);
}

module.exports = BarrelImportFixer;