/**
 * Stripe Pricing Setup
 * Programmatically creates and manages pricing for TenantFlow
 */

import Stripe from 'stripe'
import { logger } from '@/lib/logger'

// This should be run server-side only (in your backend or a setup script)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export interface TenantFlowProduct {
  id: string
  name: string
  description: string
  metadata: {
    tier: 'free_trial' | 'starter' | 'growth' | 'tenantflow_max'
    propertyLimit: string
    unitLimit: string
    features: string // JSON stringified array
    popular?: string
  }
}

export interface TenantFlowPrice {
  id: string
  productId: string
  unitAmount: number
  currency: string
  recurring: {
    interval: 'month' | 'year'
  }
  metadata: {
    display_name: string
    savings?: string
  }
}

/**
 * Create all products and prices for TenantFlow
 * Run this once to set up your Stripe account
 */
export async function setupTenantFlowPricing() {
  try {
    // 1. Create Products
    const products = await createProducts()
    
    // 2. Create Prices for each product
    const prices = await createPrices(products)
    
    // 3. Create a Pricing Table (via API when available, or return config)
    const pricingTableConfig = createPricingTableConfig(products, prices)
    
    return {
      products,
      prices,
      pricingTableConfig,
      success: true,
    }
  } catch (error) {
    logger.error('Failed to setup pricing:', error instanceof Error ? error : new Error(String(error)), { component: 'lib_stripe_pricing_setup.ts' })
    throw error
  }
}

async function createProducts(): Promise<Stripe.Product[]> {
  const productConfigs = [
    {
      name: 'Free Trial',
      description: 'Perfect for getting started with property management',
      metadata: {
        tier: 'free_trial',
        propertyLimit: '1',
        unitLimit: '5',
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
      },
    },
    {
      name: 'Starter',
      description: 'Ideal for small landlords managing a few properties',
      metadata: {
        tier: 'starter',
        propertyLimit: '5',
        unitLimit: '25',
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
      },
    },
    {
      name: 'Growth',
      description: 'For growing portfolios that need advanced features',
      metadata: {
        tier: 'growth',
        propertyLimit: '20',
        unitLimit: '100',
        features: JSON.stringify([
          'Up to 20 properties',
          'Up to 100 units',
          'Advanced analytics dashboard',
          'Automated rent collection',
          'Maintenance vendor network',
          'Custom lease templates',
          '50GB document storage',
          'Phone & email support',
          'API access',
          'Team collaboration (3 users)',
          'Automated late fee management',
          'Tenant screening integration',
        ]),
        popular: 'true',
        order: '3',
      },
    },
    {
      name: 'TenantFlow Max',
      description: 'Enterprise solution for property management professionals',
      metadata: {
        tier: 'tenantflow_max',
        propertyLimit: 'unlimited',
        unitLimit: 'unlimited',
        features: JSON.stringify([
          'Unlimited properties',
          'Unlimited units',
          'White-label tenant portal',
          'Advanced automation workflows',
          'Custom integrations',
          'Dedicated account manager',
          'Unlimited document storage',
          '24/7 priority support',
          'Full API access',
          'Unlimited team members',
          'Custom reporting',
          'Onboarding & training',
          'SLA guarantee',
          'Custom contract terms',
        ]),
        order: '4',
      },
    },
  ]

  const products: Stripe.Product[] = []
  
  for (const config of productConfigs) {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
    })
    
    let product = existingProducts.data.find(
      p => p.metadata.tier === config.metadata.tier
    )
    
    if (!product) {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: config.metadata as Record<string, string>,
        default_price_data: config.metadata.tier === 'free_trial' ? {
          currency: 'usd',
          unit_amount: 0,
          recurring: { interval: 'month' },
        } : undefined,
      })
    }
    
    if (product) products.push(product)
  }
  
  return products
}

async function createPrices(products: Stripe.Product[]): Promise<Stripe.Price[]> {
  const priceConfigs = [
    // Free Trial
    {
      product: products.find(p => p.metadata.tier === 'free_trial')!.id,
      unit_amount: 0,
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        display_name: 'Free Trial',
      },
    },
    
    // Starter - Monthly
    {
      product: products.find(p => p.metadata.tier === 'starter')!.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        display_name: 'Starter Monthly',
      },
    },
    // Starter - Annual
    {
      product: products.find(p => p.metadata.tier === 'starter')!.id,
      unit_amount: 29000, // $290.00 per year
      currency: 'usd',
      recurring: { interval: 'year' as const },
      metadata: {
        display_name: 'Starter Annual',
        savings: '17%', // Save 2 months
      },
    },
    
    // Growth - Monthly
    {
      product: products.find(p => p.metadata.tier === 'growth')!.id,
      unit_amount: 7900, // $79.00
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        display_name: 'Growth Monthly',
      },
    },
    // Growth - Annual
    {
      product: products.find(p => p.metadata.tier === 'growth')!.id,
      unit_amount: 79000, // $790.00 per year
      currency: 'usd',
      recurring: { interval: 'year' as const },
      metadata: {
        display_name: 'Growth Annual',
        savings: '17%',
      },
    },
    
    // TenantFlow Max - Monthly
    {
      product: products.find(p => p.metadata.tier === 'tenantflow_max')!.id,
      unit_amount: 19900, // $199.00
      currency: 'usd',
      recurring: { interval: 'month' as const },
      metadata: {
        display_name: 'TenantFlow Max Monthly',
      },
    },
    // TenantFlow Max - Annual
    {
      product: products.find(p => p.metadata.tier === 'tenantflow_max')!.id,
      unit_amount: 199000, // $1990.00 per year
      currency: 'usd',
      recurring: { interval: 'year' as const },
      metadata: {
        display_name: 'TenantFlow Max Annual',
        savings: '17%',
      },
    },
  ]

  const prices: Stripe.Price[] = []
  
  for (const config of priceConfigs) {
    // Check if price already exists
    const existingPrices = await stripe.prices.list({
      product: config.product,
      limit: 100,
    })
    
    let price = existingPrices.data.find(
      p => p.unit_amount === config.unit_amount &&
           p.recurring?.interval === config.recurring.interval
    )
    
    if (!price) {
      price = await stripe.prices.create({
        product: config.product,
        unit_amount: config.unit_amount,
        currency: config.currency,
        recurring: config.recurring,
        metadata: config.metadata as Record<string, string>,
        billing_scheme: 'per_unit',
      })
    }
    
    if (price) prices.push(price)
  }
  
  return prices
}

function createPricingTableConfig(
  products: Stripe.Product[],
  prices: Stripe.Price[]
) {
  // Group prices by product
  const pricingTable = products.map(product => {
    const productPrices = prices.filter(p => p.product === product.id)
    const monthlyPrice = productPrices.find(p => p.recurring?.interval === 'month')
    const annualPrice = productPrices.find(p => p.recurring?.interval === 'year')
    
    return {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
      },
      prices: {
        monthly: monthlyPrice ? {
          id: monthlyPrice.id,
          amount: monthlyPrice.unit_amount,
          interval: 'month',
        } : null,
        annual: annualPrice ? {
          id: annualPrice.id,
          amount: annualPrice.unit_amount,
          interval: 'year',
          savings: annualPrice.metadata?.savings,
        } : null,
      },
    }
  })
  
  return {
    products: pricingTable,
    features: {
      billingIntervalToggle: true,
      showAnnualSavings: true,
      highlightPopular: true,
      freeTrial: {
        enabled: true,
        days: 14,
      },
    },
    styling: {
      theme: 'stripe',
      primaryColor: '#3b82f6', // Tailwind blue-500
      borderRadius: '8px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
  }
}

/**
 * Fetch current pricing configuration from Stripe
 */
export async function fetchCurrentPricing() {
  try {
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    })
    
    const tenantFlowProducts = products.data.filter(
      p => p.metadata.tier && ['free_trial', 'starter', 'growth', 'tenantflow_max'].includes(p.metadata.tier)
    )
    
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
    })
    
    return {
      products: tenantFlowProducts,
      prices: prices.data.filter(p => 
        tenantFlowProducts.some(product => product.id === p.product)
      ),
    }
  } catch (error) {
    logger.error('Failed to fetch pricing:', error instanceof Error ? error : new Error(String(error)), { component: 'lib_stripe_pricing_setup.ts' })
    throw error
  }
}

/**
 * Update a specific product's features or limits
 */
export async function updateProductFeatures(
  productId: string,
  updates: {
    features?: string[]
    propertyLimit?: string
    unitLimit?: string
  }
) {
  try {
    const product = await stripe.products.retrieve(productId)
    
    const updatedMetadata = {
      ...product.metadata,
      ...(updates.features && { features: JSON.stringify(updates.features) }),
      ...(updates.propertyLimit && { propertyLimit: updates.propertyLimit }),
      ...(updates.unitLimit && { unitLimit: updates.unitLimit }),
    }
    
    const updatedProduct = await stripe.products.update(productId, {
      metadata: updatedMetadata,
    })
    
    return updatedProduct
  } catch (error) {
    logger.error('Failed to update product:', error instanceof Error ? error : new Error(String(error)), { component: 'lib_stripe_pricing_setup.ts' })
    throw error
  }
}

/**
 * Create a checkout session with custom parameters
 */
export async function createCustomCheckoutSession(
  priceId: string,
  customerId?: string,
  metadata?: Record<string, string>
) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer: customerId,
      metadata: {
        ...metadata,
        source: 'pricing_page',
      },
      subscription_data: {
        trial_period_days: 14, // Free trial for all plans
        metadata,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: customerId ? {
        address: 'auto',
      } : undefined,
    })
    
    return session
  } catch (error) {
    logger.error('Failed to create checkout session:', error instanceof Error ? error : new Error(String(error)), { component: 'lib_stripe_pricing_setup.ts' })
    throw error
  }
}