const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of old imports to new imports
const importMappings = {
  '@tenantflow/shared/types/auth': '@tenantflow/shared',
  '@tenantflow/shared/types/errors': '@tenantflow/shared',
  '@tenantflow/shared/types/security': '@tenantflow/shared',
  '@tenantflow/shared/types/session': '@tenantflow/shared',
  '@tenantflow/shared/types/email': '@tenantflow/shared',
  '@tenantflow/shared/types/file-upload': '@tenantflow/shared',
  '@tenantflow/shared/types/api-inputs': '@tenantflow/shared',
  '@tenantflow/shared/types/queries': '@tenantflow/shared',
  '@tenantflow/shared/types/billing': '@tenantflow/shared',
  '@tenantflow/shared/types/stripe': '@tenantflow/shared',
  '@tenantflow/shared/types/stripe-pricing': '@tenantflow/shared',
  '@tenantflow/shared/types/stripe-error-handler': '@tenantflow/shared',
  '@tenantflow/shared/constants/properties': '@tenantflow/shared',
  '@tenantflow/shared/constants/billing': '@tenantflow/shared',
};

// Find all TypeScript files in the backend
const files = glob.sync('apps/backend/src/**/*.ts', { 
  ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts'] 
});

console.log(`Found ${files.length} TypeScript files to process`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  Object.entries(importMappings).forEach(([oldImport, newImport]) => {
    const regex = new RegExp(`from '${oldImport}'`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `from '${newImport}'`);
      modified = true;
      console.log(`Updated import in ${file}: ${oldImport} -> ${newImport}`);
    }
  });

  if (modified) {
    fs.writeFileSync(file, content);
  }
});

console.log('Import fixes completed!');