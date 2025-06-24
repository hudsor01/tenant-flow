// Test script to simulate a Stripe webhook and test subscription synchronization
const crypto = require('crypto');

// Webhook endpoint and secret
const WEBHOOK_URL = 'https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/stripe-webhook';
const WEBHOOK_SECRET = 'whsec_Ie7DgCTfis2CxdFgAsWEdOjBQzwPKSN1';

// Test webhook payload (customer.subscription.created)
const testPayload = {
  id: 'evt_test_webhook',
  object: 'event',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'sub_test_123',
      object: 'subscription',
      customer: 'cus_test_123',
      status: 'trialing',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000), // 14 days from now
      trial_start: Math.floor(Date.now() / 1000),
      trial_end: Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000),
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [{
          price: {
            id: 'price_1Rd15CP3WCR53SdoWn7kMCKU' // Starter monthly
          }
        }]
      },
      metadata: {
        userId: 'test-user-123',
        planId: 'starter',
        billingPeriod: 'monthly'
      }
    }
  },
  type: 'customer.subscription.created'
};

// Create Stripe signature
function createStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

async function testWebhookSync() {
  try {
    console.log('🧪 Testing webhook synchronization...');
    
    const signature = createStripeSignature(testPayload, WEBHOOK_SECRET);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      console.log('Response:', responseText);
      console.log('\n🔍 Check your database for:');
      console.log('- New subscription record with stripeSubscriptionId: sub_test_123');
      console.log('- Status: trialing');
      console.log('- Trial end date set correctly');
    } else {
      console.error('❌ Webhook failed:', response.status, responseText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebhookSync();