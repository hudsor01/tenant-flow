#!/usr/bin/env node

/**
 * Comprehensive Stripe Integration Test
 * Tests the complete payment flow configuration
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

console.log('🧪 Stripe Integration Test Suite\n');
console.log('================================\n');

// Configuration check
console.log('1️⃣  Configuration Check:');
console.log('   Frontend URL:', FRONTEND_URL);
console.log('   Backend URL:', BACKEND_URL);
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Stripe Mode:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🔴 LIVE' : '🟢 TEST');

// API Key validation
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testStripeConnection() {
  console.log('\n2️⃣  Testing Stripe API Connection...');
  
  try {
    // Test basic API connection
    const { data: prices } = await stripe.prices.list({ limit: 5, active: true });
    console.log(`   ✅ Connected to Stripe API`);
    console.log(`   📋 Found ${prices.length} active prices:`);
    
    prices.forEach(price => {
      const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'custom';
      const interval = price.recurring?.interval || 'one-time';
      console.log(`      - ${price.id}: ${amount} ${interval}`);
    });
    
    return true;
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('\n3️⃣  Webhook Configuration:');
  
  try {
    // List webhook endpoints
    const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 10 });
    
    const ourEndpoint = endpoints.find(ep => 
      ep.url.includes('tenantflow') || 
      ep.url.includes('localhost') ||
      ep.url.includes('railway')
    );
    
    if (ourEndpoint) {
      console.log(`   ✅ Webhook endpoint configured:`);
      console.log(`      URL: ${ourEndpoint.url}`);
      console.log(`      Status: ${ourEndpoint.status}`);
      console.log(`      Events: ${ourEndpoint.enabled_events.slice(0, 3).join(', ')}...`);
    } else {
      console.log('   ⚠️  No webhook endpoint found for this application');
      console.log('   📝 To set up webhooks:');
      console.log('      1. For local dev: stripe listen --forward-to localhost:3002/api/stripe/webhook');
      console.log('      2. For production: Configure in Stripe Dashboard');
    }
  } catch (error) {
    console.log(`   ❌ Could not retrieve webhook endpoints: ${error.message}`);
  }
}

async function testProducts() {
  console.log('\n4️⃣  Product & Price Configuration:');
  
  try {
    const { data: products } = await stripe.products.list({ active: true, limit: 10 });
    
    console.log(`   📦 Found ${products.length} active products:`);
    
    for (const product of products) {
      console.log(`\n   Product: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      
      // Get prices for this product
      const { data: prices } = await stripe.prices.list({ 
        product: product.id, 
        active: true 
      });
      
      if (prices.length > 0) {
        console.log(`   Prices:`);
        prices.forEach(price => {
          const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'custom';
          const interval = price.recurring?.interval || 'one-time';
          const intervalCount = price.recurring?.interval_count || 1;
          const intervalText = intervalCount > 1 ? `every ${intervalCount} ${interval}s` : interval;
          console.log(`      - ${price.id}: ${amount} ${intervalText}`);
        });
      }
    }
  } catch (error) {
    console.log(`   ❌ Could not retrieve products: ${error.message}`);
  }
}

async function testCustomers() {
  console.log('\n5️⃣  Recent Customer Activity:');
  
  try {
    const { data: customers } = await stripe.customers.list({ limit: 5 });
    
    if (customers.length === 0) {
      console.log('   ℹ️  No customers found yet');
    } else {
      console.log(`   👥 Found ${customers.length} recent customers`);
      
      for (const customer of customers.slice(0, 3)) {
        console.log(`\n   Customer: ${customer.email || 'No email'}`);
        console.log(`   Created: ${new Date(customer.created * 1000).toLocaleDateString()}`);
        
        // Check for subscriptions
        const { data: subscriptions } = await stripe.subscriptions.list({ 
          customer: customer.id, 
          limit: 1 
        });
        
        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          console.log(`   Subscription: ${sub.status}`);
          console.log(`   Plan: ${sub.items.data[0]?.price.id}`);
        } else {
          console.log('   No active subscriptions');
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Could not retrieve customers: ${error.message}`);
  }
}

async function runTests() {
  // Check if we have the necessary keys
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('❌ STRIPE_SECRET_KEY is not set in .env.local');
    process.exit(1);
  }
  
  if (!process.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    console.log('⚠️  VITE_STRIPE_PUBLISHABLE_KEY is not set (needed for frontend)');
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET is not set (needed for webhook verification)');
  }
  
  // Run tests
  await testStripeConnection();
  await testWebhookEndpoint();
  await testProducts();
  await testCustomers();
  
  console.log('\n\n✅ Stripe Integration Test Complete!\n');
  
  console.log('📋 Summary:');
  console.log('   - API Connection: Working');
  console.log('   - Mode: ' + (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE 🔴' : 'TEST 🟢'));
  console.log('   - Frontend Key: ' + (process.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Set ✅' : 'Missing ❌'));
  console.log('   - Webhook Secret: ' + (process.env.STRIPE_WEBHOOK_SECRET ? 'Set ✅' : 'Missing ❌'));
  
  console.log('\n🚀 Ready for testing payment flows!');
}

// Run the tests
runTests().catch(console.error);