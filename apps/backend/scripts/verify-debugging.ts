#!/usr/bin/env node

/**
 * Verify API Debugging Functionality
 * 
 * Simple script to verify the debugging tools are properly set up
 */

console.log('🔍 Verifying API Debugging Setup');
console.log('==================================');

// Check if required files exist
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'scripts/api-debugger.ts',
  'scripts/debug-api.ts',
  'DEBUGGING.md'
];

let allFilesExist = true;

for (const filePath of filesToCheck) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${filePath}: ${exists ? 'Found' : 'Missing'}`);
  if (!exists) allFilesExist = false;
}

// Check package.json script
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const hasDebugScript = packageJson.scripts && packageJson.scripts['debug:api'];
console.log(`${hasDebugScript ? '✅' : '❌'} Package script "debug:api": ${hasDebugScript ? 'Present' : 'Missing'}`);

console.log('\n📋 Setup Summary:');
console.log('- API Debugger utility created');
console.log('- Debug script created'); 
console.log('- Documentation written');
console.log('- Package script added');

if (allFilesExist && hasDebugScript) {
  console.log('\n🎉 All debugging components are properly set up!');
  console.log('\nTo use the debugger:');
  console.log('1. Run: pnpm debug:api');
  console.log('2. Or import APIDebugger directly in your code');
} else {
  console.log('\n⚠️  Some components are missing. Please check the setup.');
}

console.log('\n📚 Documentation: apps/backend/DEBUGGING.md');