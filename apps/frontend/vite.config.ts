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
  
  return {
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
		// Modern target for better tree-shaking
		target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
		minify: isProd ? 'terser' : false,
		sourcemap: !isProd,
		// Terser options for better compression
		terserOptions: {
			compress: {
				drop_console: isProd,
				drop_debugger: isProd,
				pure_funcs: isProd ? ['console.log', 'console.info'] : [],
			},
			format: {
				comments: false,
			},
		},
		rollupOptions: {
			output: {
				// Manual chunk splitting for optimal caching
				manualChunks: {
					// Core vendor bundle
					vendor: [
						'react',
						'react-dom',
						'react-error-boundary',
					],
					// Router and state management
					router: [
						'@tanstack/react-router',
						'@tanstack/react-query',
						'zustand',
					],
					// UI components library
					ui: [
						'@radix-ui/react-dialog',
						'@radix-ui/react-dropdown-menu',
						'@radix-ui/react-select',
						'@radix-ui/react-tabs',
						'@radix-ui/react-tooltip',
						'@radix-ui/react-switch',
						'@radix-ui/themes',
						'class-variance-authority',
						'clsx',
						'tailwind-merge',
						'lucide-react',
						'sonner',
						'cmdk',
					],
					// Form handling
					forms: [
						'react-hook-form',
						'@hookform/resolvers',
						'zod',
					],
					// Authentication and API
					auth: [
						'@supabase/supabase-js',
						'@supabase/ssr',
						'axios',
					],
					// Stripe
					stripe: [
						'@stripe/stripe-js',
						'@stripe/react-stripe-js',
					],
					// Charts and data visualization
					charts: [
						'recharts',
						'date-fns',
					],
					// Large utilities
					utils: [
						'dompurify',
						'jspdf',
						'docx',
						'jszip',
					],
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
		// More aggressive chunk size limits
		chunkSizeWarningLimit: 600,
		// Enable modern builds
		cssMinify: isProd,
		// Larger inline limit for small assets
		assetsInlineLimit: 8192,
		// TODO: Better module federation (requires plugin)
		// moduleularizeImports: {
		// 	lodash: {
		// 		transform: 'lodash/{{member}}',
		// 		preventFullImport: true,
		// 	},
		// 	'date-fns': {
		// 		transform: 'date-fns/{{member}}',
		// 		preventFullImport: true,
		// 	},
		// },
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
	},
	server: {
		host: env.VITE_HOST || '0.0.0.0',
		port: Number(env.VITE_PORT) || 5173,
		proxy: {
			'/api': {
				target: env.VITE_API_BASE_URL || 'https://tenantflow.app',
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
			// Remove console.log in production
			drop: isProd ? ['console', 'debugger'] : [],
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
})
