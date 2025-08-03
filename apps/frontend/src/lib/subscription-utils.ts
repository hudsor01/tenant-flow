// Re-export billing utilities from shared package
export {
  getPlanById,
  calculateProratedAmount,
  calculateAnnualPrice,
  calculateAnnualSavings,
  SUBSCRIPTION_URLS
} from '@tenantflow/shared'

import type { Plan, PlanType } from '@tenantflow/shared'
import type { UIPlanConcept } from '@/lib/utils/plan-mapping'
import { getPlanById as getLegacyPlanById, SUBSCRIPTION_URLS as BASE_SUBSCRIPTION_URLS } from '@tenantflow/shared'

// Frontend-specific UI mapping for plan concepts
const PLAN_UI_MAPPING: Record<string, { uiId: UIPlanConcept; stripeMonthlyPriceId?: string; stripeAnnualPriceId?: string }> = {
  'FREE': { uiId: 'FREE' },
  'STARTER': { uiId: 'STARTER', stripeMonthlyPriceId: 'price_starter_monthly', stripeAnnualPriceId: 'price_starter_annual' },
  'GROWTH': { uiId: 'GROWTH', stripeMonthlyPriceId: 'price_growth_monthly', stripeAnnualPriceId: 'price_growth_annual' },
  'ENTERPRISE': { uiId: 'ENTERPRISE', stripeMonthlyPriceId: 'price_enterprise_monthly', stripeAnnualPriceId: 'price_enterprise_annual' }
}

// Frontend-specific plan getter with UI mapping
export const getPlanWithUIMapping = (planId: string): Plan | undefined => {
  const basePlan = getLegacyPlanById(planId)
  if (!basePlan) return undefined
  
  const uiMapping = PLAN_UI_MAPPING[planId]
  if (!uiMapping) return undefined
  
  // Map PricingPlan to Plan interface structure
  return {
    id: basePlan.id as PlanType,
    uiId: uiMapping.uiId,
    name: basePlan.name,
    description: basePlan.description,
    price: {
      monthly: basePlan.prices.monthly,
      annual: basePlan.prices.yearly
    },
    features: basePlan.features,
    propertyLimit: basePlan.limits.properties || 0,
    storageLimit: basePlan.limits.storage || 0,
    apiCallLimit: 1000, // Default API call limit (not in pricing plans)
    priority: basePlan.recommended,
    subscription: undefined
  }
}

// User form validation
export interface UserFormData {
  email: string
  password: string
  fullName: string
  name?: string // Alias for fullName for backward compatibility
  company?: string
}

export function validateUserForm(formData: UserFormData): string | null {
  if (!formData.email || !formData.fullName || !formData.password) {
    return 'Please fill in all required fields.'
  }
  if (!formData.email.includes('@')) {
    return 'Please enter a valid email address.'
  }
  return null
}

// Frontend-specific auth helpers
export function storeAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function createAuthLoginUrl(email: string, message = 'account-created'): string {
  return `${BASE_SUBSCRIPTION_URLS.MANAGE}?message=${message}&email=${encodeURIComponent(email)}`
}