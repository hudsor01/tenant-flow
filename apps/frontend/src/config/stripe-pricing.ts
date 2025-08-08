/**
 * Stripe Pricing Configuration
 * Centralized configuration for all Stripe price IDs and plan details
 */

// Get price IDs from environment variables
export const STRIPE_PRICE_IDS = {
  // Free Trial
  FREE_TRIAL: process.env.NEXT_PUBLIC_STRIPE_FREE_TRIAL || 
    'price_1RgguDP3WCR53Sdo1lJmjlD5',

  // Starter Plan
  STARTER_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY || 
    'price_1RtFLzP3WCR53SdoGWXcT0j5',
  STARTER_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL || 
    'price_1RtFM3P3WCR53SdotPKMQnZx',

  // Growth Plan  
  GROWTH_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY || 
    'price_1RtFMGP3WCR53SdoGcrH3JgN',
  GROWTH_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL || 
    'price_1RtFMQP3WCR53Sdoe6GhGWeG',

  // TenantFlow Max Plan
  TENANTFLOW_MAX_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY || 
    'price_1RtFMdP3WCR53SdokfQC5jFn',
  TENANTFLOW_MAX_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL || 
    'price_1RtFMqP3WCR53Sdou9dBpxlD',
} as const

// Stripe Publishable Key
export const STRIPE_PUBLISHABLE_KEY = 
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// Plan metadata for consistency across the app
export const PLAN_METADATA = {
  FREE_TRIAL: {
    id: 'FREE_TRIAL',
    name: 'Free Trial',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    annualPrice: 0,
    propertyLimit: 1,
    unitLimit: 5,
    storageGB: 1,
    supportLevel: 'Email support',
    features: [
      '1 property',
      'Up to 5 units',
      'Basic maintenance tracking',
      'Tenant management',
      'Document storage (1GB)',
      'Email support',
      '14-day trial period',
    ],
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'For small landlords',
    monthlyPrice: 29,
    annualPrice: 290,
    propertyLimit: 5,
    unitLimit: 25,
    storageGB: 10,
    supportLevel: 'Priority email support',
    features: [
      'Up to 5 properties',
      'Up to 25 units',
      'Full maintenance tracking',
      'Tenant portal access',
      'Lease management',
      'Financial reporting',
      'Document storage (10GB)',
      'Priority email support',
      'Mobile app access',
    ],
  },
  GROWTH: {
    id: 'GROWTH',
    name: 'Growth',
    description: 'For growing portfolios',
    monthlyPrice: 79,
    annualPrice: 790,
    propertyLimit: 20,
    unitLimit: 100,
    storageGB: 50,
    supportLevel: 'Phone & email support',
    features: [
      'Up to 20 properties',
      'Up to 100 units',
      'Advanced analytics',
      'Automated rent collection',
      'Maintenance vendor network',
      'Custom lease templates',
      'Document storage (50GB)',
      'Priority phone & email support',
      'API access',
      'Team collaboration (3 users)',
    ],
  },
  TENANTFLOW_MAX: {
    id: 'TENANTFLOW_MAX',
    name: 'TenantFlow Max',
    description: 'For property management pros',
    monthlyPrice: 199,
    annualPrice: 1990,
    propertyLimit: -1, // unlimited
    unitLimit: -1, // unlimited
    storageGB: -1, // unlimited
    supportLevel: '24/7 dedicated support',
    features: [
      'Unlimited properties',
      'Unlimited units',
      'White-label tenant portal',
      'Advanced automation',
      'Custom integrations',
      'Dedicated account manager',
      'Document storage (unlimited)',
      '24/7 priority support',
      'Full API access',
      'Unlimited team members',
      'Custom reporting',
      'Training & onboarding',
    ],
  },
} as const

export type PlanId = keyof typeof PLAN_METADATA