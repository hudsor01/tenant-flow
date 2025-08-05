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
		react(),
		tailwindcss(),
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: true,
			routesDirectory: './src/routes',
			generatedRouteTree: './src/routeTree.gen.ts',
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
		target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
		minify: isProd ? 'esbuild' : false,
		sourcemap: false,
		chunkSizeWarningLimit: 500,
		modulePreload: {
			polyfill: false,
			resolveDependencies: (filename, deps) => {
				if (filename.includes('index')) {
					return deps.filter(dep => 
						dep.includes('react-vendor') || 
						dep.includes('router-vendor') ||
						dep.includes('ui-vendor')
					)
				}
				return deps
			}
		},
		cssMinify: isProd ? 'esbuild' : false,
		assetsInlineLimit: 4096,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						// CRITICAL: Keep React ecosystem in main bundle for proper initialization
						if (id.includes('react') || 
							id.includes('react-dom') ||
							id.includes('scheduler') ||
							id.includes('react-jsx-runtime')) {
							return undefined
						}
						
						// Core framework chunks - load first after React
						if (id.includes('@tanstack/react-router')) {
							return 'react-router'
						}
						
						if (id.includes('@tanstack/react-query')) {
							return 'react-query'
						}
						
						// State management - separate chunk  
						if (id.includes('zustand')) {
							return 'state-management'
						}
						
						// UI system - critical path
						if (id.includes('@radix-ui') || 
							id.includes('class-variance-authority') ||
							id.includes('clsx') ||
							id.includes('tailwind-merge')) {
							return 'ui-system'
						}
						
						// Icons and visual - separate
						if (id.includes('lucide-react') ||
							id.includes('framer-motion')) {
							return 'ui-visual'
						}
						
						// Forms - only when needed
						if (id.includes('react-hook-form') || 
							id.includes('@hookform/resolvers') ||
							id.includes('zod')) {
							return 'forms'
						}
						
						// Auth services - critical for authenticated routes
						if (id.includes('@supabase') || 
							id.includes('axios')) {
							return 'services'
						}
						
						// Analytics - defer completely
						if (id.includes('@vercel/analytics') || 
							id.includes('@vercel/speed-insights') ||
							id.includes('posthog')) {
							return 'analytics'
						}
						
						// Heavy utilities - lazy load
						if (id.includes('recharts') || 
							id.includes('date-fns') ||
							id.includes('dompurify') ||
							id.includes('jspdf') ||
							id.includes('docx') ||
							id.includes('jszip')) {
							return 'utilities'
						}
						
						// Stripe - separate for security
						if (id.includes('@stripe')) {
							return 'stripe'
						}
						
						// Everything else
						return 'vendor'
					}
					
					// Lighter application code chunking - keep core in main bundle
					if (id.includes('src/main.tsx') || 
						id.includes('src/router.tsx') ||
						id.includes('src/providers/')) {
						return undefined // Keep initialization code in main bundle
					}
					
					if (id.includes('src/routes')) {
						// Simplified route chunking
						if (id.includes('_authenticated') || id.includes('/dashboard')) return 'app-routes'
						if (id.includes('_tenant-portal')) return 'tenant-routes'
						if (id.includes('auth/')) return 'auth-routes'
						return 'public-routes' // Landing page, pricing, etc.
					}
					
					if (id.includes('src/components')) {
						// Core UI components stay in main, complex ones split
						if (id.includes('ui/') && 
							(id.includes('button') || id.includes('input') || id.includes('card'))) {
							return undefined // Keep basic UI in main bundle
						}
						if (id.includes('modals/')) return 'modals'
						if (id.includes('error/')) return undefined // Keep error handling in main
						return 'components'
					}
					
					// Keep critical app logic in main bundle
					if (id.includes('src/hooks/useAuth') || 
						id.includes('src/hooks/useMe') ||
						id.includes('src/stores/auth')) {
						return undefined
					}
					
					if (id.includes('src/hooks') || id.includes('src/stores')) {
						return 'app-logic'
					}
					
					if (id.includes('src/lib')) {
						// Keep critical utils in main bundle
						if (id.includes('utils.ts') || 
							id.includes('router-') ||
							id.includes('clients')) {
							return undefined
						}
						return 'app-utils'
					}
					
					// Everything else in main bundle for simplicity
					return undefined
				},
				// Optimized file naming for better edge caching
				assetFileNames: (assetInfo) => {
					if (!assetInfo.name) {
						return 'static/assets/[name]-[hash:8][extname]'
					}
					const info = assetInfo.name.split('.')
					let extType = info[info.length - 1] || 'unknown'
					if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
						extType = 'img'
					} else if (/woff2?|eot|ttf|otf/i.test(extType)) {
						extType = 'fonts'
					} else if (/css/i.test(extType)) {
						extType = 'css'
					}
					return `static/${extType}/[name]-[hash:8][extname]`
				},
				chunkFileNames: (chunkInfo) => {
					// Organize chunks by priority for better CDN caching
					if (chunkInfo.name?.includes('vendor')) {
						return 'static/vendor/[name]-[hash:8].js'
					}
					if (chunkInfo.name?.includes('routes')) {
						return 'static/routes/[name]-[hash:8].js'
					}
					return 'static/js/[name]-[hash:8].js'
				},
				entryFileNames: 'static/js/[name]-[hash:8].js',
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
		dedupe: ['react', 'react-dom', '@tanstack/react-query'],
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
			usePolling: false,
			interval: 100,
		},
		https: env.VITE_HTTPS === 'true' ? {} : undefined,
		hmr: {
			overlay: true,
		},
	},
	optimizeDeps: {
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
		exclude: ['@stripe/stripe-js'],
		esbuildOptions: {
			target: 'esnext',
			drop: isProd ? ['console', 'debugger'] : [],
			keepNames: true,
		},
	},
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
	},
	preview: {
		port: Number(env.VITE_PREVIEW_PORT) || 4173,
		host: env.VITE_HOST || '0.0.0.0',
	}
  }
  
  return config
})
