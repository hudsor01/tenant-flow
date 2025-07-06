require('dotenv').config();
const Stripe = require('stripe');

const testPaidSubscription = async () => {
  console.log('=== TESTING PAID SUBSCRIPTION ISSUE ===\n');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
  
  let customer = null;
  let subscription = null;
  
  try {
    // Create customer
    customer = await stripe.customers.create({
      email: 'paid-test@example.com',
      name: 'Paid Test User',
      metadata: { test: 'true' }
    });
    console.log(`✓ Customer: ${customer.id}`);
    
    // Create paid subscription (this is the critical test)
    console.log('\nTesting paid subscription creation...');
    subscription = await stripe.subscriptions.create({
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
        userId: 'test-user-123',
        planId: 'starter', 
        billingPeriod: 'monthly'
      }
    });
    
    console.log(`✓ Subscription created: ${subscription.id}`);
    console.log(`  Status: ${subscription.status}`);
    
    // This is the CRITICAL part - check payment intent
    console.log('\nChecking payment intent (this is critical for frontend)...');
    
    if (subscription.latest_invoice) {
      console.log(`✓ Latest invoice: ${subscription.latest_invoice.id}`);
      
      if (subscription.latest_invoice.payment_intent) {
        const pi = subscription.latest_invoice.payment_intent;
        console.log(`✓ Payment intent found: ${pi.id}`);
        console.log(`  Status: ${pi.status}`);
        console.log(`  Amount: $${pi.amount / 100} ${pi.currency}`);
        console.log(`  Client secret: ${pi.client_secret.substring(0, 30)}...`);
        
        // THIS IS WHAT THE API SHOULD RETURN TO FRONTEND
        const apiResponse = {
          subscriptionId: subscription.id,
          clientSecret: pi.client_secret,
          status: subscription.status
        };
        
        console.log('\n✅ API Response Structure:');
        console.log(JSON.stringify(apiResponse, null, 2));
        
        // Verify this matches what create-subscription.js returns
        console.log('\n🎯 This should match create-subscription.js response for paid plans');
        
      } else {
        console.log('❌ NO PAYMENT INTENT FOUND!');
        console.log('This is the problem - frontend needs payment intent client_secret');
        console.log('Latest invoice object:', JSON.stringify(subscription.latest_invoice, null, 2));
      }
    } else {
      console.log('❌ NO LATEST INVOICE FOUND!');
      console.log('This means the subscription creation failed');
    }
    
    // Test what happens with different payment_behavior settings
    console.log('\n=== Testing Different Payment Behaviors ===');
    
    const behaviors = [
      'default_incomplete',
      'allow_incomplete', 
      'error_if_incomplete'
    ];
    
    for (const behavior of behaviors) {
      try {
        console.log(`\nTesting payment_behavior: ${behavior}`);
        
        const testSub = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
          payment_behavior: behavior,
          payment_settings: { 
            save_default_payment_method: 'on_subscription',
            payment_method_types: ['card']
          },
          expand: ['latest_invoice.payment_intent'],
          metadata: { test: 'true', behavior }
        });
        
        const hasPI = !!testSub.latest_invoice?.payment_intent;
        console.log(`  ${behavior}: ${testSub.status}, Payment Intent: ${hasPI ? '✓' : '✗'}`);
        
        // Clean up immediately
        await stripe.subscriptions.cancel(testSub.id);
        
      } catch (err) {
        console.log(`  ${behavior}: ERROR - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Cleanup
    if (subscription) {
      try {
        await stripe.subscriptions.cancel(subscription.id);
        console.log('\n✓ Subscription cleaned up');
      } catch (err) {
        console.log('⚠ Subscription cleanup failed:', err.message);
      }
    }
    
    if (customer) {
      try {
        await stripe.customers.del(customer.id);
        console.log('✓ Customer cleaned up');
      } catch (err) {
        console.log('⚠ Customer cleanup failed:', err.message);
      }
    }
  }
};

testPaidSubscription();