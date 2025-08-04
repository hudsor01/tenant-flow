#!/usr/bin/env node

// Server-side test that bypasses CORS by making HTTP requests directly to the backend
const http = require('http');
const https = require('https');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testBackend() {
  console.log('🧪 Testing production backend with direct HTTP requests (bypasses CORS)...\n');
  console.log('Testing production API at api.tenantflow.app...');
  
  // Test 0: Root endpoint (should be public)
  console.log('0️⃣ Testing root endpoint...');
  try {
    const rootResult = await makeRequest({
      protocol: 'https:',
      hostname: 'api.tenantflow.app',
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${rootResult.statusCode} ${rootResult.statusMessage}`);
    console.log(`   Response: ${rootResult.data}`);
  } catch (error) {
    console.log('❌ Root endpoint failed:', error.message);
  }

  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const healthResult = await makeRequest({
      protocol: 'https:',
      hostname: 'api.tenantflow.app',
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${healthResult.statusCode} ${healthResult.statusMessage}`);
    if (healthResult.statusCode === 200) {
      console.log('✅ Health check passed');
      console.log('   Response:', healthResult.data);
    } else {
      console.log('❌ Health check failed');
      console.log('   Response:', healthResult.data);
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Backend is not running on port 3002');
      
      // Try port 4600
      console.log('   Trying port 4600...');
      try {
        const healthResult = await makeRequest({
          hostname: 'localhost',
          port: 4600,
          path: '/health',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log(`   Status: ${healthResult.statusCode} ${healthResult.statusMessage}`);
        if (healthResult.statusCode === 200) {
          console.log('✅ Health check passed on port 4600');
          console.log('   Backend is running on port 4600, not 3002');
          return 4600; // Return the working port
        }
      } catch (error4600) {
        console.log('❌ Port 4600 also failed:', error4600.message);
      }
    }
    return null;
  }

  // Test 2: Checkout endpoint
  console.log('\n2️⃣ Testing checkout endpoint...');
  const checkoutData = JSON.stringify({
    lookupKey: 'professional_monthly',
    billingInterval: 'monthly',
    successUrl: 'http://localhost:5173/billing/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'http://localhost:5173/pricing',
    mode: 'subscription',
    allowPromotionCodes: true,
    metadata: {
      planId: 'professional',
      billingInterval: 'monthly'
    }
  });

  try {
    const checkoutResult = await makeRequest({
      protocol: 'https:',
      hostname: 'api.tenantflow.app',
      path: '/api/v1/stripe/create-checkout-session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(checkoutData)
      }
    }, checkoutData);

    console.log(`   Status: ${checkoutResult.statusCode} ${checkoutResult.statusMessage}`);
    
    if (checkoutResult.statusCode === 200) {
      const data = JSON.parse(checkoutResult.data);
      console.log('✅ Checkout session created successfully!');
      console.log(`   Session ID: ${data.sessionId}`);
      console.log(`   Checkout URL: ${data.url}`);
      console.log('\n🎉 Public checkout endpoint is working correctly!');
    } else {
      console.log('❌ Checkout failed');
      console.log('   Response:', checkoutResult.data);
    }
  } catch (error) {
    console.log('❌ Checkout test failed:', error.message);
  }

  return 3002;
}

testBackend().catch(console.error);