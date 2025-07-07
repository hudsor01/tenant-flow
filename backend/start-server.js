#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting NestJS development server...');

process.chdir('/Users/richard/Developer/tenant-flow/backend');

try {
  // Step 1: Clean and prepare
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  // Step 2: Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Step 3: Compile TypeScript
  console.log('🔄 Compiling TypeScript...');
  execSync('npx tsc --project tsconfig.json', { stdio: 'inherit' });
  
  // Step 4: Check if main.js exists
  if (!fs.existsSync('dist/main.js')) {
    console.error('❌ Compilation failed - main.js not found');
    process.exit(1);
  }
  
  console.log('✅ Compilation successful!');
  console.log('🚀 Starting the server...');
  
  // Step 5: Start the server
  const serverProcess = spawn('node', ['dist/main.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`🛑 Server exited with code ${code}`);
  });
  
  serverProcess.on('error', (err) => {
    console.error('❌ Server error:', err.message);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}