/**
 * Unified CSP Configuration for TenantFlow
 * Single source of truth for Content Security Policy directives
 * Follows DRY/KISS/Native principles - consolidates 3 separate CSP definitions
 */

import type { CSPDirectives } from '../types/security.js'
import { APP_DOMAINS } from './cors-config.js'

// Environment-based CSP domains
export const CSP_DOMAINS = {
	// Core application domains (aligned with CORS config)
	API_DOMAINS: [...APP_DOMAINS.BACKEND],

	// Third-party services (production)
	STRIPE: [
		'https://js.stripe.com',
		'https://api.stripe.com',
		'https://checkout.stripe.com'
	],

	SUPABASE: ['https://bshjmbshupiibfiewpxb.supabase.co'],

	POSTHOG: ['https://us.i.posthog.com', 'https://us-assets.i.posthog.com'],

	GOOGLE: [
		'https://fonts.googleapis.com',
		'https://fonts.gstatic.com',
		'https://maps.googleapis.com',
		'https://lh3.googleusercontent.com'
	],

	// Development/build tools (only in non-production)
	VERCEL_DEV: ['https://vercel.live', 'https://*.vercel-scripts.com'],

	// Image sources
	IMAGES: ['https://images.unsplash.com', 'data:', 'blob:']
} as const

/**
 * Generate CSP directives based on environment
 */
export function generateCSPDirectives(
	environment: 'development' | 'production' = 'production'
): CSPDirectives {
	const isDev = environment === 'development'

	return {
		'default-src': ["'self'"],

		'script-src': [
			"'self'",
			"'unsafe-inline'", // Required for Next.js and some libraries
			"'unsafe-eval'", // Required for development and some libraries
			...CSP_DOMAINS.STRIPE,
			...CSP_DOMAINS.POSTHOG,
			...CSP_DOMAINS.GOOGLE,
			...(isDev ? CSP_DOMAINS.VERCEL_DEV : [])
		],

		'style-src': [
			"'self'",
			"'unsafe-inline'", // Required for Tailwind CSS and component libraries
			...CSP_DOMAINS.GOOGLE
		],

		'font-src': [
			"'self'",
			'data:', // Required for icon fonts
			...CSP_DOMAINS.GOOGLE
		],

		'img-src': [
			"'self'",
			'https:', // Allow all HTTPS images (common for user uploads)
			...CSP_DOMAINS.IMAGES,
			...CSP_DOMAINS.GOOGLE,
			...CSP_DOMAINS.SUPABASE
		],

		'connect-src': [
			"'self'",
			...CSP_DOMAINS.API_DOMAINS,
			...CSP_DOMAINS.SUPABASE,
			...CSP_DOMAINS.STRIPE,
			...CSP_DOMAINS.POSTHOG
		],

		'frame-src': ["'self'", ...CSP_DOMAINS.STRIPE],

		// Worker sources for PostHog recorder
		'worker-src': ["'self'", 'blob:'],

		'object-src': ["'none'"], // Prevent object/embed/applet for security

		'base-uri': ["'self'"],

		'form-action': ["'self'"],

		// Prevent clickjacking in production, allow in development for localhost
		'frame-ancestors': isDev ? ["'self'"] : ["'none'"],

		'upgrade-insecure-requests': true,

		'block-all-mixed-content': false // Let upgrade-insecure-requests handle it
	}
}

/**
 * Convert CSP directives to string format
 */
export function cspDirectivesToString(directives: CSPDirectives): string {
	const parts: string[] = []

	for (const [key, value] of Object.entries(directives)) {
		if (key === 'upgrade-insecure-requests' && value) {
			parts.push('upgrade-insecure-requests')
		} else if (key === 'block-all-mixed-content' && value) {
			parts.push('block-all-mixed-content')
		} else if (Array.isArray(value) && value.length > 0) {
			parts.push(`${key} ${value.join(' ')}`)
		}
	}

	return parts.join('; ')
}

/**
 * Get production CSP string (most secure)
 */
export function getProductionCSP(): string {
	return cspDirectivesToString(generateCSPDirectives('production'))
}

/**
 * Get development CSP string (includes dev tools)
 */
export function getDevelopmentCSP(): string {
	return cspDirectivesToString(generateCSPDirectives('development'))
}

/**
 * Get environment-appropriate CSP string
 */
export function getCSPString(
	environment?: 'development' | 'production'
): string {
	const env =
		environment ||
		(process.env.NODE_ENV === 'development' ? 'development' : 'production')
	return cspDirectivesToString(generateCSPDirectives(env))
}
