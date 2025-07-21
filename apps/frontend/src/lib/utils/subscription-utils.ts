/**
 * Shared utilities for subscription functionality
 */

export interface UserFormData {
	email: string
	name: string
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