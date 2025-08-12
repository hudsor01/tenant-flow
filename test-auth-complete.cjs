// Complete authentication system test
const https = require('https');
const http = require('http');

console.log('🔍 COMPREHENSIVE AUTHENTICATION SYSTEM TEST\n');
console.log('=' .repeat(60));

// Test results tracker
let testsPass = 0;
let testsFail = 0;

async function testEndpoint(name, url, expectedStatus) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const pass = res.statusCode === expectedStatus;
      if (pass) {
        console.log(`✅ ${name}: ${res.statusCode} (expected ${expectedStatus})`);
        testsPass++;
      } else {
        console.log(`❌ ${name}: ${res.statusCode} (expected ${expectedStatus})`);
        testsFail++;
      }
      resolve(pass);
    }).on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      testsFail++;
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('\n📡 BACKEND API TESTS:');
  console.log('-'.repeat(40));
  
  // Test backend health
  await testEndpoint('Health Check', 'https://api.tenantflow.app/health', 200);
  
  // Test auth endpoints
  await testEndpoint('Auth Me (unauthenticated)', 'https://api.tenantflow.app/api/v1/auth/me', 401);
  await testEndpoint('CSRF Token', 'https://api.tenantflow.app/api/v1/csrf/token', 200);
  
  console.log('\n🖥️  FRONTEND TESTS:');
  console.log('-'.repeat(40));
  
  // Test frontend pages
  await testEndpoint('Homepage', 'http://localhost:3000/', 200);
  await testEndpoint('Signup Page', 'http://localhost:3000/auth/signup', 200);
  await testEndpoint('Login Page', 'http://localhost:3000/auth/login', 200);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPass}`);
  console.log(`❌ Tests Failed: ${testsFail}`);
  
  if (testsFail === 0) {
    console.log('\n🎉 SUCCESS: All authentication system components are working!');
    console.log('\n📝 NEXT STEPS TO TEST SIGNUP:');
    console.log('1. Open http://localhost:3000/auth/signup');
    console.log('2. Fill in all fields:');
    console.log('   - Full Name');
    console.log('   - Email');
    console.log('   - Password');
    console.log('   - Confirm Password');
    console.log('3. Click "Create account"');
    console.log('4. Check your email for verification link');
  } else {
    console.log('\n⚠️  WARNING: Some components are not working correctly');
    console.log('Please check the failed tests above');
  }
  
  console.log('='.repeat(60));
}

runTests();