import { env } from './env'

// Environment variable validation - only in runtime, not during build
const isBuildTime =
	typeof window === 'undefined' && !env.NEXT_PUBLIC_APP_URL

if (!isBuildTime) {
	if (!env.NEXT_PUBLIC_APP_URL) {
		throw new Error('NEXT_PUBLIC_APP_URL is required')
	}
	if (!env.NEXT_PUBLIC_API_BASE_URL) {
		throw new Error('NEXT_PUBLIC_API_BASE_URL is required')
	}
}

export const APP_CONFIG = {
	name: 'TenantFlow',
	description: 'Modern property management platform',
	url: env.NEXT_PUBLIC_APP_URL,
	copyright: `© ${new Date().getFullYear()} TenantFlow. All rights reserved.`,
	auth: {
		redirectUrl: '/auth/callback'
	},
	api: {
		baseUrl: env.NEXT_PUBLIC_API_BASE_URL
	},
	features: {
		registration: true,
		socialAuth: true,
		emailVerification: true
	}
} as const

export const appConfig = APP_CONFIG
export type AppConfig = typeof APP_CONFIG
