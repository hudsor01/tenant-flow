import type { NextConfig } from 'next/types'

// Webpack configuration for production builds
interface WebpackConfig {
	ignoreWarnings?: {
		module: RegExp
		message: RegExp
	}[]
	resolve?: {
		fallback?: Record<string, boolean>
	}
}

interface WebpackContext {
	dev: boolean
	isServer: boolean
}

const nextConfig: NextConfig = {
	// Core production optimizations
	reactStrictMode: true,
	compress: true,
	poweredByHeader: false,
	trailingSlash: false,
	generateEtags: true,
	outputFileTracingRoot: process.cwd().includes('tenant-flow')
		? process.cwd().split('/tenant-flow')[0] + '/tenant-flow'
		: process.cwd(),

	// Build validation
	eslint: {
		ignoreDuringBuilds: false
	},
	typescript: {
		ignoreBuildErrors: false
	},

	// Image optimization for Vercel
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'lh3.googleusercontent.com',
				pathname: '/**'
			},
			{
				protocol: 'https',
				hostname: '*.supabase.co',
				pathname: '/**'
			},
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
				pathname: '/**'
			}
		],
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 31536000, // 1 year
		dangerouslyAllowSVG: false,
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
	},

	// Security headers
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'DENY'
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains; preload'
					},
					{
						key: 'Content-Security-Policy',
						value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://us.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.tenantflow.app https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://us.i.posthog.com; frame-src https://js.stripe.com; frame-ancestors 'none';"
					}
				]
			},
			// Static asset caching
			{
				source: '/_next/static/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable'
					}
				]
			}
		]
	},

	// PostHog analytics proxy (prevents ad blockers)
	async rewrites() {
		return [
			{
				source: '/ingest/static/:path*',
				destination: 'https://us-assets.i.posthog.com/static/:path*'
			},
			{
				source: '/ingest/:path*',
				destination: 'https://us.i.posthog.com/:path*'
			}
		]
	},

	// Basic redirects
	async redirects() {
		return [
			{
				source: '/signin',
				destination: '/auth/login',
				permanent: true
			},
			{
				source: '/signup',
				destination: '/auth/signup',
				permanent: false
			}
		]
	},

	// Explicitly disable legacy error pages generation
	pageExtensions: ['tsx', 'ts'],

	// Turbopack configuration for development
	turbopack: {
		rules: {
			'*.svg': {
				loaders: ['@svgr/webpack'],
				as: '*.js'
			}
		}
	},

	// Webpack configuration for production builds
	webpack: (config: unknown, context: unknown): unknown => {
		const typedConfig = config as WebpackConfig
		const typedContext = context as WebpackContext
		const { isServer } = typedContext

		// Suppress Supabase websocket warnings in all builds
		typedConfig.ignoreWarnings = [
			...(typedConfig.ignoreWarnings || []),
			{ module: /websocket-factory/, message: /Critical dependency/ },
			{ module: /@supabase/, message: /Critical dependency/ }
		]

		// Client-side fallbacks for production
		if (!isServer) {
			if (!typedConfig.resolve) {
				typedConfig.resolve = {}
			}
			typedConfig.resolve.fallback = {
				...typedConfig.resolve.fallback,
				fs: false,
				net: false,
				tls: false
			}
		}

		return typedConfig
	}

	// Environment variables are handled by env-config.ts
}

export default nextConfig
