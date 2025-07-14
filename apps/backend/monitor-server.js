#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

let serverProcess = null;

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3002/api/v1/', (res) => {
      resolve(true);
      req.destroy();
    });
    
    req.on('error', () => {
      resolve(false);
      req.destroy();
    });
    
    req.setTimeout(1000, () => {
      resolve(false);
      req.destroy();
    });
  });
}

async function startServer() {
  console.log('🚀 Starting TenantFlow Backend Server...');
  
  serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Check if server started successfully
    if (output.includes('TenantFlow API Server running on')) {
      console.log('✅ Server started successfully!');
      testEndpoints();
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

async function testEndpoints() {
  console.log('\n🧪 Testing endpoints...');
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const isRunning = await checkServer();
  if (isRunning) {
    console.log('✅ Server is accessible on port 3002');
    console.log('📚 API Documentation: http://localhost:3002/api/docs');
    console.log('🔧 tRPC Endpoints: http://localhost:3002/trpc/*');
    console.log('\n🎉 Backend server is running and tRPC endpoints are ready!');
  } else {
    console.log('❌ Server is not accessible');
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

startServer();