import { defineConfig, Plugin, loadEnv, type UserConfig, type ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { visualizer } from 'rollup-plugin-visualizer'

function removeUseClient(): Plugin {
	return {
		name: 'remove-use-client',
		enforce: 'pre',
		transform(code, id) {
			if (id.includes('node_modules')) {
				return null
			}
			if (!id.match(/\.(js|jsx|ts|tsx)$/)) {
				return null
			}
			const newCode = code.replace(/^['"]use client['"][\s;]*/m, '')
			if (newCode !== code) {
				return {
					code: newCode,
					map: null
				}
			}
			return null
		}
	}
}

export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = command === 'build'
  
  const config: UserConfig = {
	plugins: [
		removeUseClient(),
		react({
			// Enable React DevTools in development
			devTarget: 'esnext',
		}),
		tailwindcss(),
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: true,
			routesDirectory: './src/routes',
			generatedRouteTree: './src/routeTree.gen.ts',
			// Enable tree-shaking for router
			quoteStyle: 'single',
		}),
		// Note: splitVendorChunkPlugin is handled via manual chunks below
		// Bundle analyzer for development
		...(mode === 'analyze' ? [visualizer({
			filename: 'dist/stats.html',
			open: true,
			gzipSize: true,
			brotliSize: true,
		})] : []),
	],
	publicDir: './public',
	build: {
		outDir: './dist',
		emptyOutDir: true,
		cssCodeSplit: true,
		// Modern target for better tree-shaking and smaller bundles
		target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
		minify: isProd ? 'esbuild' : false,
		sourcemap: false,
		// Optimize chunk sizes for better loading performance
		chunkSizeWarningLimit: 500,
		// Enable preload module directive for better performance
		modulePreload: {
			polyfill: false
		},
		// Enable CSS minification
		cssMinify: isProd ? 'esbuild' : false,
		// Optimize asset inlining threshold
		assetsInlineLimit: 2048,
		rollupOptions: {
			// Don't mark any dependencies as external for browser build
			// external: [],
			output: {
				// Manual chunk splitting for optimal caching and performance
				manualChunks: (id) => {
					// Node modules chunking strategy
					if (id.includes('node_modules')) {
						// Critical path chunks - highest priority
						if (id.includes('react') || id.includes('react-dom')) {
							return 'react-vendor'
						}
						
						// Router and state - needed early but separate from react
						if (id.includes('@tanstack/react-router') || 
							id.includes('@tanstack/react-query') || 
							id.includes('zustand')) {
							return 'router-vendor'
						}
						
						// Core UI components - loaded with first UI render
						if (id.includes('@radix-ui') || 
							id.includes('class-variance-authority') ||
							id.includes('clsx') ||
							id.includes('tailwind-merge') ||
							id.includes('lucide-react')) {
							return 'ui-vendor'
						}
						
						// Form libraries - only loaded when needed
						if (id.includes('react-hook-form') || 
							id.includes('@hookform/resolvers') ||
							id.includes('zod')) {
							return 'forms-vendor'
						}
						
						// Auth and API - loaded on authenticated routes
						if (id.includes('@supabase') || 
							id.includes('axios')) {
							return 'auth-vendor'
						}
						
						// Analytics and monitoring - defer load
						if (id.includes('@vercel/analytics') || 
							id.includes('@vercel/speed-insights') ||
							id.includes('posthog')) {
							return 'analytics-vendor'
						}
						
						// Large utilities - lazy loaded
						if (id.includes('recharts') || 
							id.includes('date-fns') ||
							id.includes('dompurify') ||
							id.includes('jspdf') ||
							id.includes('docx') ||
							id.includes('jszip')) {
							return 'utils-vendor'
						}
						
						// Everything else in a shared vendor chunk
						return 'vendor'
					}
					
					// Application code chunking
					if (id.includes('src/routes')) {
						// Route-based code splitting
						if (id.includes('_authenticated')) return 'authenticated-routes'
						if (id.includes('_public')) return 'public-routes'
						if (id.includes('_tenant-portal')) return 'tenant-routes'
						if (id.includes('auth')) return 'auth-routes'
						return 'routes'
					}
					
					if (id.includes('src/components')) {
						// Component chunking by feature
						if (id.includes('ui/')) return 'ui-components'
						if (id.includes('modals/')) return 'modal-components'
						if (id.includes('error/')) return 'error-components'
						return 'components'
					}
					
					if (id.includes('src/hooks') || id.includes('src/stores')) {
						return 'app-state'
					}
					
					if (id.includes('src/lib')) {
						return 'app-utils'
					}
					
					// Default fallback
					return undefined
				},
				// Optimized file naming for better caching
				assetFileNames: (assetInfo) => {
					if (!assetInfo.name) {
						return 'static/assets/[name]-[hash][extname]'
					}
					const info = assetInfo.name.split('.')
					let extType = info[info.length - 1] || 'unknown'
					if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
						extType = 'img'
					} else if (/woff2?|eot|ttf|otf/i.test(extType)) {
						extType = 'fonts'
					}
					return `static/${extType}/[name]-[hash][extname]`
				},
				chunkFileNames: 'static/js/[name]-[hash].js',
				entryFileNames: 'static/js/[name]-[hash].js',
			}
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@components': resolve(__dirname, './src/components'),
			'@hooks': resolve(__dirname, './src/hooks'),
			'@stores': resolve(__dirname, './src/stores'),
			'@utils': resolve(__dirname, './src/lib/utils'),
			'@api': resolve(__dirname, './src/lib/api'),
			'@types': resolve(__dirname, './src/types'),
		},
		// Dedupe packages to reduce bundle size
		dedupe: ['react', 'react-dom', '@tanstack/react-query'],
		// Preserve React for dynamic access
		preserveSymlinks: false,
	},
	server: {
		host: env.VITE_HOST || '0.0.0.0',
		port: Number(env.VITE_PORT) || 5173,
		proxy: {
			'/api': {
				target: env.VITE_API_BASE_URL || 'https://api.tenantflow.app',
				changeOrigin: true,
				secure: isProd,
				ws: true,
				// Add request/response logging in development
				configure: (proxy) => {
					proxy.on('error', (err) => {
						console.log('proxy error', err);
					});
					proxy.on('proxyReq', (_, req) => {
						console.log('Sending Request to the Target:', req.method, req.url);
					});
					proxy.on('proxyRes', (proxyRes, req) => {
						console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
					});
				},
			}
		},
		watch: {
			ignored: ['**/.git_disabled/**', '**/node_modules/**', '**/dist/**'],
			// Performance optimizations
			usePolling: false,
			interval: 100,
		},
		// Enable HTTPS in development if needed
		https: env.VITE_HTTPS === 'true' ? {} : undefined,
		// HMR options
		hmr: {
			overlay: true,
		},
	},
	// Performance optimizations
	optimizeDeps: {
		// Include dependencies that should be pre-bundled
		include: [
			'react',
			'react-dom',
			'@tanstack/react-query',
			'@tanstack/react-router',
			'@supabase/supabase-js',
			'zustand',
			'react-hook-form',
			'zod',
			'date-fns',
			'lucide-react',
			'clsx',
			'tailwind-merge',
			'class-variance-authority',
		],
		// Exclude large dependencies from pre-bundling
		exclude: ['@stripe/stripe-js'],
		// ESBuild options
		esbuildOptions: {
			target: 'esnext',
			// Remove console.log in production but preserve React structure
			drop: isProd ? ['console', 'debugger'] : [],
			// Ensure React is not tree-shaken
			keepNames: true,
		},
	},
	// Define environment variables with types
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
	},
	// Preview server configuration
	preview: {
		port: Number(env.VITE_PREVIEW_PORT) || 4173,
		host: env.VITE_HOST || '0.0.0.0',
	}
  }
  
  return config
})
