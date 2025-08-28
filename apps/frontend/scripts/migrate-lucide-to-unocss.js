#!/usr/bin/env node

/**
 * Migration Script: Lucide React to UnoCSS Icons
 * 
 * This script automatically migrates all Lucide React icon imports to UnoCSS icon classes.
 * 
 * Changes made:
 * 1. Removes all "from 'lucide-react'" imports
 * 2. Converts icon components to string-based UnoCSS classes
 * 3. Updates icon rendering from <Icon /> to <i className="i-lucide-..." />
 * 
 * UnoCSS Icon Pattern:
 * - Class format: i-lucide-{icon-name}
 * - Icon names are kebab-case (e.g., CheckCircle → check-circle)
 * - Always add "inline-block" class for proper rendering
 * 
 * Example transformations:
 * - import { Home } from 'lucide-react' → (removed)
 * - <Home className="h-4 w-4" /> → <i className="i-lucide-home inline-block h-4 w-4" />
 * - icon: Home → icon: 'i-lucide-home'
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of React component names to UnoCSS icon classes
const iconMap = {
  // Common icons
  'Home': 'i-lucide-home',
  'Building': 'i-lucide-building',
  'Building2': 'i-lucide-building-2',
  'Users': 'i-lucide-users',
  'User': 'i-lucide-user',
  'FileText': 'i-lucide-file-text',
  'Wrench': 'i-lucide-wrench',
  'Settings': 'i-lucide-settings',
  'BarChart3': 'i-lucide-bar-chart-3',
  'Plus': 'i-lucide-plus',
  'Calendar': 'i-lucide-calendar',
  'Phone': 'i-lucide-phone',
  'Mail': 'i-lucide-mail',
  'CheckCircle': 'i-lucide-check-circle',
  'CheckCircle2': 'i-lucide-check-circle-2',
  'AlertTriangle': 'i-lucide-alert-triangle',
  'DollarSign': 'i-lucide-dollar-sign',
  'Shield': 'i-lucide-shield',
  'Bell': 'i-lucide-bell',
  'Clock': 'i-lucide-clock',
  'TrendingUp': 'i-lucide-trending-up',
  'Zap': 'i-lucide-zap',
  'Star': 'i-lucide-star',
  'Calculator': 'i-lucide-calculator',
  'ClipboardList': 'i-lucide-clipboard-list',
  'PlayCircle': 'i-lucide-play-circle',
  'Sparkles': 'i-lucide-sparkles',
  // Add more mappings as needed
};

function convertIconName(componentName) {
  return iconMap[componentName] || `i-lucide-${componentName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Track which icons are imported
  const importedIcons = new Set();
  
  // Find and remove Lucide React imports
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const icons = match[1].split(',').map(icon => icon.trim());
    icons.forEach(icon => importedIcons.add(icon));
    modified = true;
  }
  
  // Remove the import statements
  content = content.replace(importRegex, '');
  
  // Clean up extra newlines left by removed imports
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // For each imported icon, replace its usage
  importedIcons.forEach(iconName => {
    const unoClass = convertIconName(iconName);
    
    // Pattern 1: Direct component usage <Icon className="..." />
    const componentRegex = new RegExp(`<${iconName}\\s+([^/>]*?)\\s*/?>`, 'g');
    content = content.replace(componentRegex, (match, props) => {
      // Extract className if it exists
      const classMatch = props.match(/className=["']([^"']+)["']/);
      const existingClasses = classMatch ? classMatch[1] : '';
      const otherProps = props.replace(/className=["'][^"']+["']/, '').trim();
      
      const newClasses = `${unoClass} inline-block ${existingClasses}`.trim();
      return `<i className="${newClasses}"${otherProps ? ' ' + otherProps : ''} />`;
    });
    
    // Pattern 2: Icon as property value (icon: IconName)
    const propertyRegex = new RegExp(`icon:\\s*${iconName}(?=[,\\s}])`, 'g');
    content = content.replace(propertyRegex, `icon: '${unoClass}'`);
    
    // Pattern 3: Icon variable assignment (const Icon = IconName)
    const variableRegex = new RegExp(`const\\s+\\w+\\s*=\\s*${iconName}(?=[;\\s])`, 'g');
    content = content.replace(variableRegex, (match) => {
      const varName = match.match(/const\\s+(\\w+)/)[1];
      return `const ${varName} = '${unoClass}'`;
    });
    
    // Pattern 4: Icon in JSX expression {IconName}
    const jsxRegex = new RegExp(`\\{${iconName}\\}`, 'g');
    content = content.replace(jsxRegex, `{<i className="${unoClass} inline-block" />}`);
  });
  
  // Pattern 5: Fix any Icon variable usage where Icon is a string now
  content = content.replace(/const\s+Icon\s*=\s*stat\.icon\s*\n\s*return\s*\(/g, 
    'return (');
  content = content.replace(/<Icon\s+className=\{([^}]+)\}\s*\/>/g, 
    '<i className={cn(stat.icon, \'inline-block\', $1)} />');
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const pattern = path.join(srcDir, '**/*.{ts,tsx}');
  
  console.log('🔄 Starting Lucide React to UnoCSS migration...\n');
  
  const files = glob.sync(pattern);
  let migratedCount = 0;
  
  files.forEach(file => {
    if (migrateFile(file)) {
      migratedCount++;
    }
  });
  
  console.log(`\n✨ Migration complete! Migrated ${migratedCount} files.`);
  console.log('\n📝 Next steps:');
  console.log('1. Run npm run typecheck to verify TypeScript compilation');
  console.log('2. Remove lucide-react from package.json: npm uninstall lucide-react');
  console.log('3. Test the application to ensure icons render correctly');
  console.log('\n📚 Documentation:');
  console.log('- UnoCSS icon format: i-lucide-{icon-name}');
  console.log('- Always include "inline-block" class with icon classes');
  console.log('- Icon names are kebab-case (e.g., check-circle, file-text)');
}

// Check if glob is installed
try {
  require.resolve('glob');
  main();
} catch(e) {
  console.log('Installing glob package...');
  require('child_process').execSync('npm install --no-save glob', { stdio: 'inherit' });
  main();
}