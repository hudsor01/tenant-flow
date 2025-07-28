/**
 * Billing constants
 * Central source of truth for billing enums and constants
 */

// Plan type enum (matching Prisma schema)
export const PLAN_TYPE = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE'
} as const

export type PlanType = typeof PLAN_TYPE[keyof typeof PLAN_TYPE]

// Billing period enum
export const BILLING_PERIOD = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL'
} as const

export type BillingPeriod = typeof BILLING_PERIOD[keyof typeof BILLING_PERIOD]

// Subscription status enum
export const SUB_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
  TRIALING: 'TRIALING',
  UNPAID: 'UNPAID'
} as const

export type SubStatus = typeof SUB_STATUS[keyof typeof SUB_STATUS]

// Plan configuration data
export const PLANS = [
  {
    id: 'FREE',
    name: 'Free Trial',
    description: 'Perfect for getting started',
    price: { monthly: 0, annual: 0 },
    features: ['Up to 2 properties', '5GB storage', 'Basic support'],
    propertyLimit: 2,
    storageLimit: 5000,
    apiCallLimit: 1000,
    priority: false
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Great for small portfolios',
    price: { monthly: 2900, annual: 29000 },
    features: ['Up to 10 properties', '50GB storage', 'Email support'],
    propertyLimit: 10,
    storageLimit: 50000,
    apiCallLimit: 10000,
    priority: false
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    description: 'Scale your property business',
    price: { monthly: 9900, annual: 99000 },
    features: ['Up to 100 properties', '500GB storage', 'Priority support'],
    propertyLimit: 100,
    storageLimit: 500000,
    apiCallLimit: 100000,
    priority: true
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'For large property portfolios',
    price: { monthly: 29900, annual: 299000 },
    features: ['Unlimited properties', 'Unlimited storage', '24/7 support'],
    propertyLimit: -1,
    storageLimit: -1,
    apiCallLimit: -1,
    priority: true
  }
]

// Derived options arrays for frontend use
export const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE)
export const BILLING_PERIOD_OPTIONS = Object.values(BILLING_PERIOD)
export const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS)