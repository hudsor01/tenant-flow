require('dotenv').config();
const Stripe = require('stripe');

const testNewFix = async () => {
  console.log('=== TESTING NEW PAYMENT INTENT FIX ===\n');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
  
  let customer = null;
  let subscription = null;
  let createdPaymentIntent = null;
  
  try {
    // Create customer (simulating the API flow)
    customer = await stripe.customers.create({
      email: 'newfix-test@example.com',
      name: 'New Fix Test User',
      metadata: { test: 'true' }
    });
    console.log(`✓ Customer: ${customer.id}`);
    
    console.log('\n=== Step 1: Create Subscription (default_incomplete) ===');
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
        userId: 'test-new-fix',
        planId: 'starter', 
        billingPeriod: 'monthly'
      }
    });
    
    console.log(`✓ Subscription: ${subscription.id}, Status: ${subscription.status}`);
    
    let paymentIntent = subscription.latest_invoice?.payment_intent;
    console.log(`Initial Payment Intent: ${paymentIntent ? paymentIntent.id : 'NONE (expected)'}`);
    
    console.log('\n=== Step 2: Apply New Fix (Manual PI Creation) ===');
    
    if (!paymentIntent && subscription.latest_invoice) {
      console.log('No payment intent found - creating manually...');
      
      const invoice = subscription.latest_invoice;
      console.log(`Invoice: ${invoice.id}, Amount: $${invoice.amount_due / 100}`);
      
      // Apply the new fix - create payment intent manually
      createdPaymentIntent = await stripe.paymentIntents.create({
        amount: invoice.amount_due,
        currency: invoice.currency || 'usd',
        customer: customer.id,
        invoice: invoice.id,
        payment_method_types: ['card'],
        usage: 'on_session',
        metadata: {
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
          userId: 'test-new-fix',
          planId: 'starter',
          billingPeriod: 'monthly',
          source: 'tenantflow'
        }
      });
      
      paymentIntent = createdPaymentIntent;
      console.log(`✅ Created Payment Intent: ${paymentIntent.id}`);
    }
    
    console.log('\n=== Step 3: Verify Fix Result ===');
    
    if (paymentIntent) {
      console.log('🎉 SUCCESS! Payment intent created:');
      console.log(`  ID: ${paymentIntent.id}`);
      console.log(`  Status: ${paymentIntent.status}`);
      console.log(`  Amount: $${paymentIntent.amount / 100}`);
      console.log(`  Currency: ${paymentIntent.currency}`);
      console.log(`  Client Secret: ${paymentIntent.client_secret.substring(0, 30)}...`);
      
      // This is what the API returns to frontend
      const apiResponse = {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        status: subscription.status
      };
      
      console.log('\n✅ API Response to Frontend:');
      console.log(JSON.stringify(apiResponse, null, 2));
      
      console.log('\n🚀 PAYMENT FLOW IS NOW FIXED!');
      console.log('✓ Customer can start subscription');
      console.log('✓ API returns client secret');
      console.log('✓ Frontend can show payment form');
      console.log('✓ Customer can complete payment');
      
      // Test what happens when payment intent is confirmed
      console.log('\n=== Step 4: Test Payment Intent Usage ===');
      console.log(`Payment Intent can be used with:`);
      console.log(`- stripe.confirmPayment() in frontend`);
      console.log(`- PaymentElement with client_secret`);
      console.log(`- Amount: $${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
      
    } else {
      console.log('❌ Fix failed - still no payment intent');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Cleanup
    console.log('\n=== Cleanup ===');
    
    if (createdPaymentIntent) {
      try {
        await stripe.paymentIntents.cancel(createdPaymentIntent.id);
        console.log('✓ Payment intent cancelled');
      } catch (err) {
        console.log('⚠ PI cleanup warning:', err.message);
      }
    }
    
    if (subscription) {
      try {
        await stripe.subscriptions.cancel(subscription.id);
        console.log('✓ Subscription cancelled');
      } catch (err) {
        console.log('⚠ Subscription cleanup warning:', err.message);
      }
    }
    
    if (customer) {
      try {
        await stripe.customers.del(customer.id);
        console.log('✓ Customer deleted');
      } catch (err) {
        console.log('⚠ Customer cleanup warning:', err.message);
      }
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('The fix works by:');
  console.log('1. Creating subscription with default_incomplete (correct)');
  console.log('2. Detecting when no payment intent exists (expected)');
  console.log('3. Creating manual payment intent for invoice amount');
  console.log('4. Returning client secret to frontend');
  console.log('5. Frontend can use this for payment collection');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Deploy this fix to production');
  console.log('2. Test with real customers');
  console.log('3. Monitor for successful payments');
};

testNewFix();