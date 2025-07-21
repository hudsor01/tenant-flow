/**
 * Billing constants
 * Runtime constants and enums for billing and subscription management
 */

import type { Plan } from '../types/billing'

export const PLAN_TYPE = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE'
} as const

export const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE)

export const BILLING_PERIOD = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL'
} as const

export const BILLING_PERIOD_OPTIONS = Object.values(BILLING_PERIOD)

export const SUB_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
  UNPAID: 'UNPAID',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
  TRIALING: 'TRIALING',
  PAUSED: 'PAUSED'
} as const

export const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS)

// Plan configurations
export const PLANS: Plan[] = [
  {
    id: 'FREE',
    name: 'Free Trial',
    description: 'Perfect for getting started with property management',
    price: 0,
    propertyLimit: 2,
    tenantLimit: 5,
    features: [
      'Up to 2 Properties',
      'Up to 5 Tenants',
      'Basic Maintenance Tracking',
      'Tenant Communication',
      'Document Storage',
      '14-Day Trial'
    ]
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Great for small property portfolios',
    price: 19,
    ANNUALPrice: 15,
    propertyLimit: 10,
    tenantLimit: 50,
    features: [
      'Up to 10 Properties',
      'Up to 50 Tenants',
      'Advanced Maintenance Workflow',
      'Automated Rent Reminders',
      'Financial Reporting',
      'Priority Support'
    ]
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    description: 'Ideal for growing property businesses',
    price: 49,
    ANNUALPrice: 39,
    propertyLimit: 50,
    tenantLimit: 250,
    features: [
      'Up to 50 Properties',
      'Up to 250 Tenants',
      'Advanced Analytics',
      'Custom Reports',
      'API Access',
      'White-label Options',
      'Dedicated Support'
    ]
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Unlimited growth potential for large portfolios',
    price: 149,
    ANNUALPrice: 119,
    propertyLimit: -1, // Unlimited
    tenantLimit: -1, // Unlimited
    features: [
      'Unlimited Properties',
      'Unlimited Tenants',
      'Custom Integrations',
      'Advanced Security',
      'On-premise Options',
      'Dedicated Account Manager',
      '24/7 Support'
    ]
  }
]