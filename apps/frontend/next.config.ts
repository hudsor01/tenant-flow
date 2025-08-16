import type { NextConfig } from './src/types/next'

interface WebpackConfig {
	optimization?: {
		splitChunks?: {
			cacheGroups?: Record<
				string,
				{
					test?: RegExp
					name?: string
					chunks?: string
					priority?: number
					enforce?: boolean
				}
			>
		}
	}
	module?: {
		rules?: Array<{
			test: RegExp
			loader: string
		}>
	}
	ignoreWarnings?: Array<{
		module: RegExp
		message: RegExp
	}>
	resolve?: {
		fallback?: Record<string, boolean>
	}
}

interface WebpackPlugin {
	new (...args: unknown[]): unknown
}

interface WebpackContext {
	dev: boolean
	isServer: boolean
	webpack: {
		ProvidePlugin: WebpackPlugin
		DefinePlugin: WebpackPlugin
	}
}

const nextConfig: NextConfig = {
	// Core production optimizations
	reactStrictMode: true,
	compress: true,
	poweredByHeader: false,
	trailingSlash: false,
	generateEtags: true,

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
		const isDev = process.env.NODE_ENV === 'development'

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
					...(isDev
						? []
						: [
								{
									key: 'Strict-Transport-Security',
									value: 'max-age=31536000; includeSubDomains; preload'
								},
								{
									key: 'Content-Security-Policy',
									value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://us.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.tenantflow.app https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://us.i.posthog.com; frame-src https://js.stripe.com; frame-ancestors 'none';"
								}
							])
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

	// Minimal webpack config for production
	webpack: (config: unknown, context: unknown): unknown => {
		const typedConfig = config as WebpackConfig
		const typedContext = context as WebpackContext
		const { dev, isServer } = typedContext
		// Only apply optimizations in production builds
		if (!dev && !isServer) {
			// Optimize React chunk splitting to prevent Children errors
			if (typedConfig.optimization?.splitChunks) {
				typedConfig.optimization.splitChunks.cacheGroups = {
					...typedConfig.optimization.splitChunks.cacheGroups,
					react: {
						test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
						name: 'react',
						chunks: 'all',
						priority: 20,
						enforce: true
					}
				}
			}

			// Exclude test files from production bundle
			typedConfig.module?.rules?.push({
				test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
				loader: 'ignore-loader'
			})
		}

		// Suppress Supabase websocket warnings
		typedConfig.ignoreWarnings = [
			...(typedConfig.ignoreWarnings || []),
			{ module: /websocket-factory/, message: /Critical dependency/ },
			{ module: /@supabase/, message: /Critical dependency/ }
		]

		// Client-side fallbacks
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
	},

	// Environment variables for client
	env: {
		NEXT_PUBLIC_APP_NAME: 'TenantFlow',
		NEXT_PUBLIC_APP_URL:
			process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	}
}

export default nextConfig
