import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
	// Monorepo support
	outputFileTracingRoot: path.join(__dirname, '../..'),

	// External images
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: '*.supabase.co' },
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'api.dicebear.com' },
			{ protocol: 'https', hostname: '*.googleusercontent.com' }
		]
	},

	// Redirects
	async redirects() {
		return [
			{ source: '/terms-of-service', destination: '/terms', permanent: true },
			{ source: '/privacy-policy', destination: '/privacy', permanent: true },
			{ source: '/signup', destination: '/pricing', permanent: false }
		]
	}
}

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG ?? '',
	project: process.env.SENTRY_PROJECT ?? '',
	silent: true,
	sourcemaps: { deleteSourcemapsAfterUpload: true },
	tunnelRoute: '/monitoring',
	disableLogger: true
})
