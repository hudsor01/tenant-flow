import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	poweredByHeader: false,

	eslint: {
		dirs: ['src'],
		ignoreDuringBuilds: false
	},

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
			}
		],
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 828, 1200, 1920],
		imageSizes: [32, 64, 128, 256]
	}
}

export default nextConfig
