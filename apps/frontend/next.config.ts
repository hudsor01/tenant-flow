import { getCSPString } from '@repo/shared/security/csp-config'
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
	webpack: (config, { isServer, dev }) => {
		// Optimize webpack cache for large projects with many dependencies
		// This addresses the "Serializing big strings (108kiB)" performance warning
		if (config.cache && typeof config.cache === 'object') {
			// Enable gzip compression to reduce cache serialization size
			config.cache.compression = 'gzip'

			// Optimize memory management for development builds
			if (dev) {
				// Limit memory cache generations to prevent excessive memory usage
				config.cache.maxMemoryGenerations = 1
				// Allow collecting unused memory for better performance
				config.cache.allowCollectingMemory = true
				// Set reasonable memory limits to prevent large string serialization
				config.cache.maxAge = 300000 // 5 minutes in development
			}
		}

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
		// Optimize imports for large packages to reduce webpack bundle analysis overhead
		optimizePackageImports: [
			// Icon libraries (already optimized)
			'@radix-ui/react-icons',
			'lucide-react',
			'@tabler/icons-react',
			// UI component libraries that contribute to large cache strings
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@radix-ui/react-select',
			'@radix-ui/react-popover',
			'@radix-ui/react-tooltip',
			'@radix-ui/react-accordion',
			'@radix-ui/react-tabs',
			'@radix-ui/react-avatar',
			'@radix-ui/react-checkbox',
			'@radix-ui/react-slider',
			'@radix-ui/react-switch',
			'@radix-ui/react-toggle',
			'@radix-ui/react-progress',
			'@radix-ui/react-scroll-area',
			'@tanstack/react-query',
			'@tanstack/react-table',
			'@tanstack/react-form',
			'@tanstack/react-virtual',
			'recharts',
			'react-hook-form',
			'@hookform/resolvers',
			'date-fns',
			'lodash',
			'zod'
		],

		serverComponentsHmrCache: true
	},

	// Security headers (production only - avoid blocking localhost)
	async headers() {
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
