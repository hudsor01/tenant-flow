#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the package.json
const packagePath = process.argv[2] || './package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Remove dev dependencies
delete pkg.devDependencies;

// Remove scripts that aren't needed in production
const productionScripts = {
  start: pkg.scripts.start,
  'start:prod': pkg.scripts['start:prod'],
  'migrate:deploy': pkg.scripts['migrate:deploy']
};
pkg.scripts = productionScripts;

// Write the cleaned package.json
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
console.log('✅ Cleaned package.json for production');