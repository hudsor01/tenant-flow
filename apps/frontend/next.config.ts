import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	
	// Enable React Compiler for automatic optimization
	experimental: {
		reactCompiler: true,
		// Disable server minification to fix Next.js 15.5.3 build issues
		serverMinification: false,
	},

	// ESLint configuration
	eslint: {
		dirs: ['src'],
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
