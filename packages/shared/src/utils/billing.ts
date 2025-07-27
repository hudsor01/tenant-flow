/**
 * Billing utilities
 * Helper functions for billing and subscription display
 */

import { PLANS } from '../constants/billing'
import type { PlanType } from '../types/billing'

export const getPlanTypeLabel = (plan: PlanType): string => {
  const labels: Record<PlanType, string> = {
    FREE: 'Free Trial',
    STARTER: 'Starter',
    GROWTH: 'Growth',
    ENTERPRISE: 'Enterprise'
  }
  return labels[plan] || plan
}

export const getPlanById = (planId: string) => {
  return PLANS.find((plan) => plan.id === planId)
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

// Subscription URLs constants
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