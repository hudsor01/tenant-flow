require('dotenv').config();
const Stripe = require('stripe');

const testAlternativeApproach = async () => {
  console.log('=== TESTING ALTERNATIVE APPROACHES ===\n');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
  
  let customer = null;
  
  try {
    // Create customer
    customer = await stripe.customers.create({
      email: 'alt-test@example.com',
      name: 'Alternative Test User',
      metadata: { test: 'true' }
    });
    console.log(`✓ Customer: ${customer.id}`);
    
    // Approach 1: Try without expand, then finalize invoice
    console.log('\n=== Approach 1: Create + Finalize Invoice ===');
    
    const sub1 = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      metadata: { test: 'true', approach: '1' }
    });
    
    console.log(`Subscription: ${sub1.id}, Status: ${sub1.status}`);
    
    // Get the invoice and try to finalize it
    if (sub1.latest_invoice) {
      try {
        console.log('Attempting to finalize invoice...');
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(sub1.latest_invoice, {
          auto_advance: true
        });
        
        console.log(`Finalized: ${finalizedInvoice.status}`);
        
        // Now retrieve with payment intent
        const withPI = await stripe.invoices.retrieve(sub1.latest_invoice, {
          expand: ['payment_intent']
        });
        
        if (withPI.payment_intent) {
          console.log(`✅ SUCCESS! Payment Intent: ${withPI.payment_intent.id}`);
          console.log(`   Client Secret: ${withPI.payment_intent.client_secret.substring(0, 30)}...`);
        } else {
          console.log('❌ Still no payment intent');
        }
        
      } catch (finalizeErr) {
        console.log(`Finalize error: ${finalizeErr.message}`);
      }
    }
    
    await stripe.subscriptions.cancel(sub1.id);
    
    // Approach 2: Different payment_behavior
    console.log('\n=== Approach 2: allow_incomplete ===');
    
    try {
      const sub2 = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
        payment_behavior: 'allow_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: { test: 'true', approach: '2' }
      });
      
      console.log(`Subscription: ${sub2.id}, Status: ${sub2.status}`);
      
      if (sub2.latest_invoice?.payment_intent) {
        console.log(`✅ SUCCESS! Payment Intent: ${sub2.latest_invoice.payment_intent.id}`);
      } else {
        console.log('❌ No payment intent with allow_incomplete');
      }
      
      await stripe.subscriptions.cancel(sub2.id);
      
    } catch (err) {
      console.log(`allow_incomplete error: ${err.message}`);
    }
    
    // Approach 3: Manual invoice creation
    console.log('\n=== Approach 3: Manual Invoice Creation ===');
    
    const sub3 = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      metadata: { test: 'true', approach: '3' }
    });
    
    console.log(`Subscription: ${sub3.id}`);
    
    // Try to manually create payment intent for the invoice
    if (sub3.latest_invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(sub3.latest_invoice);
        console.log(`Invoice: ${invoice.id}, Status: ${invoice.status}, Amount: $${invoice.amount_due / 100}`);
        
        // Try to pay the invoice (which should create payment intent)
        const paidInvoice = await stripe.invoices.pay(invoice.id, {
          payment_method: 'card_payment_method_placeholder' // This will fail but might create PI
        });
        
      } catch (payErr) {
        console.log(`Pay error (expected): ${payErr.message}`);
        
        // Check if payment intent was created despite the error
        const invoiceCheck = await stripe.invoices.retrieve(sub3.latest_invoice, {
          expand: ['payment_intent']
        });
        
        if (invoiceCheck.payment_intent) {
          console.log(`✅ Payment intent created from failed pay attempt: ${invoiceCheck.payment_intent.id}`);
        }
      }
    }
    
    await stripe.subscriptions.cancel(sub3.id);
    
    // Approach 4: The CORRECT way from Stripe samples
    console.log('\n=== Approach 4: Stripe Samples Pattern ===');
    
    // This is the pattern from stripe-samples
    const sub4 = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.VITE_STRIPE_STARTER_MONTHLY }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { test: 'true', approach: '4' }
    });
    
    console.log(`Subscription: ${sub4.id}, Status: ${sub4.status}`);
    
    if (sub4.latest_invoice) {
      const invoice = sub4.latest_invoice;
      console.log(`Invoice: ${invoice.id}, Status: ${invoice.status}`);
      console.log(`Auto advance: ${invoice.auto_advance}`);
      
      if (!invoice.payment_intent) {
        console.log('No PI initially - this is EXPECTED with default_incomplete');
        console.log('Frontend should use SetupIntent for trials or handle differently');
        
        // Check what the actual Stripe samples do
        console.log('\n💡 INSIGHT: For default_incomplete subscriptions,');
        console.log('   the payment intent is created when customer submits payment method');
        console.log('   This requires a different frontend approach');
      }
    }
    
    await stripe.subscriptions.cancel(sub4.id);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    if (customer) {
      try {
        await stripe.customers.del(customer.id);
        console.log('\n✓ Customer cleaned up');
      } catch (err) {
        console.log('⚠ Cleanup warning:', err.message);
      }
    }
  }
};

testAlternativeApproach();