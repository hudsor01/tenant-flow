import { API_BASE_URL } from '#lib/api-config'

// Environment variable validation - only in runtime, not during build
const isBuildTime =
	typeof window === 'undefined' && !process.env.NEXT_PUBLIC_APP_URL

if (!isBuildTime) {
	if (!process.env.NEXT_PUBLIC_APP_URL) {
		throw new Error('NEXT_PUBLIC_APP_URL is required')
	}
	if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
		throw new Error('NEXT_PUBLIC_API_BASE_URL is required')
	}
}

export const APP_CONFIG = {
	name: 'TenantFlow',
	description: 'Modern property management platform',
	url: process.env.NEXT_PUBLIC_APP_URL || '',
	copyright: `© ${new Date().getFullYear()} TenantFlow. All rights reserved.`,
	auth: {
		redirectUrl: '/auth/callback'
	},
	api: {
		baseUrl: API_BASE_URL
	},
	features: {
		registration: true,
		socialAuth: true,
		emailVerification: true
	}
} as const

export const appConfig = APP_CONFIG
export type AppConfig = typeof APP_CONFIG
