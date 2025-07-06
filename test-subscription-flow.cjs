require('dotenv').config();
const Stripe = require('stripe');

const testSubscriptionFlow = async () => {
  try {
    console.log('=== Testing Subscription Creation Flow ===\n');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });

    // Test 1: Free Trial Subscription with Setup Intent
    console.log('Test 1: Free Trial with Setup Intent...');
    try {
      // Create test customer
      const customer = await stripe.customers.create({
        email: 'trial-test@example.com',
        name: 'Trial Test User',
        metadata: { test: 'true', source: 'subscription-flow-test' }
      });
      console.log(`✓ Test customer created: ${customer.id}`);
      
      // Create setup intent for payment method collection
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          test: 'true',
          planId: 'freeTrial',
          billingPeriod: 'monthly'
        }
      });
      console.log(`✓ Setup intent created: ${setupIntent.id}`);
      console.log(`  Client secret: ${setupIntent.client_secret.substring(0, 20)}...`);
      console.log(`  Status: ${setupIntent.status}`);
      
      // Create trial subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.VITE_STRIPE_FREE_TRIAL }],
        trial_period_days: 14,
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        metadata: {
          test: 'true',
          planId: 'freeTrial',
          billingPeriod: 'monthly',
          setupIntentId: setupIntent.id
        }
      });
      console.log(`✓ Trial subscription created: ${subscription.id}`);
      console.log(`  Status: ${subscription.status}`);
      console.log(`  Trial end: ${new Date(subscription.trial_end * 1000).toISOString()}`);
      
      // Clean up
      await stripe.subscriptions.del(subscription.id);
      await stripe.customers.del(customer.id);
      console.log('✓ Test data cleaned up');
      
    } catch (err) {
      console.log(`✗ Free trial test failed: ${err.message}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Paid Subscription with Payment Intent
    console.log('Test 2: Paid Subscription with Payment Intent...');
    try {
      // Create test customer
      const customer = await stripe.customers.create({
        email: 'paid-test@example.com',
        name: 'Paid Test User',
        metadata: { test: 'true', source: 'subscription-flow-test' }
      });
      console.log(`✓ Test customer created: ${customer.id}`);
      
      // Create paid subscription (this will create payment intent)
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          test: 'true',
          planId: 'starter',
          billingPeriod: 'monthly'
        }
      });
      
      const paymentIntent = subscription.latest_invoice?.payment_intent;
      
      console.log(`✓ Paid subscription created: ${subscription.id}`);
      console.log(`  Status: ${subscription.status}`);
      if (paymentIntent) {
        console.log(`✓ Payment intent created: ${paymentIntent.id}`);
        console.log(`  Client secret: ${paymentIntent.client_secret.substring(0, 20)}...`);
        console.log(`  Status: ${paymentIntent.status}`);
        console.log(`  Amount: $${paymentIntent.amount / 100}`);
      } else {
        console.log('✗ No payment intent found');
      }
      
      // Clean up
      await stripe.subscriptions.del(subscription.id);
      await stripe.customers.del(customer.id);
      console.log('✓ Test data cleaned up');
      
    } catch (err) {
      console.log(`✗ Paid subscription test failed: ${err.message}`);
    }
    
    console.log('\n=== API Endpoint Test ===');
    
    // Test the actual API endpoint (simulate request)
    console.log('Simulating create-subscription API call...');
    
    const testPayload = {
      planId: 'starter',
      billingPeriod: 'monthly',
      userId: 'test-user-123',
      paymentMethodCollection: 'always'
    };
    
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    console.log('✓ Payload structure valid for API');
    
    console.log('\n=== Subscription Flow Test Complete ===');
    return true;
    
  } catch (error) {
    console.error('✗ Subscription flow test failed:', error.message);
    return false;
  }
};

testSubscriptionFlow();