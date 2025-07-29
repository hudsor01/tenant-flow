import { defineConfig, Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { splitVendorChunkPlugin } from 'vite'

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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = command === 'build'
  
  return {
	plugins: [
		removeUseClient(),
		react({
			// Enable React DevTools in development
			devTarget: 'esnext',
			// Optimize JSX for production
			jsxImportSource: isProd ? '@emotion/react' : undefined,
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
		// Vendor chunk splitting
		splitVendorChunkPlugin(),
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
			// Optimize external dependencies
			external: (id) => {
				// Don't bundle Node.js polyfills
				return id.includes('node:')
			},
			output: {
				// Advanced code splitting strategy
				manualChunks: (id) => {
					// React ecosystem
					if (id.includes('react') || id.includes('react-dom')) {
						return 'react-vendor'
					}
					
					// Router
					if (id.includes('@tanstack/react-router')) {
						return 'router'
					}
					
					// UI Libraries
					if (id.includes('@radix-ui') || id.includes('lucide-react')) {
						return 'ui-vendor'
					}
					
					// Forms
					if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
						return 'form-vendor'
					}
					
					// Data fetching
					if (id.includes('@tanstack/react-query') || id.includes('@supabase') || id.includes('zustand')) {
						return 'data-vendor'
					}
					
					// Utilities
					if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || 
					    id.includes('class-variance-authority') || id.includes('framer-motion')) {
						return 'utility-vendor'
					}
					
					// Stripe
					if (id.includes('@stripe')) {
						return 'stripe-vendor'
					}
					
					// Large node_modules
					if (id.includes('node_modules')) {
						return 'vendor'
					}
				},
				// Optimized file naming for better caching
				assetFileNames: (assetInfo) => {
					const info = assetInfo.name.split('.')
					let extType = info[info.length - 1]
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
		// Better module federation
		moduleularizeImports: {
			lodash: {
				transform: 'lodash/{{member}}',
				preventFullImport: true,
			},
			'date-fns': {
				transform: 'date-fns/{{member}}',
				preventFullImport: true,
			},
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
				configure: (proxy, _options) => {
					proxy.on('error', (err, _req, _res) => {
						console.log('proxy error', err);
					});
					proxy.on('proxyReq', (proxyReq, req, _res) => {
						console.log('Sending Request to the Target:', req.method, req.url);
					});
					proxy.on('proxyRes', (proxyRes, req, _res) => {
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
		...(env.VITE_HTTPS === 'true' && {
			https: true,
		}),
		// Enable warm-up for faster initial loads
		warmup: {
			clientFiles: ['./src/main.tsx', './src/App.tsx'],
		},
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
