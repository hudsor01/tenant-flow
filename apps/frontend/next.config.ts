import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	
	// PERMANENT FIX: Disable Turbopack, use Webpack (never fails)
	// Remove --turbo flag from package.json dev script or comment turbo config
	// turbopack: {
	// 	root: path.join(__dirname, '../../')
	// },
	
	// API proxy to backend
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'http://localhost:4600/api/v1/:path*'
			}
		]
	},

	// Mobile-optimized image configuration
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
		// Mobile performance optimizations
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	}
}

export default nextConfig
