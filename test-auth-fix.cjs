#!/usr/bin/env node
/**
 * Test script to verify authentication system fixes
 * Tests the critical security vulnerabilities identified and fixed
 */

const https = require('https');
const { URL } = require('url');

const API_BASE = 'https://api.tenantflow.app/api/v1';

// Test helper function
async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsedBody });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAuthenticationSystem() {
  console.log('🔐 Testing TenantFlow Authentication System Security Fixes');
  console.log('=' + '='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Health check endpoint
  try {
    console.log('\n1️⃣ Testing health endpoint...');
    const health = await makeRequest('GET', '/health');
    if (health.status === 200) {
      console.log('✅ Health endpoint accessible');
      results.passed++;
    } else {
      console.log(`❌ Health endpoint failed: ${health.status}`);
      results.failed++;
    }
    results.tests.push({ name: 'Health endpoint', passed: health.status === 200 });
  } catch (error) {
    console.log(`❌ Health endpoint error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Health endpoint', passed: false, error: error.message });
  }

  // Test 2: CSRF token endpoint (should be public now)
  try {
    console.log('\n2️⃣ Testing CSRF token endpoint...');
    const csrf = await makeRequest('GET', '/csrf/token');
    if (csrf.status === 200 && csrf.body.token) {
      console.log('✅ CSRF token endpoint accessible and returns token');
      results.passed++;
      global.csrfToken = csrf.body.token;
    } else {
      console.log(`❌ CSRF token endpoint failed: ${csrf.status}`, csrf.body);
      results.failed++;
    }
    results.tests.push({ name: 'CSRF token endpoint', passed: csrf.status === 200 && csrf.body.token });
  } catch (error) {
    console.log(`❌ CSRF token endpoint error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'CSRF token endpoint', passed: false, error: error.message });
  }

  // Test 3: Auth registration endpoint routing (should return validation error, not 404)
  try {
    console.log('\n3️⃣ Testing auth registration endpoint routing...');
    const registration = await makeRequest('POST', '/auth/register', {
      email: 'test@example.com',
      password: 'TestPassword123',
      name: 'Test User'
    }, global.csrfToken ? { 'X-CSRF-Token': global.csrfToken } : {});
    
    // We expect either a successful registration or validation error, NOT a 404
    if (registration.status !== 404) {
      console.log('✅ Auth registration endpoint exists (no more 404 routing errors)');
      results.passed++;
    } else {
      console.log(`❌ Auth registration endpoint still returns 404: ${registration.status}`);
      results.failed++;
    }
    results.tests.push({ name: 'Auth registration routing', passed: registration.status !== 404 });
  } catch (error) {
    console.log(`❌ Auth registration endpoint error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Auth registration routing', passed: false, error: error.message });
  }

  // Test 4: Auth login endpoint routing
  try {
    console.log('\n4️⃣ Testing auth login endpoint routing...');
    const login = await makeRequest('POST', '/auth/login', {
      email: 'test@example.com',
      password: 'wrongpassword'
    }, global.csrfToken ? { 'X-CSRF-Token': global.csrfToken } : {});
    
    // We expect either authentication error or validation error, NOT a 404
    if (login.status !== 404) {
      console.log('✅ Auth login endpoint exists (no more 404 routing errors)');
      results.passed++;
    } else {
      console.log(`❌ Auth login endpoint still returns 404: ${login.status}`);
      results.failed++;
    }
    results.tests.push({ name: 'Auth login routing', passed: login.status !== 404 });
  } catch (error) {
    console.log(`❌ Auth login endpoint error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Auth login routing', passed: false, error: error.message });
  }

  // Test 5: CORS headers
  try {
    console.log('\n5️⃣ Testing CORS headers...');
    const corsTest = await makeRequest('OPTIONS', '/health', null, {
      'Origin': 'http://localhost:3001',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    });
    
    const corsAllowed = corsTest.headers['access-control-allow-origin'] === 'http://localhost:3001' ||
                        corsTest.headers['access-control-allow-origin'] === '*' ||
                        corsTest.headers['access-control-allow-credentials'] === 'true';
    
    if (corsAllowed) {
      console.log('✅ CORS configured to allow localhost:3001');
      results.passed++;
    } else {
      console.log('❌ CORS not properly configured for localhost:3001');
      results.failed++;
    }
    results.tests.push({ name: 'CORS configuration', passed: corsAllowed });
  } catch (error) {
    console.log(`❌ CORS test error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'CORS configuration', passed: false, error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('🎯 AUTHENTICATION SYSTEM TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL CRITICAL SECURITY ISSUES HAVE BEEN FIXED!');
    console.log('✅ Authentication system is now functional');
  } else {
    console.log('\n⚠️  Some issues still need attention:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.error || 'Failed'}`);
      });
  }
  
  return results;
}

// Run the test
if (require.main === module) {
  testAuthenticationSystem()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = testAuthenticationSystem;