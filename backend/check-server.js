#!/usr/bin/env node

const http = require('http');

console.log('🔍 Checking if NestJS server is running on port 3001...');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Server is responding! Status: ${res.statusCode}`);
  console.log('📡 Server is successfully running on port 3001');
  process.exit(0);
});

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('❌ Server is not running on port 3001');
    console.log('💡 Try starting the server with: npm run dev');
  } else {
    console.log('❌ Error connecting to server:', err.message);
  }
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏰ Connection timed out');
  req.destroy();
  process.exit(1);
});

req.setTimeout(5000);
req.end();