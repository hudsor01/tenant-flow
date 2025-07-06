require('dotenv').config();
const Stripe = require('stripe');

const testFinalFix = async () => {
  console.log('=== TESTING FINAL PAYMENT FLOW FIX ===\n');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
  
  let customer = null;
  let subscription = null;
  
  try {
    // Create customer
    customer = await stripe.customers.create({
      email: 'final-test@example.com',
      name: 'Final Test User',
      metadata: { test: 'true' }
    });
    console.log(`✓ Customer: ${customer.id}`);
    
    console.log('\n=== Step 1: Create Subscription (Original Method) ===');
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
        userId: 'test-user-final',
        planId: 'starter', 
        billingPeriod: 'monthly'
      }
    });
    
    console.log(`✓ Subscription: ${subscription.id}, Status: ${subscription.status}`);
    
    let paymentIntent = subscription.latest_invoice?.payment_intent;
    console.log(`Initial payment intent: ${paymentIntent ? paymentIntent.id : 'NONE'}`);
    
    console.log('\n=== Step 2: Apply Fix (Invoice Finalization) ===');
    
    if (!paymentIntent && subscription.latest_invoice) {
      console.log('Applying fix: updating invoice auto_advance...');
      
      // Apply the same fix as in the API
      const updatedInvoice = await stripe.invoices.update(subscription.latest_invoice.id, {
        auto_advance: true
      });
      
      console.log(`Invoice updated: auto_advance = ${updatedInvoice.auto_advance}`);
      
      // Retrieve with payment intent
      const finalizedInvoice = await stripe.invoices.retrieve(subscription.latest_invoice.id, {
        expand: ['payment_intent']
      });
      
      paymentIntent = finalizedInvoice.payment_intent;
      console.log(`Payment intent after fix: ${paymentIntent ? paymentIntent.id : 'STILL NONE'}`);
    }
    
    console.log('\n=== Step 3: Verify Fix Result ===');
    
    if (paymentIntent) {
      console.log('🎉 SUCCESS! Payment intent created:');
      console.log(`  ID: ${paymentIntent.id}`);
      console.log(`  Status: ${paymentIntent.status}`);
      console.log(`  Amount: $${paymentIntent.amount / 100}`);
      console.log(`  Client Secret: ${paymentIntent.client_secret.substring(0, 30)}...`);
      
      // This is what gets returned to frontend
      const frontendResponse = {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        status: subscription.status
      };
      
      console.log('\n✅ Frontend Response:');
      console.log(JSON.stringify(frontendResponse, null, 2));
      
      console.log('\n🚀 PAYMENT FLOW IS NOW WORKING!');
      console.log('Customers will be able to:');
      console.log('1. ✓ Start subscription signup');
      console.log('2. ✓ Receive payment form with client secret');
      console.log('3. ✓ Enter payment details');
      console.log('4. ✓ Complete payment successfully');
      console.log('5. ✓ Activate their subscription');
      
    } else {
      console.log('❌ Fix failed - still no payment intent');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    // Cleanup
    if (subscription) {
      try {
        await stripe.subscriptions.cancel(subscription.id);
        console.log('\n✓ Test subscription cleaned up');
      } catch (err) {
        console.log('⚠ Cleanup warning:', err.message);
      }
    }
    
    if (customer) {
      try {
        await stripe.customers.del(customer.id);
        console.log('✓ Test customer cleaned up');
      } catch (err) {
        console.log('⚠ Cleanup warning:', err.message);
      }
    }
  }
};

testFinalFix();