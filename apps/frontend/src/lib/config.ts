/**
 * Application configuration
 * Centralized configuration for the TenantFlow frontend
 */

import { logger } from '@/lib/logger'

export const config = {
	api: {
		baseURL: (() => {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			if (!apiUrl) {
				throw new Error('NEXT_PUBLIC_API_URL is required for production deployment')
			}
			return apiUrl
		})(),
		timeout: 30000,
		healthCheckPath: '/health',
		retries: 3,
		retryDelay: 1000
	},
	supabase: {
		url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
		anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
	},
	stripe: {
		publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
	},
	analytics: {
		posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
		posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || ''
	},
	app: {
		env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
		version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
		name: 'TenantFlow'
	},
	features: {
		analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
		errorReporting:
			process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true'
	}
} as const

// Environment validation with production-specific checks
if (typeof window !== 'undefined') {
	// Delay validation to avoid build-time warnings
	setTimeout(() => {
		const requiredEnvVars = [
			'NEXT_PUBLIC_SUPABASE_URL',
			'NEXT_PUBLIC_SUPABASE_ANON_KEY',
			'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
		] as const

		// Production-specific validation
		if (config.app.env === 'production') {
			const productionRequiredVars = [
				...requiredEnvVars,
				'NEXT_PUBLIC_API_URL',
				'NEXT_PUBLIC_POSTHOG_KEY',
				'NEXT_PUBLIC_POSTHOG_HOST'
			] as const

			for (const envVar of productionRequiredVars) {
				if (!process.env[envVar]) {
					logger.error(
						`🚨 PRODUCTION ERROR: Missing required environment variable: ${envVar}`
					)
				}
			}

			// Validate API URL format in production
			if (
				process.env.NEXT_PUBLIC_API_URL &&
				!process.env.NEXT_PUBLIC_API_URL.startsWith('https://')
			) {
				logger.error(
					'🚨 PRODUCTION ERROR: API_URL must use HTTPS in production'
				)
			}
		} else {
			// Development validation (less strict)
			for (const envVar of requiredEnvVars) {
				if (!process.env[envVar]) {
					logger.warn(`Missing environment variable: ${envVar}`)
				}
			}
		}

		// Log current configuration (excluding sensitive data)
		logger.info('Configuration loaded:', {
			api: {
				baseURL: config.api.baseURL,
				timeout: config.api.timeout
			},
			app: config.app,
			features: config.features,
			supabase: {
				url: config.supabase.url ? config.supabase.url.slice(0, 30) + '...' : 'MISSING',
				anonKey: config.supabase.anonKey ? config.supabase.anonKey.slice(0, 20) + '...' : 'MISSING'
			}
		})
	}, 0)
}