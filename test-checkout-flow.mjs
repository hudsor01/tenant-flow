#!/usr/bin/env node

/**
 * Test Stripe Checkout Session Creation
 * Simulates what happens when a user clicks "Start Free Trial"
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BACKEND_URL = 'http://localhost:3002';

console.log('🧪 Testing Stripe Checkout Flow\n');

async function testCheckoutSession() {
  console.log('1️⃣  Creating test checkout session...\n');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real scenario, this would be a valid JWT token
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        billingInterval: 'monthly',
        lookupKey: 'starter_monthly',
        mode: 'subscription',
        successUrl: 'http://localhost:5173/billing/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'http://localhost:5173/pricing'
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.url) {
      console.log('\n✅ Checkout session created successfully!');
      console.log(`\n🔗 Checkout URL: ${data.url}`);
      console.log(`📋 Session ID: ${data.sessionId}`);
      console.log('\n👉 Open this URL in your browser to test the checkout flow');
    } else {
      console.log('\n❌ Failed to create checkout session');
      if (data.message) {
        console.log(`Error: ${data.message}`);
      }
    }
  } catch (error) {
    console.log('\n❌ Request failed:', error.message);
    console.log('\nPossible issues:');
    console.log('- Backend server not running on port 3002');
    console.log('- Authentication required (need valid JWT token)');
    console.log('- CORS configuration blocking the request');
  }
}

console.log('📝 This test simulates creating a Stripe checkout session');
console.log('   In a real app, this happens when users click "Start Free Trial"\n');

console.log('🔧 Configuration:');
console.log(`   Backend URL: ${BACKEND_URL}`);
console.log(`   Stripe Mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE 🔴' : 'TEST 🟢'}`);
console.log('');

testCheckoutSession();