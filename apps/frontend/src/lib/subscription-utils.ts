import { PLANS } from '@tenantflow/shared/constants'
import type { Plan } from '@/types/subscription'
import type { UIPlanConcept } from '@/lib/utils/plan-mapping'

// Map of plan IDs to UI concepts and Stripe price IDs
const PLAN_UI_MAPPING: Record<string, { uiId: UIPlanConcept; stripeMonthlyPriceId?: string; stripeAnnualPriceId?: string }> = {
  'FREE': { uiId: 'FREE' },
  'STARTER': { uiId: 'STARTER', stripeMonthlyPriceId: 'price_starter_monthly', stripeAnnualPriceId: 'price_starter_annual' },
  'GROWTH': { uiId: 'GROWTH', stripeMonthlyPriceId: 'price_growth_monthly', stripeAnnualPriceId: 'price_growth_annual' },
  'ENTERPRISE': { uiId: 'ENTERPRISE', stripeMonthlyPriceId: 'price_enterprise_monthly', stripeAnnualPriceId: 'price_enterprise_annual' }
}

export const getPlanById = (planId: string): Plan | undefined => {
  const basePlan = PLANS.find((plan: { id: string }) => plan.id === planId)
  if (!basePlan) return undefined
  
  const uiMapping = PLAN_UI_MAPPING[planId]
  if (!uiMapping) return undefined
  
  return {
    ...basePlan,
    ...uiMapping
  } as Plan
}

export const calculateProratedAmount = (amount: number, daysRemaining: number, daysInPeriod: number) => {
  return Math.round((amount * daysRemaining) / daysInPeriod)
}

export const calculateAnnualPrice = (monthlyPrice: number) => {
  return monthlyPrice * 10 // 2 months free
}

export const calculateAnnualSavings = (monthlyPrice: number) => {
  return monthlyPrice * 2 // 2 months savings
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

// Auth helpers
export function storeAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function createAuthLoginUrl(email: string, message = 'account-created'): string {
  return `${SUBSCRIPTION_URLS.authLogin}?message=${message}&email=${encodeURIComponent(email)}`
}

export const SUBSCRIPTION_URLS = {
  success: '/dashboard',
  cancel: '/pricing',
  portal: '/billing',
  dashboard: '/dashboard',
  dashboardWithSuccess: '/dashboard?subscription=success',
  dashboardWithSetup: '/dashboard?setup=success',
  dashboardWithTrial: '/dashboard?trial=started',
  pricing: '/pricing',
  authLogin: '/auth/login'
} as const