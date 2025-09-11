#!/usr/bin/env node

import Stripe from 'stripe'

// Initialize Stripe with the live key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-09-30.acacia',
})

async function cleanupOldProducts() {
  try {
    console.log('🧹 Cleaning up old/duplicate Stripe products...')
    
    // Products to DELETE (old duplicates)
    const productsToDelete = [
      'prod_T27h745v0VIpua', // "TenantFlow Free Trial Enhanced" (duplicate)
      'prod_Sot8BptAjQArM1', // Old "TenantFlow Max" (duplicate)
      'prod_SbujfadeHK2q0w', // Old "Free Trial" (duplicate)
      'prod_SY7LmPzsPpvUaT', // Old "TenantFlow MAX" (duplicate)
      'prod_SY7K5lSS4JDkqz', // Old "TenantFlow Growth" (duplicate)
      'prod_SY7JUwNYPb3V8j', // Old "TenantFlow Starter" (duplicate)
    ]
    
    // Delete each old product
    for (const productId of productsToDelete) {
      try {
        console.log(`🗑️  Deleting product: ${productId}`)
        
        // First, get all prices for this product and delete them
        const prices = await stripe.prices.list({ product: productId, limit: 100 })
        
        for (const price of prices.data) {
          console.log(`   - Deleting price: ${price.id}`)
          await stripe.prices.update(price.id, { active: false })
        }
        
        // Delete the product
        await stripe.products.del(productId)
        console.log(`✅ Deleted product: ${productId}`)
        
      } catch (error) {
        if (error.code === 'resource_missing') {
          console.log(`⚠️  Product ${productId} already deleted or doesn't exist`)
        } else {
          console.error(`❌ Error deleting ${productId}:`, error.message)
        }
      }
    }
    
    console.log('\n🎉 Stripe cleanup complete!')
    console.log('\n📋 Remaining products should be:')
    console.log('- tenantflow_free_trial (Free Trial)')
    console.log('- tenantflow_starter (Starter)')
    console.log('- tenantflow_growth (Growth)')
    console.log('- tenantflow_max (TenantFlow Max)')
    
    // Verify cleanup by listing remaining products
    console.log('\n🔍 Verifying remaining products...')
    const remainingProducts = await stripe.products.list({ limit: 20 })
    remainingProducts.data.forEach(product => {
      console.log(`✅ ${product.id}: ${product.name}`)
    })
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
    process.exit(1)
  }
}

// Check for Stripe key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required')
  console.log('💡 Run: doppler secrets get STRIPE_SECRET_KEY --plain')
  process.exit(1)
}

cleanupOldProducts()