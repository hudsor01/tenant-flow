/**
 * Pricing configuration for 4-tier subscription system
 * Defines products, trials, limits, and features for each tier
 */

import type { PlanType } from '../types/stripe'
import type { ProductTierConfig, TrialConfig } from '../types/billing'

/**
 * Production-ready pricing configuration for TenantFlow
 * 4 Products: Free Trial, Starter, Growth, TenantFlow Max
 */
export const PRODUCT_TIERS: Record<PlanType, ProductTierConfig> = {
  FREETRIAL: {
    id: 'FREETRIAL',
    name: 'Free Trial',
    description: 'Perfect for trying out TenantFlow',
    price: {
      monthly: 0,
      annual: 0
    },
    trial: {
      trialPeriodDays: 14,
      trialEndBehavior: 'cancel', // Cancel if no payment method after trial
      collectPaymentMethod: false,
      reminderDaysBeforeEnd: 3
    },
    features: [
      'Up to 1 property',
      'Up to 5 units',
      'Basic tenant management',
      'Email support',
      'Mobile app access'
    ],
    limits: {
      properties: 1,
      units: 5,
      users: 1,
      storage: 1, // 1 GB
      apiCalls: 1000
    },
    support: 'email',
    stripePriceIds: {
      monthly: null, // Free tier has no Stripe prices
      annual: null
    }
  },

  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'Great for small property managers',
    price: {
      monthly: 29,
      annual: 290 // Save $58/year (2 months free)
    },
    trial: {
      trialPeriodDays: 14,
      trialEndBehavior: 'pause', // Pause subscription if no payment after trial
      collectPaymentMethod: false,
      reminderDaysBeforeEnd: 3
    },
    features: [
      'Up to 5 properties',
      'Up to 50 units',
      'Advanced tenant management',
      'Lease management',
      'Maintenance tracking',
      'Financial reporting',
      'Priority email support',
      'API access'
    ],
    limits: {
      properties: 5,
      units: 50,
      users: 3,
      storage: 10, // 10 GB
      apiCalls: 10000
    },
    support: 'email',
    stripePriceIds: {
      monthly: 'price_1Rbnyk00PMlKUSP0oGJV2i1G',
      annual: 'price_1Rbnyk00PMlKUSP0uS33sCq3'
    }
  },

  GROWTH: {
    id: 'GROWTH',
    name: 'Growth',
    description: 'Ideal for growing property management companies',
    price: {
      monthly: 79,
      annual: 790 // Save $158/year (2 months free)
    },
    trial: {
      trialPeriodDays: 14,
      trialEndBehavior: 'pause',
      collectPaymentMethod: false,
      reminderDaysBeforeEnd: 3
    },
    features: [
      'Up to 20 properties',
      'Up to 200 units',
      'Everything in Starter',
      'Advanced analytics',
      'Custom reports',
      'Bulk operations',
      'Team collaboration',
      'Priority support',
      'Advanced API access',
      'Integrations'
    ],
    limits: {
      properties: 20,
      units: 200,
      users: 10,
      storage: 50, // 50 GB
      apiCalls: 50000
    },
    support: 'priority',
    stripePriceIds: {
      monthly: 'price_1Rbnzv00PMlKUSP0fq5R5MNV',
      annual: 'price_1Rbnzv00PMlKUSP0jIq3BxTy'
    }
  },

  TENANTFLOW_MAX: {
    id: 'TENANTFLOW_MAX',
    name: 'TenantFlow Max',
    description: 'For large property management operations',
    price: {
      monthly: 299, // Custom pricing available
      annual: 2990 // Custom pricing available
    },
    trial: {
      trialPeriodDays: 30, // Longer trial for tenantflow_max
      trialEndBehavior: 'pause',
      collectPaymentMethod: true, // Require payment method for tenantflow_max trials
      reminderDaysBeforeEnd: 7
    },
    features: [
      'Unlimited properties',
      'Unlimited units',
      'Everything in Growth',
      'White-label options',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      '24/7 phone support',
      'Custom training',
      'API rate limit bypass'
    ],
    limits: {
      properties: -1, // Unlimited
      units: -1, // Unlimited
      users: -1, // Unlimited
      storage: -1, // Unlimited
      apiCalls: -1 // Unlimited
    },
    support: 'dedicated',
    stripePriceIds: {
      monthly: 'price_1Rbo0P00PMlKUSP0Isi7U1Wr',
      annual: 'price_1Rbo0r00PMlKUSP0rzUhwgkO'
    }
  }
}

/**
 * Get product tier configuration by plan type
 */
export function getProductTier(planType: PlanType): ProductTierConfig {
  const tier = PRODUCT_TIERS[planType]
  if (!tier) {
    throw new Error(`Product tier not found for plan type: ${planType}`)
  }
  return tier
}

/**
 * Get Stripe price ID for a plan and billing interval
 */
export function getStripePriceId(
  planType: PlanType,
  interval: 'monthly' | 'annual'
): string | null {
  const tier = PRODUCT_TIERS[planType]
  if (!tier) return null
  return tier.stripePriceIds[interval]
}

/**
 * Check if a plan has a free trial
 */
export function hasTrial(planType: PlanType): boolean {
  const tier = PRODUCT_TIERS[planType]
  if (!tier) return false
  return tier.trial.trialPeriodDays > 0
}

/**
 * Get trial configuration for a plan
 */
export function getTrialConfig(planType: PlanType): TrialConfig | undefined {
  const tier = PRODUCT_TIERS[planType]
  return tier?.trial
}

/**
 * Check if user has exceeded plan limits
 */
export function checkPlanLimits(
  planType: PlanType,
  usage: {
    properties?: number
    units?: number
    users?: number
    storage?: number
    apiCalls?: number
  }
): {
  exceeded: boolean
  limits: { type: string; current: number; limit: number }[]
} {
  const tier = PRODUCT_TIERS[planType]
  const exceededLimits: { type: string; current: number; limit: number }[] = []

  if (!tier) {
    return { exceeded: false, limits: [] }
  }

  if (tier.limits.properties !== -1 && usage.properties && usage.properties > tier.limits.properties) {
    exceededLimits.push({
      type: 'properties',
      current: usage.properties,
      limit: tier.limits.properties
    })
  }

  if (tier.limits.units !== -1 && usage.units && usage.units > tier.limits.units) {
    exceededLimits.push({
      type: 'units',
      current: usage.units,
      limit: tier.limits.units
    })
  }

  if (tier.limits.users !== undefined && tier.limits.users !== -1 && usage.users && usage.users > tier.limits.users) {
    exceededLimits.push({
      type: 'users',
      current: usage.users,
      limit: tier.limits.users
    })
  }

  if (tier.limits.storage !== undefined && tier.limits.storage !== -1 && usage.storage && usage.storage > tier.limits.storage) {
    exceededLimits.push({
      type: 'storage',
      current: usage.storage,
      limit: tier.limits.storage
    })
  }

  if (tier.limits.apiCalls !== undefined && tier.limits.apiCalls !== -1 && usage.apiCalls && usage.apiCalls > tier.limits.apiCalls) {
    exceededLimits.push({
      type: 'apiCalls',
      current: usage.apiCalls,
      limit: tier.limits.apiCalls
    })
  }

  return {
    exceeded: exceededLimits.length > 0,
    limits: exceededLimits
  }
}

/**
 * Get recommended upgrade plan based on usage
 */
export function getRecommendedUpgrade(
  currentPlan: PlanType,
  usage: {
    properties?: number
    units?: number
    users?: number
  }
): PlanType | null {
  const planOrder: PlanType[] = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX']
  const currentIndex = planOrder.indexOf(currentPlan)

  // Check each plan in order to find the first one that fits usage
  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const plan = planOrder[i]
    if (!plan) continue // Skip if plan is undefined

    const tier = PRODUCT_TIERS[plan]
    if (!tier) continue // Skip if tier is undefined

    const fitsUsage =
      (tier.limits.properties === -1 || tier.limits.properties === undefined || !usage.properties || usage.properties <= tier.limits.properties) &&
      (tier.limits.units === -1 || tier.limits.units === undefined || !usage.units || usage.units <= tier.limits.units) &&
      (tier.limits.users === -1 || tier.limits.users === undefined || !usage.users || usage.users <= tier.limits.users)

    if (fitsUsage) {
      return plan
    }
  }

  return null
}

/**
 * Calculate annual savings for a plan
 */
export function calculateAnnualSavings(planType: PlanType): number {
  const tier = PRODUCT_TIERS[planType]
  const monthlyCost = tier.price.monthly * 12
  const annualCost = tier.price.annual
  return monthlyCost - annualCost
}

/**
 * Get display-friendly price string
 * @deprecated Use formatPrice from '@repo/shared/utils' instead
 */
export function formatPrice(amount: number, interval: 'monthly' | 'annual'): string {
  // Import dynamically to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { formatPrice: sharedFormatPrice } = require('../utils/currency')
  return sharedFormatPrice(amount, { interval, minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
