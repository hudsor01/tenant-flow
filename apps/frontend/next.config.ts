import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Core optimizations
	reactStrictMode: true, // RE-ENABLED: Auth fix verified compatible
	productionBrowserSourceMaps: false,
	poweredByHeader: false,

	// ESLint configuration
	eslint: {
		dirs: ['src'],
		ignoreDuringBuilds: false
	},

	// Webpack configuration with cache optimization and performance improvements
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.ignoreWarnings = [
				{
					module: /supabase/,
					message: /which is not supported in the Edge Runtime/
				},
				{
					module: /chrome-extension/,
					message: /Failed to parse source map/
				}
			]
		}

		return config
	},

	// Experimental performance optimizations
	experimental: {
		// ✅ RE-ENABLED (2025-10-26): Stable in Next.js 15.5.6 + React 19.2.0
		// Per official docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
		// Default optimization for 24 common packages + custom additions
		optimizePackageImports: [
			'@radix-ui/react-icons',
			'lucide-react',
			'date-fns',
			'recharts',
			'@tanstack/react-query',
			'@tanstack/react-table',
			'framer-motion',
			'react-dropzone'
		],

		serverComponentsHmrCache: true
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
				key: 'Referrer-Policy',
				value: 'strict-origin-when-cross-origin'
			}
		]

		// Add CSP only in production to avoid blocking localhost dev tools
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

export default nextConfig
