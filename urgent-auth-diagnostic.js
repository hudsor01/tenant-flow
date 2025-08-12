/**
 * URGENT AUTH DIAGNOSTIC - IMMEDIATE EXECUTION
 * 
 * This script can be run directly in Node.js to test critical auth system components
 * Run with: node urgent-auth-diagnostic.js
 */

import https from 'https';
import http from 'http';
import net from 'net';

console.log('🚨 URGENT AUTH DIAGNOSTIC STARTING...');
console.log('='.repeat(60));

const tests = {
  apiHealth: false,
  apiAuth: false,
  frontendRunning: false,
  supabaseConnectivity: false
};

const errors = [];
const details = [];

// Test 1: API Health Check
function testApiHealth() {
  return new Promise((resolve) => {
    console.log('🔍 Testing API health endpoint...');
    
    const req = https.request('https://api.tenantflow.app/health', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        tests.apiHealth = res.statusCode === 200;
        
        if (tests.apiHealth) {
          console.log('✅ API health check: PASSED');
          details.push(`API Health: ${res.statusCode} - ${data.substring(0, 100)}`);
        } else {
          console.log(`❌ API health check: FAILED (${res.statusCode})`);
          errors.push(`API Health: ${res.statusCode} - ${data.substring(0, 100)}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ API health check: ERROR -', error.message);
      errors.push(`API Health Error: ${error.message}`);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ API health check: TIMEOUT');
      errors.push('API Health: Request timeout');
      req.abort();
      resolve();
    });
    
    req.end();
  });
}

// Test 2: API Auth Endpoint (should return 401)
function testApiAuth() {
  return new Promise((resolve) => {
    console.log('🔍 Testing API auth endpoint...');
    
    const req = https.request('https://api.tenantflow.app/api/v1/auth/me', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        tests.apiAuth = res.statusCode === 401; // Should be 401 when not authenticated
        
        if (tests.apiAuth) {
          console.log('✅ API auth endpoint: PASSED (401 as expected)');
          details.push(`API Auth: ${res.statusCode} - Correctly returns 401 for unauthenticated requests`);
        } else {
          console.log(`❌ API auth endpoint: UNEXPECTED STATUS (${res.statusCode})`);
          errors.push(`API Auth: Expected 401, got ${res.statusCode} - ${data.substring(0, 100)}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ API auth endpoint: ERROR -', error.message);
      errors.push(`API Auth Error: ${error.message}`);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ API auth endpoint: TIMEOUT');
      errors.push('API Auth: Request timeout');
      req.abort();
      resolve();
    });
    
    req.end();
  });
}

// Test 3: Frontend Server Check
function testFrontend() {
  return new Promise((resolve) => {
    console.log('🔍 Testing frontend server...');
    
    const req = http.request('http://localhost:3001', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        tests.frontendRunning = res.statusCode === 200;
        
        if (tests.frontendRunning) {
          console.log('✅ Frontend server: RUNNING');
          details.push('Frontend: Server is running on localhost:3001');
        } else {
          console.log(`❌ Frontend server: UNEXPECTED STATUS (${res.statusCode})`);
          errors.push(`Frontend: Status ${res.statusCode}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Frontend server: NOT RUNNING -', error.message);
      errors.push(`Frontend Error: ${error.message}`);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Frontend server: TIMEOUT');
      errors.push('Frontend: Request timeout');
      req.abort();
      resolve();
    });
    
    req.end();
  });
}

// Test 4: Supabase Connectivity (basic)
function testSupabase() {
  return new Promise((resolve) => {
    console.log('🔍 Testing Supabase connectivity...');
    
    // Try to reach the Supabase API (this will likely fail without proper auth, but we can check connectivity)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    
    if (supabaseUrl === 'https://placeholder.supabase.co') {
      console.log('❌ Supabase: No URL configured');
      errors.push('Supabase: NEXT_PUBLIC_SUPABASE_URL not set');
      resolve();
      return;
    }
    
    const url = new URL(supabaseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      tests.supabaseConnectivity = res.statusCode < 500; // Any response below 500 means connectivity works
      
      if (tests.supabaseConnectivity) {
        console.log(`✅ Supabase connectivity: WORKING (${res.statusCode})`);
        details.push(`Supabase: Connectivity OK - ${res.statusCode}`);
      } else {
        console.log(`❌ Supabase connectivity: FAILED (${res.statusCode})`);
        errors.push(`Supabase: Status ${res.statusCode}`);
      }
      resolve();
    });
    
    req.on('error', (error) => {
      console.log('❌ Supabase connectivity: ERROR -', error.message);
      errors.push(`Supabase Error: ${error.message}`);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Supabase connectivity: TIMEOUT');
      errors.push('Supabase: Request timeout');
      req.abort();
      resolve();
    });
    
    req.end();
  });
}

// Run all tests
async function runDiagnostic() {
  console.log('Starting diagnostic tests...\n');
  
  await testApiHealth();
  await testApiAuth();
  await testFrontend();
  await testSupabase();
  
  console.log('\n' + '='.repeat(60));
  console.log('🚨 URGENT DIAGNOSTIC RESULTS');
  console.log('='.repeat(60));
  
  // Summary
  const passedTests = Object.values(tests).filter(Boolean).length;
  const totalTests = Object.keys(tests).length;
  
  console.log(`\n📊 SUMMARY: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Auth system appears functional');
  } else if (passedTests >= totalTests * 0.75) {
    console.log('⚠️  MOSTLY WORKING - Some issues detected');
  } else if (passedTests >= totalTests * 0.5) {
    console.log('🔧 PARTIAL ISSUES - Significant problems detected');
  } else {
    console.log('🚨 CRITICAL ISSUES - Major problems detected');
  }
  
  // Detailed results
  console.log('\n✅ PASSED TESTS:');
  Object.entries(tests).forEach(([test, passed]) => {
    if (passed) {
      console.log(`  ✅ ${test}`);
    }
  });
  
  console.log('\n❌ FAILED TESTS:');
  Object.entries(tests).forEach(([test, passed]) => {
    if (!passed) {
      console.log(`  ❌ ${test}`);
    }
  });
  
  if (errors.length > 0) {
    console.log('\n🔍 ERROR DETAILS:');
    errors.forEach(error => {
      console.log(`  • ${error}`);
    });
  }
  
  if (details.length > 0) {
    console.log('\n📋 SUCCESS DETAILS:');
    details.forEach(detail => {
      console.log(`  • ${detail}`);
    });
  }
  
  console.log('\n💡 NEXT STEPS:');
  
  if (!tests.frontendRunning) {
    console.log('  1. Start frontend server: npm run dev');
  }
  
  if (!tests.apiHealth) {
    console.log('  2. Check API backend deployment status');
  }
  
  if (!tests.supabaseConnectivity) {
    console.log('  3. Verify Supabase configuration and environment variables');
  }
  
  if (tests.apiHealth && tests.frontendRunning) {
    console.log('  1. Backend and frontend are running - test user signup/login');
    console.log('  2. Check browser console for JavaScript errors');
    console.log('  3. Monitor network requests during auth operations');
  }
  
  console.log('\n🔗 Run Playwright tests for detailed analysis:');
  console.log('  npx playwright test tests/auth-comprehensive-diagnostic.spec.ts --headed');
  
  console.log('\n' + '='.repeat(60));
}

// Execute diagnostic
runDiagnostic().catch(console.error);