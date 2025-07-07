#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');

console.log('🔄 Final test - recompiling and starting server...');

process.chdir('/Users/richard/Developer/tenant-flow/backend');

try {
  // Clean and recompile
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🔄 Compiling TypeScript...');
  execSync('npx tsc src/main.ts --outDir dist --module commonjs --target ES2022 --esModuleInterop --experimentalDecorators --emitDecoratorMetadata --skipLibCheck', { stdio: 'inherit' });
  
  console.log('🚀 Starting server...');
  const serverProcess = spawn('node', ['dist/main.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  // Let it run for a bit to capture startup logs
  setTimeout(() => {
    console.log('\n✅ Server startup test completed - check output above for results');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  }, 10000);
  
  serverProcess.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}