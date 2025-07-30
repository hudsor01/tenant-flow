/**
 * Production-Optimized Vite Configuration
 * 
 * Advanced performance optimizations for production deployment
 * Includes aggressive code splitting, caching, and Core Web Vitals optimization
 */

import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { splitVendorChunkPlugin } from 'vite'

// Production-specific optimization plugin
function productionOptimizations(): Plugin {
  return {
    name: 'production-optimizations',
    apply: 'build',
    generateBundle(options, bundle) {
      // Analyze bundle size and warn about large chunks
      Object.entries(bundle).forEach(([fileName, chunk]) => {
        if (chunk.type === 'chunk' && chunk.code) {
          const size = Buffer.byteLength(chunk.code, 'utf8')
          const sizeKB = Math.round(size / 1024)
          
          if (sizeKB > 300) {
            console.warn(`⚠️  Large chunk detected: ${fileName} (${sizeKB}KB)`)
          }
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [
    // React with SWC for faster builds
    react({
      devTarget: 'esnext',
      // Production optimizations
      jsxImportSource: undefined,
      plugins: [
        // React Compiler (if available) for automatic optimizations
        ['@babel/plugin-transform-react-pure-annotations', {}]
      ]
    }),
    
    tailwindcss(),
    
    // Router with optimizations
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      quoteStyle: 'single',
      // Production route optimization
      experimental: {
        enableRouteGeneration: true
      }
    }),
    
    // Advanced vendor chunk splitting
    splitVendorChunkPlugin(),
    
    // Production-specific optimizations
    productionOptimizations(),
    
    // Bundle analyzer
    visualizer({
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // Better visualization
    })
  ],

  build: {
    target: ['es2022', 'edge79', 'firefox67', 'chrome64', 'safari12'],
    outDir: './dist',
    emptyOutDir: true,
    
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    
    // Advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        arguments: true,
        dead_code: true,
        drop_console: true,
        drop_debugger: true,
        passes: 3,                    // Multiple optimization passes
        pure_funcs: [
          'console.log',
          'console.info', 
          'console.debug',
          'console.trace',
          'console.time',
          'console.timeEnd'
        ],
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true
      },
      mangle: {
        properties: {
          regex: /^_/  // Mangle private properties
        }
      },
      format: {
        comments: false,
        safari10: true
      }
    },

    rollupOptions: {
      // Optimize external dependencies  
      external: (id) => {
        return id.includes('node:') || 
               id.startsWith('@supabase/node-fetch') ||
               id.startsWith('fsevents')
      },

      output: {
        // Advanced chunking strategy for optimal caching
        manualChunks: (id) => {
          // Core React ecosystem (changes rarely)
          if (id.includes('react/') || id.includes('react-dom/')) {
            return 'react-core'
          }
          
          // React utilities (moderate change frequency)
          if (id.includes('react-hook-form') || 
              id.includes('@hookform') ||
              id.includes('react-error-boundary') ||
              id.includes('react-dropzone')) {
            return 'react-utils'
          }

          // Routing (changes with route updates)
          if (id.includes('@tanstack/react-router')) {
            return 'router'
          }

          // State management (changes with app logic)
          if (id.includes('@tanstack/react-query')) {
            return 'react-query'
          }
          if (id.includes('zustand')) {
            return 'state-management'
          }

          // Authentication & Backend (changes with API updates)
          if (id.includes('@supabase')) {
            return 'supabase'
          }

          // UI Components - split by usage pattern
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-popover') ||
              id.includes('@radix-ui/react-dropdown-menu')) {
            return 'ui-overlays'  // Loaded on interaction
          }
          
          if (id.includes('@radix-ui/react-form') || 
              id.includes('@radix-ui/react-select') ||
              id.includes('@radix-ui/react-checkbox')) {
            return 'ui-forms'     // Loaded on form pages
          }
          
          if (id.includes('@radix-ui')) {
            return 'ui-core'      // Base UI components
          }

          // Icons (rarely changes)
          if (id.includes('lucide-react')) {
            return 'icons'
          }

          // Validation (changes with business logic)  
          if (id.includes('zod') || id.includes('@hookform/resolvers')) {
            return 'validation'
          }

          // Utilities (rarely changes)
          if (id.includes('date-fns')) {
            return 'date-utils'
          }
          if (id.includes('clsx') || 
              id.includes('tailwind-merge') || 
              id.includes('class-variance-authority')) {
            return 'styling-utils'
          }

          // Animation (loaded on interaction)
          if (id.includes('framer-motion')) {
            return 'animation'
          }

          // Charts (loaded on dashboard/reports)
          if (id.includes('recharts')) {
            return 'charts'
          }

          // File processing (loaded on document features)
          if (id.includes('jspdf') || 
              id.includes('jszip') || 
              id.includes('docx')) {
            return 'file-processing'
          }

          // Payment processing (loaded on billing)
          if (id.includes('@stripe')) {
            return 'payments'
          }

          // Analytics (loaded asynchronously)
          if (id.includes('@vercel/analytics') || 
              id.includes('posthog') ||
              id.includes('@vercel/speed-insights')) {
            return 'analytics'
          }

          // Large miscellaneous dependencies
          if (id.includes('dompurify') || 
              id.includes('embla-carousel')) {
            return 'misc-large'
          }

          // General vendor code (fallback)
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },

        // Optimized asset organization with cache headers
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          let extType = info[info.length - 1]
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'images'
          } else if (/woff2?|eot|ttf|otf/i.test(extType)) {
            extType = 'fonts'
          } else if (/css/i.test(extType)) {
            extType = 'styles'
          }
          
          return `assets/${extType}/[name]-[hash][extname]`
        },
        
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          
          // Critical chunks get priority loading hint
          if (['react-core', 'router', 'ui-core'].includes(name)) {
            return `js/critical/[name]-[hash].js`
          }
          
          // Feature chunks are organized by functionality
          if (['payments', 'charts', 'file-processing'].includes(name)) {
            return `js/features/[name]-[hash].js`
          }
          
          return `js/[name]-[hash].js`
        },
        
        entryFileNames: 'js/main-[hash].js'
      }
    },

    // Performance thresholds
    chunkSizeWarningLimit: 400,      // Warn at 400KB chunks
    assetsInlineLimit: 4096,         // Inline assets < 4KB
    
    // Source maps for production debugging
    sourcemap: 'hidden',             // Generate but don't expose
    
    // Report bundle size
    reportCompressedSize: true,
    
    // Write bundle report
    write: true
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@stores': resolve(__dirname, './src/stores'),
      '@utils': resolve(__dirname, './src/lib/utils'),
      '@api': resolve(__dirname, './src/lib/api'),
      '@types': resolve(__dirname, './src/types')
    },
    // Aggressive deduplication
    dedupe: [
      'react', 
      'react-dom', 
      '@tanstack/react-query',
      '@tanstack/react-router',
      'zod',
      'clsx'
    ]
  },

  // Production optimizations
  optimizeDeps: {
    include: [
      // Pre-bundle critical dependencies
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@tanstack/react-router',
      '@supabase/supabase-js',
      'zustand'
    ],
    exclude: [
      // Exclude from pre-bundling to avoid duplication
      '@stripe/stripe-js',  // Loaded via CDN
      'posthog-js'          // Loaded asynchronously
    ]
  },

  // Environment-specific defines
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'),
    
    // Feature flags for production
    __DEVELOPMENT__: false,
    __PRODUCTION__: true,
    __ENABLE_ANALYTICS__: true,
    __ENABLE_ERROR_TRACKING__: true
  }
})