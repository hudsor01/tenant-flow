/**
 * Application Configuration
 *
 * - Development: Falls back to localhost URLs
 * - Production: Requires environment variables to be set
 */

const DEV_APP_URL = 'http://localhost:3000'
const DEV_API_URL = 'http://localhost:4600'

function getEnvVar(key: string, devDefault: string): string {
	const value =
		process.env[key] ||
		(process.env.NODE_ENV === 'production' ? undefined : devDefault)

	if (!value) {
		throw new Error(
			`${key} environment variable is required in production. ` +
				'Set it in your deployment environment.'
		)
	}
	return value
}

export const APP_CONFIG = {
	name: 'TenantFlow',
	description: 'Modern property management platform',
	get url() {
		return getEnvVar('NEXT_PUBLIC_APP_URL', DEV_APP_URL)
	},
	copyright: `© ${new Date().getFullYear()} TenantFlow. All rights reserved.`,
	auth: {
		redirectUrl: '/auth/callback'
	},
	api: {
		get baseUrl() {
			return getEnvVar('NEXT_PUBLIC_API_BASE_URL', DEV_API_URL)
		}
	},
	features: {
		registration: true,
		socialAuth: true,
		emailVerification: true
	}
} as const

export const appConfig = APP_CONFIG
export type AppConfig = typeof APP_CONFIG
