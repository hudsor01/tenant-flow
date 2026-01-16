import { withSentryConfig } from '@sentry/nextjs'
import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
	// Core settings
	reactStrictMode: true,
	poweredByHeader: false,
	compress: true,

	// Disable for faster builds, enable in CI if needed
	productionBrowserSourceMaps: false,

	// TypeScript route validation (disable if slow builds)
	typedRoutes: false,

	// Compiler optimizations
	compiler: {
		removeConsole: process.env.NODE_ENV === 'production'
	},

	// Monorepo support - required for output tracing in turborepo
	outputFileTracingRoot: path.join(__dirname, '../..'),

	// Turbopack configuration (now top-level in Next.js 16)
	turbopack: {
		root: path.join(__dirname, '../..'),
		resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mdx']
	},

	// Cache Components (Next.js 16 feature for "use cache" directive)
	cacheComponents: true,

	// Experimental features
	experimental: {
		// Tree-shake barrel imports for these packages
		// Note: lucide-react, date-fns, recharts are optimized by default
		optimizePackageImports: [
			'@radix-ui/react-icons',
			'react-day-picker',
			'@tanstack/react-table',
			'@dnd-kit/core',
			'@dnd-kit/sortable',
			'@dnd-kit/utilities'
		],
		// Server Actions config - restricted to production domains only
		serverActions: {
			bodySizeLimit: '2mb',
			allowedOrigins: ['tenantflow.app', '*.tenantflow.app']
		}
	},

	// Packages that should use native Node.js require instead of bundling
	serverExternalPackages: ['@supabase/supabase-js', '@stripe/stripe-js'],

	// URL redirects
	async redirects() {
		return [
			{
				source: '/terms-of-service',
				destination: '/terms',
				permanent: true
			},
			{
				source: '/privacy-policy',
				destination: '/privacy',
				permanent: true
			},
			{
				source: '/security',
				destination: '/privacy',
				permanent: true
			},
			{
				source: '/signup',
				destination: '/pricing',
				permanent: false
			}
		]
	},

	// Security headers
	async headers() {
		const securityHeaders = [
			{
				key: 'X-Content-Type-Options',
				value: 'nosniff'
			},
			{
				key: 'X-Frame-Options',
				value: 'DENY'
			},
			{
				key: 'X-XSS-Protection',
				value: '1; mode=block'
			},
			{
				key: 'Referrer-Policy',
				value: 'strict-origin-when-cross-origin'
			},
			{
				key: 'Permissions-Policy',
				value: 'camera=(), microphone=(), geolocation=()'
			},
			{
				key: 'Cross-Origin-Embedder-Policy',
				value: 'credentialless'
			},
			{
				key: 'Cross-Origin-Opener-Policy',
				value: 'same-origin'
			},
			{
				key: 'Cross-Origin-Resource-Policy',
				value: 'same-origin'
			}
		]
		if (process.env.NODE_ENV === 'production') {
			securityHeaders.unshift({
				key: 'Content-Security-Policy',
				value: getCSPString('production')
			})
		}
		return [
			{
				source: '/(.*)',
				headers: securityHeaders
			}
		]
	},

	// Image optimization (Next.js 16 defaults applied)
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.supabase.co'
			},
			{
				protocol: 'https',
				hostname: 'images.unsplash.com'
			},
			{
				protocol: 'https',
				hostname: 'api.dicebear.com'
			},
			{
				protocol: 'https',
				hostname: '*.googleusercontent.com'
			}
		],
		// Modern formats (avif first for better compression)
		formats: ['image/avif', 'image/webp'],
		// Responsive breakpoints
		deviceSizes: [640, 828, 1200, 1920],
		imageSizes: [32, 64, 128, 256],
		// 4 hours cache (Next.js 16 default)
		minimumCacheTTL: 14400,
		// Security: block local IP image optimization
		dangerouslyAllowLocalIP: false
	}
}

export default withSentryConfig(nextConfig, {
	// Sentry organization and project (required for source map upload)
	org: process.env.SENTRY_ORG ?? '',
	project: process.env.SENTRY_PROJECT ?? '',

	// Suppress source map upload logs
	silent: !process.env.CI,

	// Upload source maps for better error stack traces
	widenClientFileUpload: true,

	// Tree-shake Sentry logger in production
	disableLogger: true,

	// Automatically instrument API routes and data fetching
	autoInstrumentServerFunctions: true,
	autoInstrumentMiddleware: true,
	autoInstrumentAppDirectory: true,

	// Source map handling - hide from client bundles but upload to Sentry
	sourcemaps: {
		deleteSourcemapsAfterUpload: true
	},

	// Tunneling to avoid ad blockers (optional)
	tunnelRoute: '/monitoring'
})
