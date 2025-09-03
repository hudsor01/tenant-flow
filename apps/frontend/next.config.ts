import type { NextConfig } from 'next/types'
import path from 'node:path'
import { getCSPString } from '@repo/shared'

// Webpack configuration for production builds
interface WebpackConfig {
ignoreWarnings?: {
module: RegExp
message: RegExp
}[]
resolve?: {
fallback?: Record<string, boolean>
alias?: Record<string, string>
}
plugins?: unknown[]
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
	outputFileTracingRoot: path.join(__dirname, '../../'),
	
	// External packages for server components (Next.js 15)
	serverExternalPackages: ['@react-email/components'],
	
	// Next.js 15 Experimental Features
	experimental: {
		// Remove CSS chunking configuration to use Next.js defaults
		// cssChunking: true, // commented out - let Next.js handle it automatically
		optimizeCss: false,
		
		// Enable server actions optimizations
		serverActions: {
			bodySizeLimit: '2mb',
			allowedOrigins: ['localhost:3000', 'tenantflow.app', '*.tenantflow.app']
		},
		
		// Enable faster builds with module graph optimization
		optimizePackageImports: [
			'@radix-ui/react-*',
			'@supabase/supabase-js',
			'@tanstack/react-query',
			'zustand',
			'zod',
			'date-fns',
			'framer-motion'
		],
		
		// Improve Vercel deployment compatibility (deprecated - moved to serverExternalPackages)
		// serverComponentsExternalPackages: ['@react-email/components']
	},

	// Build validation - temporarily ignore ESLint warnings during builds
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
			},
			{
				protocol: 'https',
				hostname: 'ui-avatars.com',
				pathname: '/**'
			}
		],
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 31536000, // 1 year
		dangerouslyAllowSVG: true,
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
	},

	// Security headers
	async headers() {
		const headers = [
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
		
		// Only apply security headers in production to avoid development MIME issues
		if (process.env.NODE_ENV === 'production') {
			headers.push({
				source: '/((?!_next/static).*)',
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
						value: getCSPString()
					}
				]
			})
		}
		
		return headers
	},

	// PostHog analytics proxy (prevents ad blockers) + Backend API proxy
	async rewrites() {
		return [
			// Proxy API calls to backend (add v1 prefix)
			{
				source: '/api/:path*',
				destination: 'http://localhost:4600/api/v1/:path*'
			},
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

	// No legacy redirects; all links point to canonical routes
	async redirects() {
		return []
	},

	// Explicitly disable legacy error pages generation
	pageExtensions: ['tsx', 'ts'],

	// Turbopack configuration for development
	...(process.env.NODE_ENV === 'development' && {
		turbopack: {
			// Point to monorepo root to fix package resolution in monorepo
			root: path.join(__dirname, '../../'),
			rules: {
				'*.svg': {
					loaders: ['@svgr/webpack'],
					as: '*.js'
				}
			}
		}
	}),

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

 // Resolve `@repo/shared` to the shared source during dev/build so both TypeScript
 // path aliases and the bundler resolve to the same files (prevents runtime import failures)
 if (!typedConfig.resolve) {
   typedConfig.resolve = {}
 }
 // Merge any existing alias config
 // Note: webpack alias does not support glob wildcards; mapping the package root is sufficient
 typedConfig.resolve.alias = {
   ...(typedConfig.resolve.alias || {}),
   '@repo/shared': path.join(__dirname, '../../packages/shared/src')
 }

		// Client-side fallbacks for production
		if (!isServer) {
			if (!typedConfig.resolve) {
				typedConfig.resolve = {}
			}
			typedConfig.resolve.fallback = {
				...typedConfig.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				// Add ws polyfill for Supabase realtime
				ws: false
			}
		}

		// Tailwind CSS v4 is now handled by PostCSS, not webpack
		// No additional webpack configuration needed

		return typedConfig
	}

	// Environment variables are handled by env-config.ts
}

export default nextConfig
