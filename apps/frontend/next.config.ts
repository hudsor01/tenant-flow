import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Core optimizations
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	poweredByHeader: false,

	// ESLint configuration
	eslint: {
		dirs: ['src'],
		ignoreDuringBuilds: false
	},

	// Webpack configuration to suppress Supabase Edge Runtime warnings
	webpack: (config, { isServer }) => {
		// Suppress specific warnings from Supabase libraries in Edge Runtime
		if (!isServer) {
			config.ignoreWarnings = [
				{
					module: /supabase/,
					message: /which is not supported in the Edge Runtime/
				}
			]
		}
		return config
	},

	// Experimental performance optimizations
	experimental: {
		optimizePackageImports: [
			'@radix-ui/react-icons',
			'lucide-react',
			'@tabler/icons-react'
		],
		serverComponentsHmrCache: true
	},

	// Security headers (production only - avoid blocking localhost)
	async headers() {
		// Only apply strict security headers in production
		if (process.env.NODE_ENV !== 'production') {
			return []
		}

		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: getCSPString('production')
					},
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
			}
		]
	},

	// Optimized image configuration
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
