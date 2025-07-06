#!/usr/bin/env node

// Quick webhook test script
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testWebhook() {
  console.log('Testing webhook endpoint...');
  
  try {
    // List webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list();
    console.log('Current webhook endpoints:');
    
    endpoints.data.forEach(endpoint => {
      console.log(`- URL: ${endpoint.url}`);
      console.log(`  Status: ${endpoint.status}`);
      console.log(`  Events: ${endpoint.enabled_events.join(', ')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook();
