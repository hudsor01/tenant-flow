// Build trigger: Added NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to Vercel (2025-01-16)
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

/**
 * Build-time environment validation
 * Importing env.ts here ensures validation runs during `next build`
 * This catches missing/invalid env vars BEFORE deployment, not at runtime
 *
 * @see https://env.t3.gg/docs/nextjs#validate-schema-on-build
 */
import './src/env'

const nextConfig: NextConfig = {
	reactCompiler: true,

	experimental: {
		optimizePackageImports: ['@tanstack/react-query', '@tanstack/react-form', '@tanstack/react-virtual'],
	},

// External images
	images: {
		// Cache optimized images for 7 days before re-fetching from origin
		minimumCacheTTL: 60 * 60 * 24 * 7,
		remotePatterns: [
			{ protocol: 'https', hostname: '*.supabase.co' },
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'api.dicebear.com' },
			{ protocol: 'https', hostname: '*.googleusercontent.com' },
			// Local Supabase development (excluded from production builds)
			...(process.env.NODE_ENV !== 'production'
				? [
						{ protocol: 'http' as const, hostname: '127.0.0.1' },
						{ protocol: 'http' as const, hostname: 'localhost' }
					]
				: [])
		]
	},

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
	bundleSizeOptimizations: {
		excludeDebugStatements: true
	},
	// Release tracking
	release: {
		setCommits: {
			auto: true,
			ignoreMissing: true
		}
	}
})
