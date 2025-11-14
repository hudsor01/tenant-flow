import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	poweredByHeader: false,
	compress: true,
	typedRoutes: false,

	compiler: {
		removeConsole: true
	},

	logging: {
		fetches: {
			fullUrl: true
		}
	},
	turbopack: {
		resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mdx']
	},

	// Remove broad file tracing of all native addons (.node) which bloats
	// serverless bundles. Next automatically traces required files.
	// If a specific route needs native addons, add a narrowly-scoped include later.
	cacheComponents: false,
	onDemandEntries: {
		maxInactiveAge: 25 * 1000,
		pagesBufferLength: 2
	},
	experimental: {
		optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
		serverActions: {
			bodySizeLimit: '2mb',
			allowedOrigins: ['tenantflow.app', '*.tenantflow.app', '*.vercel.app']
		}
	},
	serverExternalPackages: ['@supabase/supabase-js', '@stripe/stripe-js'],
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
		imageSizes: [32, 64, 128, 256],
		minimumCacheTTL: 14400,
		dangerouslyAllowLocalIP: false
	}
}

export default nextConfig
