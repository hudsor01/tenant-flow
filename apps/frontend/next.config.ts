import { getCSPString } from '@repo/shared/security/csp-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Core optimizations
	reactStrictMode: true, // RE-ENABLED: Auth fix verified compatible
	productionBrowserSourceMaps: false,
	poweredByHeader: false,

	// ESLint configuration - Disabled during builds (pre-commit hooks + CI handle linting)
	// Flat config (ESLint 9) with @next/eslint-plugin-next properly integrated in root eslint.config.js
	eslint: {
		dirs: ['src'],
		ignoreDuringBuilds: true // Linting enforced via pre-commit hooks + GitHub Actions
	},

	// TypeScript configuration - Type-safe routing (Next.js 15.5+)
	// Compile-time route validation: catches invalid routes at build time
	// Zero runtime cost, full autocomplete in IDE for all routes
	typescript: {
		typedRoutes: true
	},

	// Compiler optimizations (production builds only)
	// Remove console.log statements (keeps error/warn for debugging)
	compiler: {
		removeConsole: {
			exclude: ['error', 'warn']
		}
	},

	// Build-time logging configuration
	// Useful for debugging SSR data fetching and external API calls
	logging: {
		fetches: {
			fullUrl: true // Log complete URLs during builds
		}
	},

	// Turbopack configuration (Next.js 15.5+)
	// Stable for development, beta for production builds
	// Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
	turbopack: {
		// Empty config = use defaults (no custom loaders/aliases needed)
		// Turbopack automatically handles CSS Modules, PostCSS, Sass, TypeScript
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

		serverComponentsHmrCache: true,

		// Railway deployment optimization: Include native dependencies in output bundle
		// Ensures .node files and native modules are properly bundled for Docker deployments
		// Reduces Railway cold start time and prevents "Cannot find module" errors
		outputFileTracingIncludes: {
			'/api/*': ['./node_modules/**/*.node']
		}
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
