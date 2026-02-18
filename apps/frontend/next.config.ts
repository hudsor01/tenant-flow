// Build trigger: Added NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to Vercel (2025-01-16)
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import path from 'path'

/**
 * Build-time environment validation
 * Importing env.ts here ensures validation runs during `next build`
 * This catches missing/invalid env vars BEFORE deployment, not at runtime
 *
 * @see https://env.t3.gg/docs/nextjs#validate-schema-on-build
 */
import './src/env'

const nextConfig: NextConfig = {
	// Monorepo support
	outputFileTracingRoot: path.join(__dirname, '../..'),

	// External images
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: '*.supabase.co' },
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'api.dicebear.com' },
			{ protocol: 'https', hostname: '*.googleusercontent.com' },
			// Local Supabase development
			{ protocol: 'http', hostname: '127.0.0.1' },
			{ protocol: 'http', hostname: 'localhost' }
		]
	},

	// Redirects
	async redirects() {
		return [
			{ source: '/terms-of-service', destination: '/terms', permanent: true },
			{ source: '/privacy-policy', destination: '/privacy', permanent: true },
			{ source: '/signup', destination: '/pricing', permanent: false },
			// Legacy /manage routes (deprecated, redirect to new routes)
			{ source: '/manage', destination: '/dashboard', permanent: true },
			{ source: '/manage/properties', destination: '/properties', permanent: true },
			{ source: '/manage/properties/:path*', destination: '/properties/:path*', permanent: true },
			{ source: '/manage/tenants', destination: '/tenants', permanent: true },
			{ source: '/manage/tenants/:path*', destination: '/tenants/:path*', permanent: true },
			{ source: '/manage/leases', destination: '/leases', permanent: true },
			{ source: '/manage/leases/:path*', destination: '/leases/:path*', permanent: true },
			{ source: '/manage/maintenance', destination: '/maintenance', permanent: true },
			{ source: '/manage/maintenance/:path*', destination: '/maintenance/:path*', permanent: true },
			{ source: '/manage/:path*', destination: '/:path*', permanent: true }
		]
	}
}

// Enable source maps in production, but not preview deployments
// Works on Vercel (VERCEL_ENV) and other platforms (NODE_ENV + explicit flag)
const isProduction =
	process.env.VERCEL_ENV === 'production' ||
	(process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined)

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG ?? '',
	project: process.env.SENTRY_PROJECT ?? '',
	silent: true,
	sourcemaps: {
		// Only upload on production deploys, skip previews
		disable: !isProduction,
		deleteSourcemapsAfterUpload: true,
		// Include all app chunks: app routes, shared chunks (main, framework, webpack)
		assets: ['.next/static/chunks/app/**', '.next/static/chunks/*.js']
	},
	tunnelRoute: '/monitoring',
	disableLogger: true,
	// Release tracking
	release: {
		setCommits: {
			auto: true,
			ignoreMissing: true
		}
	}
})
