#!/usr/bin/env node
/**
 * Deployment Validation Script
 * Prevents Vercel deployment failures by validating architecture before deployment
 * 
 * This script runs BEFORE deployment to catch issues that would cause failures
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Starting deployment validation...');

const failures = [];
const warnings = [];

// 1. Validate package.json exports match actual file structure
function validatePackageExports() {
  console.log('📦 Validating package exports...');
  
  const sharedPackagePath = path.join(process.cwd(), 'packages/shared/package.json');
  const sharedPackage = JSON.parse(fs.readFileSync(sharedPackagePath, 'utf8'));
  
  const exports = sharedPackage.exports || {};
  const srcDir = path.join(process.cwd(), 'packages/shared/src');
  
  for (const [exportPath, config] of Object.entries(exports)) {
    if (exportPath === '.') continue;
    
    // Check if the export path has corresponding source files
    const cleanPath = exportPath.replace('./', '');
    const expectedSrcPath = path.join(srcDir, cleanPath);
    
    if (cleanPath.includes('*')) {
      // Wildcard export - check if directory exists
      const dirPath = cleanPath.replace('/*', '');
      const fullDirPath = path.join(srcDir, dirPath);
      
      if (!fs.existsSync(fullDirPath)) {
        warnings.push(`Export "${exportPath}" references non-existent directory: ${fullDirPath}`);
      }
    } else {
      // Specific export - check for index file or direct file
      const indexPath = path.join(expectedSrcPath, 'index.ts');
      const directPath = `${expectedSrcPath}.ts`;
      
      if (!fs.existsSync(indexPath) && !fs.existsSync(directPath)) {
        failures.push(`Export "${exportPath}" has no corresponding source file at ${indexPath} or ${directPath}`);
      }
    }
  }
  
  console.log(`✅ Package exports validation complete (${failures.length} failures, ${warnings.length} warnings)`);
}

// 2. Validate import statements can be resolved
function validateImports() {
  console.log('🔗 Validating import resolution...');
  
  const frontendSrc = path.join(process.cwd(), 'apps/frontend/src');
  const findImports = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let imports = [];
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        imports.push(...findImports(fullPath));
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const importMatches = content.match(/from ['"]@repo\/shared\/[^'"]+['"]/g) || [];
        
        imports.push(...importMatches.map(match => ({
          file: fullPath,
          import: match.match(/from ['"]([^'"]+)['"]/)[1]
        })));
      }
    }
    
    return imports;
  };
  
  const imports = findImports(frontendSrc);
  const sharedPackagePath = path.join(process.cwd(), 'packages/shared/package.json');
  const sharedPackage = JSON.parse(fs.readFileSync(sharedPackagePath, 'utf8'));
  const exports = Object.keys(sharedPackage.exports || {});
  
  for (const { file, import: importPath } of imports) {
    const subpath = importPath.replace('@repo/shared', '');
    const normalizedSubpath = subpath || '.';
    // Convert /validation to ./validation format to match exports
    const exportPath = normalizedSubpath === '.' ? '.' : `.${normalizedSubpath}`;
    
    // Check exact match first
    const hasExactMatch = exports.includes(exportPath);
    
    // Check wildcard match
    const hasWildcardMatch = exports.some(exp => {
      if (!exp.includes('*')) return false;
      const pattern = exp.replace('/*', '');
      return exportPath.startsWith(pattern) && exportPath !== pattern;
    });
    
    if (!hasExactMatch && !hasWildcardMatch) {
      failures.push(`Import "${importPath}" in ${file} has no corresponding export in shared package`);
    }
  }
  
  console.log(`✅ Import validation complete (${imports.length} imports checked)`);
}

// 3. Validate Vercel build configuration
function validateVercelConfig() {
  console.log('🚀 Validating Vercel configuration...');
  
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  if (!fs.existsSync(vercelPath)) {
    failures.push('vercel.json not found');
    return;
  }
  
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  // Check build command includes memory optimization
  if (!vercelConfig.buildCommand?.includes('NODE_OPTIONS')) {
    warnings.push('Vercel buildCommand missing NODE_OPTIONS memory optimization');
  }
  
  // Check build command follows proper order
  if (!vercelConfig.buildCommand?.includes('build:shared')) {
    failures.push('Vercel buildCommand must build shared package first');
  }
  
  console.log('✅ Vercel configuration validation complete');
}

// 4. Validate TypeScript compilation will succeed (deployment-critical only)
function validateTypeScript() {
  console.log('📝 Validating TypeScript compilation...');
  
  try {
    // Check shared package compiles - CRITICAL for deployment
    execSync('cd packages/shared && npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ Shared package TypeScript validation passed');
  } catch (error) {
    failures.push(`Shared package TypeScript compilation failed: ${error.message}`);
  }
  
  // Frontend compilation checked separately in CI - not blocking for deployment validation
  // This validation focuses on export/import architecture that causes Vercel failures
  console.log('⚠️  Frontend TypeScript compilation checked in CI pipeline');
}

// 5. Validate critical dependencies are available
function validateDependencies() {
  console.log('📚 Validating dependencies...');
  
  const criticalPaths = [
    'node_modules/@repo/shared',
    'node_modules/next',
    'node_modules/react',
    'packages/shared/dist'
  ];
  
  for (const criticalPath of criticalPaths) {
    if (!fs.existsSync(path.join(process.cwd(), criticalPath))) {
      failures.push(`Critical dependency missing: ${criticalPath}`);
    }
  }
  
  console.log('✅ Dependencies validation complete');
}

// Run all validations
async function main() {
  validatePackageExports();
  validateImports();
  validateVercelConfig();
  validateTypeScript();
  validateDependencies();
  
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Successful checks: ${5 - failures.length}/5`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (failures.length > 0) {
    console.log('\n❌ Failures:');
    failures.forEach(failure => console.log(`  - ${failure}`));
    console.log('\n🚫 Deployment validation failed. Fix these issues before deploying.');
    process.exit(1);
  }
  
  console.log('\n🎉 All validations passed! Deployment is safe to proceed.');
}

main().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});