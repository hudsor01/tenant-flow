/**
 * Stripe Configuration
 * 
 * This file contains Stripe-related configuration that's safe to expose on the frontend.
 * All sensitive operations are handled through backend API endpoints.
 */

export const STRIPE_CONFIG = {
	publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
} as const

// Validation helper to ensure publishable key is set
export function validateStripeConfig(): { isValid: boolean; missing: string[] } {
	const missing: string[] = []
	
	if (!STRIPE_CONFIG.publishableKey) {
		missing.push('VITE_STRIPE_PUBLISHABLE_KEY')
	}
	
	return {
		isValid: missing.length === 0,
		missing
	}
}

// Development helper to check if Stripe is properly configured
export function logStripeConfigStatus() {
	if (import.meta.env.DEV) {
		const validation = validateStripeConfig()
		if (validation.isValid) {
			console.warn('✅ Stripe configuration is valid')
		} else {
			console.warn('⚠️ Missing Stripe configuration:', validation.missing.join(', '))
		}
	}
}