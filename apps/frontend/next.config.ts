import type { NextConfig } from 'next'

if (
	process.env.NODE_ENV === 'development' &&
	!process.env.NEXT_DISABLE_DEVTOOLS
) {
	process.env.NEXT_DISABLE_DEVTOOLS = '1'
}

const nextConfig: NextConfig = {
	reactStrictMode: true,

	// Enable React Compiler for automatic optimization
	experimental: {
		reactCompiler: true,
		serverMinification: false
	},
	eslint: {
		dirs: ['src'],
		ignoreDuringBuilds: false
	},
	async headers() {
		const isDev = process.env.NODE_ENV === 'development'

		return [
			{
				// API routes security
				source: '/api/(.*)',
				headers: [
					{
						key: 'Cache-Control',
						value: 'no-cache, no-store, must-revalidate'
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
						key: 'X-XSS-Protection',
						value: '1; mode=block'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					}
				]
			},
			{
				// Global security headers
				source: '/(.*)',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: [
							"default-src 'self'",
							`script-src 'self' ${isDev ? "'unsafe-eval'" : ''} 'unsafe-inline' https://js.stripe.com https://us.i.posthog.com https://us-assets.i.posthog.com https://va.vercel-scripts.com`,
							"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
							"img-src 'self' https: data: blob:",
							"font-src 'self' https://fonts.gstatic.com",
							"connect-src 'self' https://api.tenantflow.app https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com https://va.vercel-scripts.com",
							"frame-src 'self' https://js.stripe.com",
							"object-src 'none'",
							"base-uri 'self'",
							"form-action 'self'",
							"frame-ancestors 'none'",
							'upgrade-insecure-requests',
							'report-uri /api/security/csp-report'
						].join('; ')
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
						key: 'X-XSS-Protection',
						value: '1; mode=block'
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
						key: 'Permissions-Policy',
						value:
							'camera=(), microphone=(), geolocation=(), payment=(self), autoplay=(self), encrypted-media=(), fullscreen=(), picture-in-picture=()'
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
			},
			{
				protocol: 'https',
				hostname: 'assets.aceternity.com'
			}
		],
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
	}
}

export default nextConfig
