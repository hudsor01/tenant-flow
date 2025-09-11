#!/usr/bin/env node

import Stripe from 'stripe'

// Initialize Stripe with the live key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-09-30.acacia',
})

async function updateStripePricing() {
  try {
    console.log('🔥 Updating TenantFlow Max pricing to $299/month...')
    
    // Create new price for TenantFlow Max at $299/month
    const newMonthlyPrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: 29900, // $299.00 in cents
      recurring: {
        interval: 'month'
      },
      product: 'tenantflow_max', // TenantFlow Max product ID
      nickname: 'TenantFlow Max - Monthly ($299)',
      metadata: {
        updated_date: new Date().toISOString(),
        previous_price: '19900', // $199 
        reason: 'Competitive positioning update'
      }
    })
    
    console.log('✅ Created new monthly price:', newMonthlyPrice.id)
    
    // Create new price for TenantFlow Max at $2990/year
    const newAnnualPrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: 299000, // $2990.00 in cents  
      recurring: {
        interval: 'year'
      },
      product: 'tenantflow_max', // TenantFlow Max product ID
      nickname: 'TenantFlow Max - Annual ($2990)',
      metadata: {
        updated_date: new Date().toISOString(),
        previous_price: '199000', // $1990
        reason: 'Competitive positioning update'
      }
    })
    
    console.log('✅ Created new annual price:', newAnnualPrice.id)
    
    // Deactivate old prices
    console.log('🔄 Deactivating old TenantFlow Max prices...')
    
    const oldMonthlyPrice = 'price_1RtWFeP3WCR53Sdo9AsL7oGv'
    const oldAnnualPrice = 'price_1RtWFeP3WCR53Sdoxm2iY4mt'
    
    await stripe.prices.update(oldMonthlyPrice, { active: false })
    await stripe.prices.update(oldAnnualPrice, { active: false })
    
    console.log('✅ Deactivated old prices')
    
    // Update the product with new competitive messaging
    await stripe.products.update('tenantflow_max', {
      name: 'TenantFlow Max',
      description: 'Enterprise features for serious property management professionals. Unlimited properties, white-label portal, custom integrations, and dedicated account manager.',
      marketing_features: [
        { name: 'Unlimited Properties & Units' },
        { name: 'White-Label Portal' },
        { name: 'Custom Integrations & API' },
        { name: 'Dedicated Account Manager' },
        { name: '24/7 Priority Support' },
        { name: 'Advanced Security Features' },
        { name: 'Custom Training & Onboarding' },
        { name: '99.9% Uptime SLA' },
        { name: 'Enterprise Reporting Suite' },
        { name: 'Multi-Tenant Architecture' }
      ],
      metadata: {
        target_market: 'Professional property managers with 50+ units',
        competitive_position: 'Enterprise features at growth company prices',
        updated_pricing: new Date().toISOString()
      }
    })
    
    console.log('✅ Updated product marketing features')
    
    console.log('\n🎉 Stripe pricing update complete!')
    console.log('\n📋 New Price IDs for configuration:')
    console.log(`Monthly: ${newMonthlyPrice.id}`)
    console.log(`Annual: ${newAnnualPrice.id}`)
    console.log('\n⚠️  Update these in packages/shared/src/config/pricing.ts')
    
  } catch (error) {
    console.error('❌ Error updating Stripe pricing:', error.message)
    process.exit(1)
  }
}

// Check for Stripe key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required')
  console.log('💡 Run: doppler secrets get STRIPE_SECRET_KEY --plain')
  process.exit(1)
}

updateStripePricing()