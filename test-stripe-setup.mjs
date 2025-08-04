#!/usr/bin/env node

/**
 * Simple test script to verify Stripe setup
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

console.log('🧪 Testing Stripe Configuration...\n');

// Check environment variables
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

const optionalEnvVars = [
  'STRIPE_STARTER_MONTHLY',
  'STRIPE_STARTER_ANNUAL',
  'STRIPE_GROWTH_MONTHLY',
  'STRIPE_GROWTH_ANNUAL',
  'STRIPE_ENTERPRISE_MONTHLY',
  'STRIPE_ENTERPRISE_ANNUAL'
];

let hasErrors = false;

console.log('✅ Required Environment Variables:');
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✓ ${envVar}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ✗ ${envVar}: NOT SET ❌`);
    hasErrors = true;
  }
}

console.log('\n📋 Optional Price IDs:');
for (const envVar of optionalEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✓ ${envVar}: ${value}`);
  } else {
    console.log(`  - ${envVar}: not set`);
  }
}

// Test Stripe initialization
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    console.log('\n🔌 Testing Stripe Connection...');
    
    // Try to list prices to verify connection
    try {
      await stripe.prices.list({ limit: 1 });
      console.log('  ✓ Successfully connected to Stripe API');
      
      // Check for webhook endpoint
      console.log('\n🔗 Webhook Endpoint Configuration:');
      console.log(`  - Endpoint URL: ${process.env.FRONTEND_URL || 'http://localhost:3002'}/api/stripe/webhook`);
      console.log(`  - Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Configured ✓' : 'NOT SET ❌'}`);
      
      console.log('\n📝 Next Steps:');
      console.log('1. Ensure your local dev server is running (npm run dev)');
      console.log('2. Use Stripe CLI to forward webhooks:');
      console.log('   stripe listen --forward-to localhost:3002/api/stripe/webhook');
      console.log('3. Test checkout flow from the frontend');
      console.log('4. Monitor webhook events in Stripe Dashboard');
      
      if (hasErrors) {
        console.log('\n⚠️  Some required configuration is missing!');
        process.exit(1);
      } else {
        console.log('\n✅ Stripe configuration looks good!');
      }
    } catch (error) {
      console.log(`  ✗ Failed to connect to Stripe: ${error.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.log('\n❌ Failed to initialize Stripe:', error.message);
    process.exit(1);
  }
} else {
  console.log('\n❌ Cannot test Stripe connection without STRIPE_SECRET_KEY');
  process.exit(1);
}