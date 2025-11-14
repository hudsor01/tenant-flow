import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	poweredByHeader: false,
	compress: true,

	// Disabled due to Next.js path-to-regexp bug with intercepting routes + dynamic segments.
	typedRoutes: false,

	compiler: {
		removeConsole: true
	},

	logging: {
		fetches: {
			fullUrl: true
		}
	},

	// Next.js 16: Turbopack is default bundler (use --webpack flag to opt out)
	turbopack: {
		resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mdx']
	},

	outputFileTracingIncludes: {
		'/api/*': ['./node_modules/**/*.node']
	},

	// Next.js 16: Cache Components for PPR and instant navigation
	// Currently disabled - requires Suspense boundaries around all data fetching.
	// Enable when ready to fully implement streaming architecture.
	// Suspense boundaries have been added to the dashboard page, but more are needed elsewhere.
	cacheComponents: false,

	// Reduce bundle size for Vercel serverless limit
	onDemandEntries: {
		maxInactiveAge: 25 * 1000,
		pagesBufferLength: 2
	},

	// Next.js 16: These still need to be in experimental
	experimental: {
		optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
		serverActions: {
			bodySizeLimit: '2mb',
			allowedOrigins: ['tenantflow.app', '*.tenantflow.app', '*.vercel.app']
		}
	},

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
				key: 'Referrer-Policy',
				value: 'strict-origin-when-cross-origin'
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
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 828, 1200, 1920],
		// Next.js 16 removed 16 from default imageSizes
		imageSizes: [32, 64, 128, 256],
		// Next.js 16 defaults: minimumCacheTTL is now 4 hours (14400)
		minimumCacheTTL: 14400,
		// Next.js 16: quality is set via individual image components or defaults to 75
		// Security: Block local IP optimization by default in v16
		dangerouslyAllowLocalIP: false
	}
}

export default nextConfig
