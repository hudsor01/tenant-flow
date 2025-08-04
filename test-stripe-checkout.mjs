#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🧪 Testing Stripe Checkout Flow\n');

// Test configuration
const API_BASE_URL = 'http://localhost:3002/api/v1';
const FRONTEND_URL = 'http://localhost:5173';

// Price IDs from your Stripe configuration
const PRICE_IDS = {
  starter_monthly: 'price_1Rd15CP3WCR53SdoWn7kMCKU',
  growth_monthly: 'price_1Rd15DP3WCR53SdoTDcLcIDl',
  enterprise_monthly: 'price_1Rd15EP3WCR53SdoJJUIlcIN'
};

async function testCheckoutSession(jwt) {
  console.log('📝 Testing checkout session creation...\n');
  
  try {
    // Test with Starter plan
    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        priceId: PRICE_IDS.starter_monthly,
        billingInterval: 'monthly'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Checkout session created successfully!');
      console.log('📍 Session ID:', data.sessionId);
      console.log('🔗 Checkout URL:', data.url);
      console.log('\n📋 Session Details:');
      console.log('- Mode:', data.mode || 'subscription');
      console.log('- Success URL:', `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`);
      console.log('- Cancel URL:', `${FRONTEND_URL}/pricing`);
      
      return data;
    } else {
      console.error('❌ Failed to create checkout session:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating checkout session:', error.message);
    return null;
  }
}

async function testPortalSession(jwt) {
  console.log('\n📝 Testing customer portal session creation...\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Portal session created successfully!');
      console.log('🔗 Portal URL:', data.url);
      return data;
    } else {
      console.error('❌ Failed to create portal session:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating portal session:', error.message);
    return null;
  }
}

async function testWebhookEndpoint() {
  console.log('\n📝 Testing webhook endpoint accessibility...\n');
  
  try {
    // Note: This will fail with signature verification, but confirms endpoint exists
    const response = await fetch(`${API_BASE_URL}/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({
        type: 'test.webhook',
        data: { object: {} }
      })
    });

    if (response.status === 400) {
      console.log('✅ Webhook endpoint is accessible (signature verification active)');
    } else {
      console.log('⚠️  Webhook endpoint status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
  }
}

// Main test flow
async function runTests() {
  // First, check if you have a JWT token
  const JWT_TOKEN = process.env.JWT_TOKEN || '';
  
  if (!JWT_TOKEN) {
    console.log('⚠️  No JWT token provided. To test authenticated endpoints, set JWT_TOKEN environment variable.');
    console.log('💡 You can get a JWT token by logging into the app and checking browser DevTools.\n');
    
    // Test only public endpoints
    await testWebhookEndpoint();
    
    console.log('\n📌 Next Steps:');
    console.log('1. Login to the app at http://localhost:5173');
    console.log('2. Open browser DevTools > Application > Local Storage');
    console.log('3. Copy the auth token');
    console.log('4. Run: JWT_TOKEN="your-token" node test-stripe-checkout.mjs');
    
    return;
  }
  
  // Test all endpoints with JWT
  const checkoutSession = await testCheckoutSession(JWT_TOKEN);
  await testPortalSession(JWT_TOKEN);
  await testWebhookEndpoint();
  
  if (checkoutSession && checkoutSession.url) {
    console.log('\n🎯 Test Complete!');
    console.log('📋 To complete the checkout flow:');
    console.log(`1. Open: ${checkoutSession.url}`);
    console.log('2. Complete the Stripe checkout (use test card 4242 4242 4242 4242 if in test mode)');
    console.log('3. Monitor backend logs for webhook events');
    console.log('4. Check database for subscription updates');
  }
}

// Run tests
runTests().catch(console.error);