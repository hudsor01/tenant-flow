#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix all controller test files to use proper mocks
const testFiles = [
  'src/dashboard/dashboard.controller.spec.ts',
  'src/properties/properties.controller.spec.ts',
  'src/tenants/tenants.controller.spec.ts',
  'src/units/units.controller.spec.ts',
  'src/notifications/notifications.controller.spec.ts',
  'src/leases/leases.controller.spec.ts',
  'src/maintenance/maintenance.controller.spec.ts',
  'src/database/supabase.service.spec.ts'
];

// Function to add import statement if not present
function addMockImport(content) {
  const importLine = `import { createMockUser, createMockDashboardStats, createMockPropertyStats, createMockPropertyRequest, createMockTenantRequest, createMockUnitRequest } from '../test-utils/mocks'`;

  // Check if already imported
  if (content.includes('test-utils/mocks')) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import .* from .*$/gm;
  const matches = [...content.matchAll(importRegex)];
  if (matches.length > 0) {
    const lastImport = matches[matches.length - 1];
    const insertIndex = lastImport.index + lastImport[0].length;
    return content.slice(0, insertIndex) + '\n' + importLine + content.slice(insertIndex);
  }

  return content;
}

// Fix each test file
testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add mock imports
  const newContent = addMockImport(content);
  if (newContent !== content) {
    content = newContent;
    modified = true;
  }

  // Replace old mock user patterns
  content = content.replace(
    /const mockUser(?:\s*:\s*(?:authUser|User))?\s*=\s*\{[\s\S]*?id:\s*['"][\w-]+['"][\s\S]*?\}(?:\s*as\s*(?:authUser|User))?/g,
    (match) => {
      if (match.includes('app_metadata') || match.includes('created_at')) {
        return match; // Already fixed
      }
      const idMatch = match.match(/id:\s*['"]([\w-]+)['"]/);
      const id = idMatch ? idMatch[1] : 'user-123';
      modified = true;
      return `const mockUser = createMockUser({ id: '${id}' })`;
    }
  );

  // Replace phone: null patterns
  content = content.replace(/phone:\s*null/g, (match) => {
    modified = true;
    return `phone: undefined`;
  });

  // Replace organizationId: null patterns
  content = content.replace(/organizationId:\s*null/g, (match) => {
    modified = true;
    return `organizationId: undefined`;
  });

  // Fix property type enum values
  content = content.replace(/"apartment"/g, '"APARTMENT"');
  content = content.replace(/"single_family"/g, '"SINGLE_FAMILY"');
  content = content.replace(/"multi_family"/g, '"MULTI_FAMILY"');
  content = content.replace(/"condo"/g, '"CONDO"');
  content = content.replace(/"townhouse"/g, '"TOWNHOUSE"');
  content = content.replace(/"commercial"/g, '"COMMERCIAL"');

  // Fix unit status enum values
  content = content.replace(/status:\s*['"]VACANT['"]/g, `status: 'AVAILABLE'`);
  content = content.replace(/status:\s*['"]OCCUPIED['"]/g, `status: 'OCCUPIED'`);

  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${file}`);
  } else {
    console.log(`⏭️  No changes needed for ${file}`);
  }
});

console.log('Done fixing test files!');