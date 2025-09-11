#!/usr/bin/env node
/**
 * TenantFlow Stripe Product Enhancement Script
 * Updates products with marketing features and creates pricing table
 */

import Stripe from 'stripe';

// Use the Stripe secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK);

async function enhanceProductsAndCreatePricingTable() {
  console.log('🚀 Starting TenantFlow product enhancement...\n');

  try {
    // 1. Update Free Trial product
    console.log('✨ Updating tenantflow_free_trial...');
    await stripe.products.update('tenantflow_free_trial', {
      marketing_features: [
        {name: '1 property maximum'},
        {name: 'Up to 5 units'},
        {name: 'Basic tenant management'},
        {name: 'Essential maintenance tracking'},
        {name: 'Email support'},
        {name: '14-day free trial'},
        {name: 'Mobile app access'}
      ]
    });
    console.log('✅ Free Trial updated with 7 features');

    // 2. Update Starter product
    console.log('✨ Updating tenantflow_starter...');
    await stripe.products.update('tenantflow_starter', {
      marketing_features: [
        {name: 'Up to 5 properties'},
        {name: 'Up to 25 units'},
        {name: 'Full maintenance tracking'},
        {name: 'Tenant portal access'},
        {name: 'Lease management'},
        {name: 'Financial reporting'},
        {name: '10GB document storage'},
        {name: 'Priority email support'},
        {name: 'Mobile app access'}
      ]
    });
    console.log('✅ Starter updated with 9 features');

    // 3. Update Growth product
    console.log('✨ Updating tenantflow_growth...');
    await stripe.products.update('tenantflow_growth', {
      marketing_features: [
        {name: 'Up to 20 properties'},
        {name: 'Up to 100 units'},
        {name: 'Advanced analytics'},
        {name: 'Automated rent collection'},
        {name: 'Vendor network access'},
        {name: 'Custom templates'},
        {name: '50GB storage'},
        {name: 'Phone & email support'},
        {name: 'API access'},
        {name: 'Team collaboration (3 users)'},
        {name: 'Bulk operations'}
      ]
    });
    console.log('✅ Growth updated with 11 features');

    // 4. Update Max product
    console.log('✨ Updating tenantflow_max...');
    await stripe.products.update('tenantflow_max', {
      marketing_features: [
        {name: 'Unlimited properties'},
        {name: 'Unlimited units'},
        {name: 'White-label portal'},
        {name: 'Full automation suite'},
        {name: 'Custom integrations'},
        {name: 'Dedicated account manager'},
        {name: 'Unlimited storage'},
        {name: '24/7 priority support'},
        {name: 'Full API access'},
        {name: 'Unlimited team members'},
        {name: 'SLA guarantee'},
        {name: 'Custom onboarding'}
      ]
    });
    console.log('✅ TenantFlow Max updated with 12 features');

    // 5. Get price IDs for each product
    console.log('\n📋 Retrieving price IDs for pricing table...');
    
    const freeTrialPrices = await stripe.prices.list({
      product: 'tenantflow_free_trial',
      active: true
    });
    
    const starterPrices = await stripe.prices.list({
      product: 'tenantflow_starter',
      active: true
    });
    
    const growthPrices = await stripe.prices.list({
      product: 'tenantflow_growth',
      active: true
    });
    
    const maxPrices = await stripe.prices.list({
      product: 'tenantflow_max',
      active: true
    });

    // Log price IDs for reference
    console.log('💡 Price IDs found:');
    console.log(`Free Trial: ${freeTrialPrices.data.map(p => p.id).join(', ')}`);
    console.log(`Starter: ${starterPrices.data.map(p => p.id).join(', ')}`);
    console.log(`Growth: ${growthPrices.data.map(p => p.id).join(', ')}`);
    console.log(`Max: ${maxPrices.data.map(p => p.id).join(', ')}`);

    // 6. Create pricing table (Note: Use Dashboard for this step as API may be limited)
    console.log('\n🎨 Products are ready for pricing table creation!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to Stripe Dashboard → Product catalog → Pricing tables');
    console.log('2. Create new pricing table with these enhanced products');
    console.log('3. Mark Growth as popular/recommended');
    console.log('4. Copy the pricing table ID (prctbl_...)');
    console.log('5. Provide the ID for app integration');

    console.log('\n✅ All products successfully enhanced with marketing features!');

  } catch (error) {
    console.error('❌ Enhancement failed:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('💡 Note: Make sure product IDs exist and API key has proper permissions');
    }
    process.exit(1);
  }
}

// Run the enhancement
enhanceProductsAndCreatePricingTable();