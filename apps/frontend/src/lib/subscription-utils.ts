import { PLAN_TYPE, PLANS } from '@repo/shared'

interface PlanWithUIMapping {
  id: string
  name: string
  description: string
  price: { monthly: number; annual: number }
  features: string[]
  propertyLimit: number
  storageLimit: number
  apiCallLimit: number
  priority: boolean
}

export function getPlanWithUIMapping(planType: keyof typeof PLAN_TYPE): PlanWithUIMapping | null {
  const plan = PLANS.find(p => p.id === planType)
  if (!plan) {
    console.warn(`Plan not found for type: ${planType}`)
    return null
  }
  
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: {
      monthly: plan.price.monthly / 100, // Convert from cents to dollars
      annual: plan.price.annual / 100
    },
    features: plan.features,
    propertyLimit: plan.propertyLimit,
    storageLimit: plan.storageLimit,
    apiCallLimit: plan.apiCallLimit,
    priority: plan.priority
  }
}

/**
 * @deprecated Use formatPriceFromCents from '@repo/shared/utils' instead
 */
export function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

export function getPlanDisplayName(planType: keyof typeof PLAN_TYPE): string {
  const plan = getPlanWithUIMapping(planType)
  return plan?.name || planType
}

// Additional utilities for subscription modal
export interface UserFormData {
  fullName: string
  email: string
  password: string
}

export function validateUserForm(data: UserFormData): string | null {
  if (!data.fullName.trim()) return 'Full name is required'
  if (!data.email.trim()) return 'Email is required'
  if (!data.email.includes('@')) return 'Valid email is required'
  if (data.password.length < 6) return 'Password must be at least 6 characters'
  return null
}

export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  return (monthlyPrice * 12) - annualPrice
}

export function createAuthLoginUrl(returnTo?: string): string {
  const baseUrl = '/auth/login'
  return returnTo ? `${baseUrl}?returnTo=${encodeURIComponent(returnTo)}` : baseUrl
}

export const SUBSCRIPTION_URLS = {
  success: '/billing/success',
  cancel: '/pricing',
  portal: '/billing/portal'
}