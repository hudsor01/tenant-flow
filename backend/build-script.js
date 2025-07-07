#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting NestJS build process...');

process.chdir('/Users/richard/Developer/tenant-flow/backend');

try {
  // Step 1: Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Step 2: Build NestJS application
  console.log('🔄 Building NestJS application...');
  execSync('npx nest build', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  
  // Step 3: Try to start the application
  console.log('🚀 Starting the application...');
  execSync('npm run start', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}