import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	poweredByHeader: false,

	typedRoutes: true,

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

	outputFileTracingIncludes: {
		'/api/*': ['./node_modules/**/*.node']
	},

	experimental: {
		optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
		serverComponentsHmrCache: true,
		serverActions: {
			bodySizeLimit: '2mb',
			allowedOrigins: ['tenantflow.app', '*.tenantflow.app', '*.vercel.app']
		}
		// Next.js 16: Enable Cache Components (replaces PPR)
		// cacheComponents: true,
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
		imageSizes: [32, 64, 128, 256]
		// Next.js 16 defaults (documented for reference):
		// - minimumCacheTTL: 14400 (4 hours, was 60s in Next.js 15)
		// - qualities: [75] (was variable range)
		// - maximumRedirects: 3 (was unlimited)
		// Override above if needed for custom behavior
	}
}

export default nextConfig
