/**
 * TenantFlow Pricing Plans Configuration
 * Based on Stripe best practices with lookup keys and proper structure
 */

import type { PricingPlan } from '../types/stripe-pricing'

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal for small property owners and landlords managing up to 10 properties with basic features and tenant management.',
    prices: {
      monthly: 2900, // $29.00 - matches Stripe
      yearly: 29000, // $290.00 - matches Stripe
    },
    features: [
      'Up to 25 units',
      'Tenant management & communication',
      'Online rent collection (ACH/Credit)',
      'Basic maintenance tracking',
      'Basic financial reporting',
      'Document storage (5GB)',
      'Mobile app access',
      'Email support',
      'Data export',
      '14-day free trial',
    ],
    recommended: false,
    stripePriceIds: {
      monthly: 'price_1Rbnyk00PMlKUSP0oGJV2i1G',
      yearly: 'price_1Rbnyk00PMlKUSP0uS33sCq3',
    },
    lookupKeys: {
      monthly: 'starter_monthly',
      yearly: 'starter_yearly',
    },
    limits: {
      properties: 25,
      tenants: 50,
      storage: 5, // 5GB
    },
    cta: 'Start Free Trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Best for growing property management businesses with up to 50 properties, advanced reporting, and priority support.',
    prices: {
      monthly: 7900, // $79.00 - matches Stripe
      yearly: 79000, // $790.00 - matches Stripe
    },
    features: [
      'Up to 150 units',
      'Everything in Starter',
      'Advanced financial analytics',
      'Document generation & e-signatures',
      'Tenant portal with self-service',
      'API access (limited)',
      'Webhook integrations',
      'Multi-property management',
      'Document storage (25GB)',
      'Team collaboration tools',
      'Bulk operations',
      'Premium integrations',
      'Phone & email support',
    ],
    recommended: true,
    stripePriceIds: {
      monthly: 'price_1Rbnzv00PMlKUSP0fq5R5MNV',
      yearly: 'price_1Rbnzv00PMlKUSP0jIq3BxTy',
    },
    lookupKeys: {
      monthly: 'growth_monthly',
      yearly: 'growth_yearly',
    },
    limits: {
      properties: 150,
      tenants: 300,
      storage: 25, // 25GB
    },
    cta: 'Start Growth Trial',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Perfect for established property management companies with up to 500 units, advanced automation, and priority support.',
    prices: {
      monthly: 17900, // $179.00 - will need to create in Stripe
      yearly: 171840, // $1,718.40 (20% discount) - will need to create
    },
    features: [
      'Up to 500 units',
      'Everything in Growth',
      'Full API access',
      'Custom integrations',
      'Advanced automation rules',
      'White-label tenant portal',
      'Custom reporting dashboard',
      'Document storage (100GB)',
      'Priority support',
      'Advanced team collaboration',
      'Advanced bulk operations',
      'Advanced user permissions',
      'Custom workflows',
    ],
    recommended: false,
    stripePriceIds: {
      monthly: 'price_business_monthly', // Need to create
      yearly: 'price_business_yearly', // Need to create
    },
    lookupKeys: {
      monthly: 'business_monthly',
      yearly: 'business_yearly',
    },
    limits: {
      properties: 500,
      tenants: 1000,
      storage: 100, // 100GB
    },
    cta: 'Start Business Trial',
  },
  {
    id: 'tenantflow_max',
    name: 'Enterprise',
    description: 'For large property management companies with unlimited properties, dedicated support, and custom integrations.',
    prices: {
      monthly: 19900, // $199.00 - matches Stripe
      yearly: 199000, // $1,990.00 - matches Stripe
    },
    features: [
      'Unlimited units',
      'Everything in Business',
      'Dedicated account manager',
      'Custom onboarding & training',
      'SLA guarantees (99.9% uptime)',
      'Advanced security features',
      'Custom integrations & development',
      'Unlimited storage',
      'Phone/video support',
      'Data export & migration assistance',
      'Advanced analytics & insights',
      'Enterprise SSO integration',
    ],
    recommended: false,
    stripePriceIds: {
      monthly: 'price_1Rbo0P00PMlKUSP0Isi7U1Wr',
      yearly: 'price_1Rbo0r00PMlKUSP0rzUhwgkO',
    },
    lookupKeys: {
      monthly: 'tenantflow_max_monthly',
      yearly: 'tenantflow_max_yearly',
    },
    limits: {
      properties: null, // Unlimited
      tenants: null, // Unlimited
      storage: null, // Unlimited
    },
    cta: 'Contact Sales',
  },
]

// Helper functions
export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(plan => plan.id === planId)
}

export const getRecommendedPlan = (): PricingPlan => {
  const recommended = PRICING_PLANS.find(plan => plan.recommended)
  if (!recommended) {
    throw new Error('No recommended plan found in configuration')
  }
  return recommended
}

export const getStarterPlan = (): PricingPlan => {
  const starterPlan = PRICING_PLANS.find(plan => plan.id === 'starter')
  if (!starterPlan) {
    throw new Error('No starter plan found in configuration')
  }
  return starterPlan
}

export const getPaidPlans = (): PricingPlan[] => {
  return PRICING_PLANS.filter(plan => plan.prices.monthly > 0)
}

// Validation
export const validatePricingPlans = (): boolean => {
  return PRICING_PLANS.every(plan => {
    return !!(
      plan.id &&
      plan.name &&
      plan.description &&
      typeof plan.prices.monthly === 'number' &&
      typeof plan.prices.yearly === 'number' &&
      Array.isArray(plan.features) &&
      plan.features.length > 0
    )
  })
}

// Export plan IDs as constants
export const PLAN_IDS = {
  STARTER: 'starter',
  GROWTH: 'growth',
  BUSINESS: 'business',
  TENANTFLOW_MAX: 'tenantflow_max',
} as const

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS]
