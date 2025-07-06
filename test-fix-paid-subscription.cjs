require('dotenv').config();
const Stripe = require('stripe');

const testFixedPaidSubscription = async () => {
  console.log('=== TESTING FIXED PAID SUBSCRIPTION ===\n');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
  
  let customer = null;
  let subscription = null;
  
  try {
    // Create customer
    customer = await stripe.customers.create({
      email: 'fix-test@example.com',
      name: 'Fix Test User',
      metadata: { test: 'true' }
    });
    console.log(`✓ Customer: ${customer.id}`);
    
    // Create subscription with CORRECT parameters based on Stripe docs
    console.log('\nTesting FIXED paid subscription creation...');
    
    // Method 1: Ensure invoice auto-advance is enabled (DEFAULT)
    subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      collection_method: 'charge_automatically', // Ensure auto collection
      metadata: {
        test: 'true',
        userId: 'test-user-123',
        planId: 'starter', 
        billingPeriod: 'monthly'
      }
    });
    
    console.log(`✓ Subscription created: ${subscription.id}`);
    console.log(`  Status: ${subscription.status}`);
    console.log(`  Collection method: ${subscription.collection_method}`);
    
    // Check invoice details
    if (subscription.latest_invoice) {
      const invoice = subscription.latest_invoice;
      console.log(`✓ Latest invoice: ${invoice.id}`);
      console.log(`  Invoice status: ${invoice.status}`);
      console.log(`  Auto advance: ${invoice.auto_advance}`);
      console.log(`  Collection method: ${invoice.collection_method}`);
      
      if (invoice.payment_intent) {
        const pi = invoice.payment_intent;
        console.log(`✅ Payment intent found: ${pi.id}`);
        console.log(`  Status: ${pi.status}`);
        console.log(`  Amount: $${pi.amount / 100} ${pi.currency}`);
        console.log(`  Client secret: ${pi.client_secret.substring(0, 30)}...`);
        
        // Test the response structure
        const apiResponse = {
          subscriptionId: subscription.id,
          clientSecret: pi.client_secret,
          status: subscription.status
        };
        
        console.log('\n✅ PERFECT! API Response:');
        console.log(JSON.stringify(apiResponse, null, 2));
        
      } else {
        console.log('❌ Still no payment intent - trying manual invoice finalization...');
        
        // Try to manually finalize the invoice if it's in draft
        if (invoice.status === 'draft') {
          console.log('Invoice is in draft, finalizing...');
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
            auto_advance: true
          });
          
          console.log(`Finalized invoice status: ${finalizedInvoice.status}`);
          
          // Retrieve the finalized invoice with payment intent
          const retrievedInvoice = await stripe.invoices.retrieve(invoice.id, {
            expand: ['payment_intent']
          });
          
          if (retrievedInvoice.payment_intent) {
            console.log(`✅ Payment intent after finalization: ${retrievedInvoice.payment_intent.id}`);
            console.log(`  Client secret: ${retrievedInvoice.payment_intent.client_secret.substring(0, 30)}...`);
          } else {
            console.log('❌ Still no payment intent after finalization');
          }
        }
      }
    } else {
      console.log('❌ No latest invoice found');
    }
    
    // Let's also test creating the subscription differently
    console.log('\n=== Testing Alternative Method ===');
    
    try {
      const altSubscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        // Don't expand initially, retrieve after
        metadata: {
          test: 'true',
          userId: 'test-alt',
          planId: 'starter', 
          billingPeriod: 'monthly'
        }
      });
      
      console.log(`Alternative subscription: ${altSubscription.id}, status: ${altSubscription.status}`);
      
      // Retrieve with expansion
      const retrieved = await stripe.subscriptions.retrieve(altSubscription.id, {
        expand: ['latest_invoice.payment_intent']
      });
      
      if (retrieved.latest_invoice?.payment_intent) {
        console.log(`✅ Alternative method worked! PI: ${retrieved.latest_invoice.payment_intent.id}`);
      } else {
        console.log('❌ Alternative method also failed');
      }
      
      // Clean up alternative subscription
      await stripe.subscriptions.cancel(altSubscription.id);
      
    } catch (altErr) {
      console.log('Alternative method error:', altErr.message);
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

testFixedPaidSubscription();