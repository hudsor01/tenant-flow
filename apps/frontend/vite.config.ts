import { defineConfig, Plugin, loadEnv, type UserConfig, type ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react'
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
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: true,
			routesDirectory: './src/routes',
			generatedRouteTree: './src/routeTree.gen.ts',
			quoteStyle: 'single',
		}),
		react(),
		tailwindcss(),
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
				// CRITICAL: Main bundle MUST load first - no preloading of React-dependent chunks
				if (filename.includes('index')) {
					// Only preload non-React chunks after main bundle is guaranteed to load
					return deps.filter(dep => 
						!dep.includes('react') && // Never preload React stuff
						!dep.includes('ui-system') && // UI needs React.Children
						(dep.includes('analytics') || dep.includes('utilities')) // Only safe chunks
					)
				}
				// For other files, be conservative about preloading
				return deps.filter(dep => 
					!dep.includes('react') && 
					!dep.includes('ui-system') &&
					!dep.includes('components')
				)
			}
		},
		cssMinify: isProd ? 'esbuild' : false,
		assetsInlineLimit: 4096,
		rollupOptions: {
			output: {
				// SIMPLIFIED: Let Vite handle chunking automatically to prevent race conditions
				manualChunks: undefined,
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
		dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@tanstack/react-query'],
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
			'@supabase/ssr', // Pre-bundle with React to avoid initialization issues
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
