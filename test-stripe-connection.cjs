require('dotenv').config();
const Stripe = require('stripe');

const testStripeConnection = async () => {
  try {
    console.log('=== Testing Stripe Connection & Prices ===\n');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });

    // Test account connection
    console.log('Testing account connection...');
    const account = await stripe.accounts.retrieve();
    console.log(`✓ Connected to: ${account.display_name}`);
    console.log(`  Country: ${account.country}`);
    console.log(`  Charges enabled: ${account.charges_enabled}`);
    console.log(`  Payouts enabled: ${account.payouts_enabled}`);
    
    // Test price configurations
    console.log('\nTesting price configurations...');
    const priceIds = {
      'Free Trial': process.env.VITE_STRIPE_FREE_TRIAL,
      'Starter Monthly': process.env.VITE_STRIPE_STARTER_MONTHLY,
      'Growth Monthly': process.env.VITE_STRIPE_GROWTH_MONTHLY,
      'Starter Annual': process.env.VITE_STRIPE_STARTER_ANNUAL,
      'Growth Annual': process.env.VITE_STRIPE_GROWTH_ANNUAL,
    };
    
    for (const [name, priceId] of Object.entries(priceIds)) {
      if (priceId) {
        try {
          const price = await stripe.prices.retrieve(priceId);
          const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'FREE';
          const interval = price.recurring?.interval || 'one-time';
          console.log(`✓ ${name}: ${amount} ${interval} (${price.active ? 'active' : 'inactive'})`);
        } catch (err) {
          console.log(`✗ ${name}: Error - ${err.message}`);
        }
      } else {
        console.log(`✗ ${name}: Price ID not configured`);
      }
    }
    
    // Test customer creation (dry run)
    console.log('\nTesting customer creation...');
    try {
      const testCustomer = await stripe.customers.create({
        email: 'test@example.com',
        name: 'Test Customer',
        metadata: { test: 'true', source: 'connection-test' }
      });
      console.log(`✓ Customer creation: ${testCustomer.id}`);
      
      // Clean up test customer
      await stripe.customers.del(testCustomer.id);
      console.log('✓ Test customer cleaned up');
    } catch (err) {
      console.log(`✗ Customer creation failed: ${err.message}`);
    }
    
    // Test webhook endpoint configuration
    console.log('\nTesting webhook configuration...');
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
      const prodWebhook = webhooks.data.find(wh => 
        wh.url.includes('tenantflow.app') && wh.status === 'enabled'
      );
      
      if (prodWebhook) {
        console.log(`✓ Production webhook found: ${prodWebhook.url}`);
        console.log(`  Events: ${prodWebhook.enabled_events.join(', ')}`);
      } else {
        console.log('⚠ No active production webhook found');
      }
    } catch (err) {
      console.log(`✗ Webhook check failed: ${err.message}`);
    }
    
    console.log('\n=== Stripe Connection Test Complete ===');
    return true;
    
  } catch (error) {
    console.error('✗ Stripe connection test failed:', error.message);
    return false;
  }
};

testStripeConnection();