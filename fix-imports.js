const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common missing imports based on the errors
const commonImports = {
  'Button': "@/components/ui/button",
  'Card': "@/components/ui/card",
  'Badge': "@/components/ui/badge",
  'Input': "@/components/ui/input",
  'Label': "@/components/ui/label",
  'Separator': "@/components/ui/separator",
  'Skeleton': "@/components/ui/skeleton",
  'Sheet': "@/components/ui/sheet",
  'SheetContent': "@/components/ui/sheet",
  'Tooltip': "@/components/ui/tooltip",
  'TooltipContent': "@/components/ui/tooltip",
  'TooltipProvider': "@/components/ui/tooltip",
  'TooltipTrigger': "@/components/ui/tooltip",
  'toggleVariants': "@/components/ui/toggle",
  'TimelineContent': "@/components/ui/timeline"
};

// Fix imports in a file
function fixFileImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const usedComponents = new Set();

  // Find which components are used in the file
  Object.keys(commonImports).forEach(component => {
    // Check if component is used (as JSX or reference)
    const regex = new RegExp(`<${component}[\\s>]|${component}[\\s\\.\\(]`, 'g');
    if (regex.test(content)) {
      usedComponents.add(component);
    }
  });

  if (usedComponents.size === 0) return;

  // Group components by import path
  const importGroups = {};
  usedComponents.forEach(component => {
    const importPath = commonImports[component];
    if (!importGroups[importPath]) {
      importGroups[importPath] = [];
    }
    importGroups[importPath].push(component);
  });

  // Check if imports already exist
  Object.entries(importGroups).forEach(([importPath, components]) => {
    const importRegex = new RegExp(`from ['"]${importPath.replace('/', '\\/')}['"]`);
    if (!importRegex.test(content)) {
      // Add import at the top after 'use client' if present
      const importStatement = `import { ${components.join(', ')} } from '${importPath}'`;

      if (content.startsWith("'use client'")) {
        content = content.replace("'use client'\n", `'use client'\n\n${importStatement}\n`);
      } else {
        content = `${importStatement}\n${content}`;
      }
      modified = true;
      console.log(`Fixed imports in ${filePath}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
  }
}

// Find all TSX files in frontend
const files = glob.sync('apps/frontend/src/**/*.tsx', {
  ignore: ['**/node_modules/**', '**/.next/**']
});

console.log(`Found ${files.length} TSX files to check...`);

files.forEach(file => {
  try {
    fixFileImports(file);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Import fixing complete!');