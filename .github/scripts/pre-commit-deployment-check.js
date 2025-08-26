#!/usr/bin/env node
/**
 * Pre-commit Deployment Safety Check
 * 
 * This runs BEFORE every commit to prevent code that would break Vercel deployment
 * from ever entering the repository. It's the first line of defense.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚧 Pre-commit deployment safety check...');

let hasErrors = false;

try {
  // 1. Quick validation of shared package exports
  const sharedPackagePath = path.join(process.cwd(), 'packages/shared/package.json');
  const sharedPackage = JSON.parse(fs.readFileSync(sharedPackagePath, 'utf8'));
  
  // Check if any new imports were added without corresponding exports
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=AM', { encoding: 'utf8' })
    .split('\n')
    .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter(file => file.startsWith('apps/frontend/'));
  
  const newImports = [];
  
  for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    const importMatches = content.match(/from ['"]@repo\/shared\/[^'"]+['"]/g) || [];
    
    importMatches.forEach(match => {
      const importPath = match.match(/from ['"]([^'"]+)['"]/)[1];
      const subpath = importPath.replace('@repo/shared', '') || '.';
      newImports.push({ file, import: importPath, subpath });
    });
  }
  
  // Validate new imports have exports
  const exports = Object.keys(sharedPackage.exports || {});
  
  for (const { file, import: importPath, subpath } of newImports) {
    const hasExport = exports.includes(subpath) || 
      exports.some(exp => exp.includes('*') && subpath.startsWith(exp.replace('/*', '')));
    
    if (!hasExport) {
      console.error(`❌ ${file}: Import "${importPath}" has no corresponding export in shared package`);
      console.error(`   Add this to packages/shared/package.json exports:`);
      console.error(`   "${subpath}": { "types": "./dist/cjs${subpath}.d.ts", ... }`);
      hasErrors = true;
    }
  }
  
  // 2. Check if package.json exports were modified properly
  const gitDiff = execSync('git diff --cached packages/shared/package.json || echo ""', { encoding: 'utf8' });
  
  if (gitDiff.includes('"exports"')) {
    console.log('📦 Shared package exports were modified - validating structure...');
    
    // Validate JSON structure
    try {
      JSON.parse(fs.readFileSync(sharedPackagePath, 'utf8'));
    } catch (error) {
      console.error('❌ Invalid JSON in packages/shared/package.json');
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    console.error('\n🚫 Pre-commit check failed! These issues would cause Vercel deployment failure.');
    console.error('Fix the export issues above before committing.');
    process.exit(1);
  }
  
  console.log('✅ Pre-commit deployment safety check passed');
  
} catch (error) {
  console.error('❌ Pre-commit validation failed:', error.message);
  process.exit(1);
}