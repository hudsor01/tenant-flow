/**
 * API Route to set up Stripe pricing
 * This should only be run once or when updating pricing
 */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// Protect this endpoint in production
const SETUP_SECRET = process.env.STRIPE_SETUP_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    // Verify the setup secret
    const { authorization } = await request.json()
    
    if (authorization !== SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create or update products
    const products = await setupProducts()
    
    // Create or update prices
    const prices = await setupPrices(products as Stripe.Product[])
    
    return NextResponse.json({
      success: true,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        metadata: p.metadata,
      })),
      prices: prices.map(p => ({
        id: p.id,
        product: p.product,
        unit_amount: p.unit_amount,
        interval: p.recurring?.interval,
      })),
      message: 'Pricing setup complete. Add these IDs to your environment variables.',
    })
  } catch (error) {
    console.error('Setup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Setup failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

async function setupProducts() {
  const productConfigs = [
    {
      id: 'tenantflow_free_trial',
      name: 'Free Trial',
      description: 'Perfect for getting started with property management',
      metadata: {
        tier: 'free_trial',
        propertyLimit: '1',
        unitLimit: '5',
        storageGB: '1',
        support: 'Email',
        features: JSON.stringify([
          '1 property',
          'Up to 5 units',
          'Basic maintenance tracking',
          'Tenant management',
          '1GB document storage',
          'Email support',
          '14-day trial period',
        ]),
        order: '1',
        popular: 'false',
        recommended: 'false',
      },
      active: true,
    },
    {
      id: 'tenantflow_starter',
      name: 'Starter',
      description: 'Ideal for small landlords managing a few properties',
      metadata: {
        tier: 'starter',
        propertyLimit: '5',
        unitLimit: '25',
        storageGB: '10',
        support: 'Priority Email',
        features: JSON.stringify([
          'Up to 5 properties',
          'Up to 25 units',
          'Full maintenance tracking',
          'Tenant portal access',
          'Lease management',
          'Financial reporting',
          '10GB document storage',
          'Priority email support',
          'Mobile app access',
        ]),
        order: '2',
        popular: 'false',
        recommended: 'false',
      },
      active: true,
    },
    {
      id: 'tenantflow_growth',
      name: 'Growth',
      description: 'For growing portfolios that need advanced features',
      metadata: {
        tier: 'growth',
        propertyLimit: '20',
        unitLimit: '100',
        storageGB: '50',
        support: 'Phone & Email',
        features: JSON.stringify([
          'Up to 20 properties',
          'Up to 100 units',
          'Advanced analytics',
          'Automated rent collection',
          'Vendor network',
          'Custom templates',
          '50GB storage',
          'Phone support',
          'API access',
          'Team (3 users)',
        ]),
        popular: 'true',
        recommended: 'true',
        order: '3',
      },
      active: true,
    },
    {
      id: 'tenantflow_max',
      name: 'TenantFlow Max',
      description: 'Enterprise solution for property management professionals',
      metadata: {
        tier: 'tenantflow_max',
        propertyLimit: 'unlimited',
        unitLimit: 'unlimited',
        storageGB: 'unlimited',
        support: '24/7 Dedicated',
        features: JSON.stringify([
          'Unlimited properties',
          'Unlimited units',
          'White-label portal',
          'Full automation',
          'Custom integrations',
          'Account manager',
          'Unlimited storage',
          '24/7 support',
          'Full API access',
          'Unlimited team',
        ]),
        enterprise: 'true',
        popular: 'false',
        recommended: 'false',
        order: '4',
      },
      active: true,
    },
  ]

  const products: Stripe.Product[] = []
  
  for (const config of productConfigs) {
    try {
      // Try to retrieve existing product
      let product: Stripe.Product
      try {
        product = await stripe.products.retrieve(config.id)
        // Update existing product
        product = await stripe.products.update(config.id, {
          name: config.name,
          description: config.description,
          metadata: Object.fromEntries(
            Object.entries(config.metadata).filter(([_, v]) => v !== undefined)
          ) as Record<string, string>,
          active: config.active,
        })
      } catch {
        // Create new product
        product = await stripe.products.create({
          id: config.id,
          name: config.name,
          description: config.description,
          metadata: Object.fromEntries(
            Object.entries(config.metadata).filter(([_, v]) => v !== undefined)
          ) as Record<string, string>,
          active: config.active,
        })
      }
      
      products.push(product)
    } catch (error) {
      console.error(`Failed to create/update product ${config.id}:`, error)
      throw error
    }
  }
  
  return products
}

async function setupPrices(_products: Stripe.Product[]) {
  const priceConfigs = [
    // Free Trial
    {
      nickname: 'Free Trial',
      product: 'tenantflow_free_trial',
      unit_amount: 0,
      currency: 'usd',
      recurring: { interval: 'month' as const, trial_period_days: 14 },
      metadata: {
        tier: 'free_trial',
      },
    },
    
    // Starter - Monthly
    {
      nickname: 'Starter Monthly',
      product: 'tenantflow_starter',
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        tier: 'starter',
        billing: 'monthly',
      },
    },
    // Starter - Annual
    {
      nickname: 'Starter Annual',
      product: 'tenantflow_starter',
      unit_amount: 29000, // $290.00 per year (~$24.17/mo)
      currency: 'usd',
      recurring: { interval: 'year' as const },
      metadata: {
        tier: 'starter',
        billing: 'annual',
        savings: '17%',
        monthly_equivalent: '2417', // $24.17
      },
    },
    
    // Growth - Monthly
    {
      nickname: 'Growth Monthly',
      product: 'tenantflow_growth',
      unit_amount: 7900, // $79.00
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        tier: 'growth',
        billing: 'monthly',
      },
    },
    // Growth - Annual
    {
      nickname: 'Growth Annual',
      product: 'tenantflow_growth',
      unit_amount: 79000, // $790.00 per year (~$65.83/mo)
      currency: 'usd',
      recurring: { interval: 'year' as const },
      metadata: {
        tier: 'growth',
        billing: 'annual',
        savings: '17%',
        monthly_equivalent: '6583', // $65.83
      },
    },
    
    // TenantFlow Max - Monthly
    {
      nickname: 'TenantFlow Max Monthly',
      product: 'tenantflow_max',
      unit_amount: 19900, // $199.00
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        tier: 'tenantflow_max',
        billing: 'monthly',
      },
    },
    // TenantFlow Max - Annual
    {
      nickname: 'TenantFlow Max Annual',
      product: 'tenantflow_max',
      unit_amount: 199000, // $1990.00 per year (~$165.83/mo)
      currency: 'usd',
      recurring: { interval: 'year' as const },
      metadata: {
        tier: 'tenantflow_max',
        billing: 'annual',
        savings: '17%',
        monthly_equivalent: '16583', // $165.83
      },
    },
  ]

  const prices: Stripe.Price[] = []
  
  for (const config of priceConfigs) {
    try {
      // Check if similar price already exists
      const existingPrices = await stripe.prices.list({
        product: config.product,
        active: true,
        limit: 100,
      })
      
      let price = existingPrices.data.find(
        p => p.unit_amount === config.unit_amount &&
             p.recurring?.interval === config.recurring.interval
      )
      
      if (!price) {
        // Create new price
        price = await stripe.prices.create({
          nickname: config.nickname,
          product: config.product,
          unit_amount: config.unit_amount,
          currency: config.currency,
          recurring: config.recurring,
          metadata: Object.fromEntries(
            Object.entries(config.metadata).filter(([_, v]) => v !== undefined)
          ) as Record<string, string>,
          active: true,
        })
      } else {
        // Update metadata if needed
        price = await stripe.prices.update(price.id, {
          nickname: config.nickname,
          metadata: Object.fromEntries(
            Object.entries(config.metadata).filter(([_, v]) => v !== undefined)
          ) as Record<string, string>,
          active: true,
        })
      }
      
      prices.push(price)
    } catch (error) {
      console.error(`Failed to create/update price for ${config.product}:`, error)
      throw error
    }
  }
  
  return prices
}

// GET endpoint to fetch current pricing
export async function GET() {
  try {
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    })
    
    const tenantFlowProducts = products.data.filter(
      p => p.id.startsWith('tenantflow_')
    )
    
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
    })
    
    const productPrices = tenantFlowProducts.map(product => {
      const productPrices = prices.data.filter(p => p.product === product.id)
      return {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
        },
        prices: productPrices.map(p => ({
          id: p.id,
          nickname: p.nickname,
          unit_amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval,
          metadata: p.metadata as Record<string, string>,
        })),
      }
    })
    
    return NextResponse.json({
      products: productPrices,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Fetch failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}