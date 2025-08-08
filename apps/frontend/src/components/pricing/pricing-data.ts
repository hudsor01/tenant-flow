import { STRIPE_PRICE_IDS } from '@/config/stripe-pricing'

export interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  monthlyPriceId: string
  annualPriceId: string
  features: string[]
  iconName: 'Sparkles' | 'Zap' | 'Crown' | 'Rocket'
  popular?: boolean
  propertyLimit: number | 'unlimited'
  unitLimit: number | 'unlimited'
  supportLevel: string
}

/**
 * Centralized pricing plan data
 * Matches the structure used in the original page
 */
export const pricingPlans: PricingPlan[] = [
  {
    id: 'FREE_TRIAL',
    name: 'Free Trial',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceId: STRIPE_PRICE_IDS.FREE_TRIAL,
    annualPriceId: STRIPE_PRICE_IDS.FREE_TRIAL,
    features: [
      '1 property',
      'Up to 5 units',
      'Maintenance tracking',
      'Tenant management',
      '1GB storage',
      'Email support',
      '14-day trial',
    ],
    iconName: 'Sparkles',
    propertyLimit: 1,
    unitLimit: 5,
    supportLevel: 'Email',
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'For small landlords',
    monthlyPrice: 29,
    annualPrice: 290,
    monthlyPriceId: STRIPE_PRICE_IDS.STARTER_MONTHLY,
    annualPriceId: STRIPE_PRICE_IDS.STARTER_ANNUAL,
    features: [
      'Up to 5 properties',
      'Up to 25 units',
      'Full maintenance',
      'Tenant portal',
      'Lease management',
      'Financial reports',
      '10GB storage',
      'Priority support',
      'Mobile app',
    ],
    iconName: 'Zap',
    propertyLimit: 5,
    unitLimit: 25,
    supportLevel: 'Priority Email',
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    description: 'For growing portfolios',
    monthlyPrice: 79,
    annualPrice: 790,
    monthlyPriceId: STRIPE_PRICE_IDS.GROWTH_MONTHLY,
    annualPriceId: STRIPE_PRICE_IDS.GROWTH_ANNUAL,
    features: [
      'Up to 20 properties',
      'Up to 100 units',
      'Advanced analytics',
      'Auto rent collection',
      'Vendor network',
      'Custom templates',
      '50GB storage',
      'Phone support',
      'API access',
      'Team (3 users)',
    ],
    iconName: 'Crown',
    popular: true,
    propertyLimit: 20,
    unitLimit: 100,
    supportLevel: 'Phone & Email',
  },
  {
    id: 'TENANTFLOW_MAX',
    name: 'TenantFlow Max',
    description: 'For property management pros',
    monthlyPrice: 199,
    annualPrice: 1990,
    monthlyPriceId: STRIPE_PRICE_IDS.TENANTFLOW_MAX_MONTHLY,
    annualPriceId: STRIPE_PRICE_IDS.TENANTFLOW_MAX_ANNUAL,
    features: [
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
      'Custom reports',
      'Onboarding',
    ],
    iconName: 'Rocket',
    propertyLimit: 'unlimited',
    unitLimit: 'unlimited',
    supportLevel: '24/7 Dedicated',
  },
]