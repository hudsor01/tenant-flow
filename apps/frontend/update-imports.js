#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Define the import mappings
const importMappings = {
  // Auth
  'AuthError': '@tenantflow/shared/src/types/errors',
  
  // Billing
  'PLAN_TYPE': '@tenantflow/shared/src/constants/billing',
  'PlanType': '@tenantflow/shared/src/types/billing',
  
  // Lease Generator
  'LeaseGeneratorForm': '@tenantflow/shared/src/types/lease-generator',
  'LeaseOutputFormat': '@tenantflow/shared/src/types/lease-generator',
  'LeaseFormData': '@tenantflow/shared/src/types/lease-generator',
  'leaseFormSchema': '@tenantflow/shared/src/types/lease-generator',
  
  // Properties
  'Property': '@tenantflow/shared/src/types/properties',
  'PropertyWithDetails': '@tenantflow/shared/src/types/properties',
  'PropertyWithUnitsAndLeases': '@tenantflow/shared/src/types/properties',
  
  // Units
  'Unit': '@tenantflow/shared/src/types/properties',
  'UnitStatus': '@tenantflow/shared/src/types/properties',
  'UNIT_STATUS': '@tenantflow/shared/src/constants/properties',
  
  // Tenants
  'Tenant': '@tenantflow/shared/src/types/tenants',
  
  // Leases
  'Lease': '@tenantflow/shared/src/types/leases',
  
  // Auth
  'User': '@tenantflow/shared/src/types/auth',
  
  // Maintenance
  'MaintenanceRequest': '@tenantflow/shared/src/types/maintenance',
  
  // Lease Generator Usage
  'LeaseGeneratorUsage': '@tenantflow/shared/src/types/lease-generator',
};

// Function to update imports in a file
function updateFileImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Find all imports from @tenantflow/shared
  const importRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]@tenantflow\/shared['"]/g;
  const singleImportRegex = /import\s+(?:type\s+)?(\w+)\s+from\s+['"]@tenantflow\/shared['"]/g;
  
  content = content.replace(importRegex, (match, imports) => {
    const importList = imports.split(',').map(imp => imp.trim());
    const groupedImports = {};
    
    importList.forEach(imp => {
      const importName = imp.replace(/^type\s+/, '').trim();
      const hasType = imp.includes('type ');
      
      Object.keys(importMappings).forEach(key => {
        if (importName === key || importName.startsWith(key + ' as')) {
          const targetPath = importMappings[key];
          if (!groupedImports[targetPath]) {
            groupedImports[targetPath] = [];
          }
          groupedImports[targetPath].push(hasType ? `type ${importName}` : importName);
        }
      });
    });
    
    if (Object.keys(groupedImports).length > 0) {
      updated = true;
      return Object.entries(groupedImports)
        .map(([targetPath, imports]) => `import { ${imports.join(', ')} } from '${targetPath}'`)
        .join('\n');
    }
    
    return match;
  });
  
  // Handle single imports
  content = content.replace(singleImportRegex, (match, importName) => {
    const hasType = match.includes('type ');
    const cleanImportName = importName.trim();
    
    if (importMappings[cleanImportName]) {
      updated = true;
      return `import ${hasType ? 'type ' : ''}${cleanImportName} from '${importMappings[cleanImportName]}'`;
    }
    
    return match;
  });
  
  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
  }
}

// Find all TypeScript files in the frontend app
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: '/Users/richard/Developer/tenant-flow/apps/frontend',
  absolute: true
});

console.log(`Found ${files.length} files to process...`);

files.forEach(file => {
  try {
    updateFileImports(file);
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
});

console.log('✨ Import update complete!');