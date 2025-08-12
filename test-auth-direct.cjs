// Direct test of authentication flow using environment variables
const https = require('https');

// Test configuration - using environment variables only
const API_URL = 'https://api.tenantflow.app';
const FRONTEND_URL = 'http://localhost:3001';

console.log('🔍 Testing Authentication System...\n');

// Test 1: API Health Check
function testAPIHealth() {
  return new Promise((resolve) => {
    https.get(`${API_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ API Health: ${res.statusCode} - ${data}`);
        resolve(res.statusCode === 200);
      });
    }).on('error', (err) => {
      console.log(`❌ API Health: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: Auth Endpoint
function testAuthEndpoint() {
  return new Promise((resolve) => {
    https.get(`${API_URL}/api/v1/auth/me`, (res) => {
      console.log(`✅ Auth Endpoint: ${res.statusCode} (401 expected when not authenticated)`);
      resolve(res.statusCode === 401);
    }).on('error', (err) => {
      console.log(`❌ Auth Endpoint: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 3: Frontend Accessibility
function testFrontend() {
  return new Promise((resolve) => {
    const http = require('http');
    http.get(FRONTEND_URL, (res) => {
      console.log(`✅ Frontend: ${res.statusCode} at ${FRONTEND_URL}`);
      resolve(res.statusCode === 200 || res.statusCode === 307);
    }).on('error', (err) => {
      console.log(`❌ Frontend: ${err.message}`);
      resolve(false);
    });
  });
}

// Run all tests
async function runTests() {
  console.log('Running authentication system tests...\n');
  
  const apiHealthOk = await testAPIHealth();
  const authEndpointOk = await testAuthEndpoint();
  const frontendOk = await testFrontend();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log('='.repeat(50));
  
  if (apiHealthOk && authEndpointOk && frontendOk) {
    console.log('✅ All core systems operational');
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Open http://localhost:3001/auth/signup');
    console.log('2. Fill in the signup form');
    console.log('3. Check browser console for any errors');
    console.log('4. Monitor network tab for failed requests');
  } else {
    console.log('❌ Some systems are not responding correctly');
    console.log('\n🔧 TROUBLESHOOTING:');
    if (!apiHealthOk) console.log('- Check if backend is deployed on Railway');
    if (!authEndpointOk) console.log('- Verify API routes are configured correctly');
    if (!frontendOk) console.log('- Ensure frontend is running: npm run dev');
  }
  
  console.log('='.repeat(50));
}

runTests();