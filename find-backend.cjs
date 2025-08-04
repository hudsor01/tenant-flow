#!/usr/bin/env node

const http = require('http');

function testPort(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      if (res.statusCode === 200) {
        resolve(port);
      } else {
        resolve(null);
      }
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    
    req.end();
  });
}

async function findBackend() {
  const ports = [3002, 4600, 5000, 3000, 8000, 3001, 4000];
  console.log('🔍 Searching for backend on common ports...\n');
  
  for (const port of ports) {
    process.stdout.write(`   Trying port ${port}... `);
    const result = await testPort(port);
    if (result) {
      console.log('✅ FOUND!');
      console.log(`\n🎉 Backend is running on port ${port}`);
      return port;
    } else {
      console.log('❌');
    }
  }
  
  console.log('\n❌ Backend not found on any common port');
  return null;
}

findBackend().catch(console.error);