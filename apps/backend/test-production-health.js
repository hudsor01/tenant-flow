#!/usr/bin/env node

/**
 * Test health check endpoints as Railway would in production
 * This simulates Railway's health check behavior
 */

const http = require('http');

const PORT = process.env.PORT || 4600;
const HOST = 'localhost';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 5000, // Railway uses 30s but we'll use 5s for testing
      headers: {
        'User-Agent': 'Railway-HealthCheck/1.0',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode === expectedStatus;
        
        resolve({
          path,
          success,
          statusCode: res.statusCode,
          responseTime,
          data: data ? JSON.parse(data) : null,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        path,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        success: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime
      });
    });
    
    req.end();
  });
}

async function runHealthChecks() {
  log('\\n=== Railway Production Health Check Simulation ===\\n', 'bright');
  log(`Testing server at http://${HOST}:${PORT}`, 'cyan');
  log('This simulates how Railway would check your health endpoints\\n', 'cyan');
  
  // Test all health endpoints
  const endpoints = [
    { path: '/ping', name: 'Quick Ping (Railway config)' },
    { path: '/health', name: 'Full Health Check' },
    { path: '/', name: 'Root Endpoint' },
    { path: '/health/detailed', name: 'Detailed Health' }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    log(`Testing ${endpoint.name}: ${endpoint.path}`, 'blue');
    
    const result = await testEndpoint(endpoint.path);
    
    if (result.success) {
      log(`  ✅ SUCCESS - Status: ${result.statusCode} - Time: ${result.responseTime}ms`, 'green');
      
      if (result.data) {
        log(`  Response: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`, 'green');
      }
    } else {
      allPassed = false;
      log(`  ❌ FAILED - ${result.error || `Status: ${result.statusCode}`} - Time: ${result.responseTime}ms`, 'red');
      
      if (result.statusCode && result.statusCode !== 200) {
        log(`  Unexpected status code: ${result.statusCode}`, 'yellow');
      }
    }
    
    log(''); // Empty line for readability
  }
  
  // Summary
  log('=== Health Check Summary ===', 'bright');
  
  if (allPassed) {
    log('✅ All health checks passed!', 'green');
    log('Your app should work on Railway with the current configuration.', 'green');
  } else {
    log('❌ Some health checks failed!', 'red');
    log('Railway deployment will fail with these issues.', 'red');
    log('\\nCommon issues:', 'yellow');
    log('1. Server not running on the correct port', 'yellow');
    log('2. Health endpoints not properly configured', 'yellow');
    log('3. Database connection issues', 'yellow');
    log('4. Missing environment variables', 'yellow');
  }
  
  // Railway-specific recommendations
  log('\\n=== Railway Configuration ===', 'bright');
  log('Your railway.toml has:', 'cyan');
  log('  healthcheckPath = "/ping"', 'cyan');
  log('  healthcheckTimeout = 30', 'cyan');
  log('\\nMake sure:', 'yellow');
  log('1. /ping endpoint returns 200 OK quickly (< 1 second)', 'yellow');
  log('2. Database checks have timeouts to prevent hanging', 'yellow');
  log('3. The endpoint works without authentication', 'yellow');
}

// Check if server is running first
const checkServer = http.get(`http://${HOST}:${PORT}/`, (res) => {
  runHealthChecks();
}).on('error', (err) => {
  log('❌ Server is not running!', 'red');
  log(`Please start the server first: NODE_ENV=development PORT=${PORT} npm run start`, 'yellow');
  process.exit(1);
});