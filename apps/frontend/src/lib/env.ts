/**
 * Environment Configuration
 * Centralized configuration for environment variables with validation
 */

import type { StripeEnvironmentConfig } from '@/types/stripe'

/**
 * Get Stripe configuration from environment variables
 */
export function getStripeConfig(): StripeEnvironmentConfig {
	const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
	const secretKey = process.env.STRIPE_SECRET_KEY

	if (!publishableKey) {
		throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required')
	}

	if (!secretKey) {
		throw new Error('STRIPE_SECRET_KEY is required')
	}

	return {
		publishableKey,
		prices: {
			starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || '',
			starter_annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || '',
			growth_monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || '',
			growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || '',
			max_monthly: process.env.STRIPE_MAX_MONTHLY_PRICE_ID || '',
			max_annual: process.env.STRIPE_MAX_ANNUAL_PRICE_ID || ''
		},
		products: {
			starter: 'prod_starter',
			growth: 'prod_growth',
			max: 'prod_max'
		}
	}
}

/**
 * Get site configuration
 */
export function getSiteConfig() {
	return {
		siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4600'
	}
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
	const errors: string[] = []

	// Check Stripe configuration
	try {
		getStripeConfig()
	} catch (error) {
		errors.push(
			error instanceof Error ? error.message : 'Invalid Stripe configuration'
		)
	}

	// Check site configuration
	const siteConfig = getSiteConfig()
	if (!siteConfig.siteUrl) {
		errors.push('NEXT_PUBLIC_SITE_URL is required')
	}

	return {
		isValid: errors.length === 0,
		errors
	}
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
	return {
		nodeEnv: process.env.NODE_ENV,
		siteUrl: getSiteConfig().siteUrl,
		hasStripeKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
		isDevelopment: process.env.NODE_ENV === 'development',
		isProduction: process.env.NODE_ENV === 'production'
	}
}
