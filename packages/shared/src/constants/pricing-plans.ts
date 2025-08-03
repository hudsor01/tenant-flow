/**
 * TenantFlow Pricing Plans Configuration
 * Based on Stripe best practices with lookup keys and proper structure
 */

import type { PricingPlan } from '../types/stripe-pricing'

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    description: 'Perfect for getting started with property management',
    prices: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      'Up to 2 properties',
      'Up to 5 tenants',
      'Basic maintenance tracking',
      'Tenant communication',
      'Document storage (1GB)',
      '14-day trial',
      'Email support',
    ],
    recommended: false,
    stripePriceIds: {
      monthly: '', // Free plan doesn't need Stripe price IDs
      yearly: '',
    },
    lookupKeys: {
      monthly: 'free_monthly',
      yearly: 'free_yearly',
    },
    limits: {
      properties: 2,
      tenants: 5,
      storage: 1, // 1GB
    },
    cta: 'Start Free Trial',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Great for small property portfolios',
    prices: {
      monthly: 1900, // $19.00
      yearly: 15200, // $152.00 (20% discount)
    },
    features: [
      'Up to 10 properties',
      'Up to 50 tenants',
      'Advanced maintenance workflow',
      'Automated rent reminders',
      'Financial reporting',
      'Document storage (10GB)',
      'Priority email support',
      'Mobile app access',
    ],
    recommended: false,
    stripePriceIds: {
      monthly: 'price_starter_monthly',
      yearly: 'price_starter_yearly',
    },
    lookupKeys: {
      monthly: 'starter_monthly',
      yearly: 'starter_yearly',
    },
    limits: {
      properties: 10,
      tenants: 50,
      storage: 10, // 10GB
    },
    cta: 'Subscribe to Starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Ideal for growing property businesses',
    prices: {
      monthly: 4900, // $49.00
      yearly: 39200, // $392.00 (20% discount)
    },
    features: [
      'Up to 50 properties',
      'Up to 250 tenants',
      'Advanced analytics & insights',
      'Custom report builder',
      'API access',
      'White-label options',
      'Document storage (50GB)',
      'Priority phone & email support',
      'Team collaboration tools',
      'Bulk operations',
    ],
    recommended: true,
    stripePriceIds: {
      monthly: 'price_growth_monthly',
      yearly: 'price_growth_yearly',
    },
    lookupKeys: {
      monthly: 'growth_monthly',
      yearly: 'growth_yearly',
    },
    limits: {
      properties: 50,
      tenants: 250,
      storage: 50, // 50GB
    },
    cta: 'Subscribe to Growth',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited growth potential for large portfolios',
    prices: {
      monthly: 14900, // $149.00
      yearly: 119200, // $1,192.00 (20% discount)
    },
    features: [
      'Unlimited properties',
      'Unlimited tenants',
      'Custom integrations',
      'Advanced security features',
      'On-premise deployment options',
      'Dedicated account manager',
      'Unlimited storage',
      '24/7 priority support',
      'Custom training & onboarding',
      'SLA guarantee',
      'Advanced user permissions',
      'Custom branding',
    ],
    recommended: false,
    stripePriceIds: {
      monthly: 'price_enterprise_monthly',
      yearly: 'price_enterprise_yearly',
    },
    lookupKeys: {
      monthly: 'enterprise_monthly',
      yearly: 'enterprise_yearly',
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

export const getFreePlan = (): PricingPlan => {
  const freePlan = PRICING_PLANS.find(plan => plan.id === 'free')
  if (!freePlan) {
    throw new Error('No free plan found in configuration')
  }
  return freePlan
}

export const getPaidPlans = (): PricingPlan[] => {
  return PRICING_PLANS.filter(plan => plan.id !== 'free')
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
  FREE: 'free',
  STARTER: 'starter',
  GROWTH: 'growth',
  ENTERPRISE: 'enterprise',
} as const

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS]