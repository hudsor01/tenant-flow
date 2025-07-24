/**
 * Shared utilities for subscription functionality
 * Based on official Stripe patterns from GitHub samples
 */

import type { PLAN_TYPE } from '@tenantflow/shared'

export interface UserFormData {
	email: string
	name: string
}

export interface PlanConfig {
	name: string
	monthlyPrice: number
	annualPrice: number
	stripeMonthlyPriceId: string | null
	stripeAnnualPriceId: string | null
	features: string[]
	propertyLimit: number
}

/**
 * Get plan configuration by ID
 * Following Stripe's recommended patterns for subscription billing
 */
export function getPlanById(planId: keyof typeof PLAN_TYPE): PlanConfig | null {
	const plans: Record<keyof typeof PLAN_TYPE, PlanConfig> = {
		FREE: { 
			name: 'Free Trial',
			monthlyPrice: 0,
			annualPrice: 0,
			stripeMonthlyPriceId: null, 
			stripeAnnualPriceId: null,
			features: ['Up to 5 properties', 'Basic tenant management', '30-day trial'],
			propertyLimit: 5
		},
		STARTER: { 
			name: 'Starter',
			monthlyPrice: 29,
			annualPrice: 290,
			stripeMonthlyPriceId: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID || null,
			stripeAnnualPriceId: import.meta.env.VITE_STRIPE_STARTER_ANNUAL_PRICE_ID || null,
			features: ['Up to 10 properties', 'Tenant portal', 'Maintenance tracking', 'Email support'],
			propertyLimit: 10
		},
		GROWTH: { 
			name: 'Growth',
			monthlyPrice: 59,
			annualPrice: 590,
			stripeMonthlyPriceId: import.meta.env.VITE_STRIPE_GROWTH_MONTHLY_PRICE_ID || null,
			stripeAnnualPriceId: import.meta.env.VITE_STRIPE_GROWTH_ANNUAL_PRICE_ID || null,
			features: ['Up to 50 properties', 'Advanced reporting', 'Custom branding', 'Priority support'],
			propertyLimit: 50
		},
		ENTERPRISE: { 
			name: 'Enterprise',
			monthlyPrice: 99,
			annualPrice: 990,
			stripeMonthlyPriceId: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || null,
			stripeAnnualPriceId: import.meta.env.VITE_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || null,
			features: ['Unlimited properties', 'White-label solution', 'API access', '24/7 support'],
			propertyLimit: -1 // -1 means unlimited
		}
	}
	return plans[planId]
}

/**
 * Get Stripe price ID for a plan
 */
export function getPriceId(planId: keyof typeof PLAN_TYPE, interval: 'monthly' | 'annual') {
	const plan = getPlanById(planId)
	if (!plan) return null
	
	return interval === 'annual' 
		? plan.stripeAnnualPriceId 
		: plan.stripeMonthlyPriceId
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency = 'usd') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
		minimumFractionDigits: 0
	}).format(amount)
}

/**
 * Calculate discount percentage for annual billing
 */
export function getAnnualDiscount(monthlyPrice: number, annualPrice: number) {
	const yearlyFromMonthly = monthlyPrice * 12
	const discount = yearlyFromMonthly - annualPrice
	const discountPercent = Math.round((discount / yearlyFromMonthly) * 100)
	return discountPercent
}

/**
 * Validates user form data for subscription signup
 */
export function validateUserForm(formData: UserFormData): string | null {
	if (!formData.email || !formData.name) {
		return 'Please fill in all required fields.'
	}
	if (!formData.email.includes('@')) {
		return 'Please enter a valid email address.'
	}
	return null
}

/**
 * Calculates annual price from monthly (2 months free)
 */
export function calculateAnnualPrice(monthlyPrice: number): number {
	return monthlyPrice * 10 // 2 months free on annual billing
}

/**
 * Calculates annual savings percentage
 */
export function calculateAnnualSavings(monthlyPrice: number): number {
	if (monthlyPrice <= 0) return 0
	const annualPrice = calculateAnnualPrice(monthlyPrice)
	return Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
}

/**
 * Manages auth tokens in localStorage
 */
export function storeAuthTokens(accessToken: string, refreshToken: string): void {
	localStorage.setItem('access_token', accessToken)
	localStorage.setItem('refresh_token', refreshToken)
}

/**
 * Common success redirect URLs
 */
export const SUBSCRIPTION_URLS = {
	dashboard: '/dashboard',
	dashboardWithSuccess: '/dashboard?subscription=success',
	dashboardWithSetup: '/dashboard?setup=success',
	dashboardWithTrial: '/dashboard?trial=started',
	pricing: '/pricing',
	authLogin: '/auth/login'
} as const

/**
 * Creates auth login URL with query parameters
 */
export function createAuthLoginUrl(email: string, message = 'account-created'): string {
	return `${SUBSCRIPTION_URLS.authLogin}?message=${message}&email=${encodeURIComponent(email)}`
}