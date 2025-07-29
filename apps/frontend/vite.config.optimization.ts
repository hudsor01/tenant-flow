/**
 * Vite Optimization Configuration
 * 
 * Advanced optimization settings for production builds.
 * This configuration extends the base Vite config with performance-focused settings.
 */

import type { BuildOptions } from 'vite'

export const optimizationConfig: BuildOptions = {
  // Aggressive code splitting
  rollupOptions: {
    output: {
      // More granular chunk splitting
      manualChunks: (id) => {
        // Core React ecosystem
        if (id.includes('react/') || id.includes('react-dom/')) {
          return 'react-core'
        }
        if (id.includes('react-hook-form') || id.includes('@hookform')) {
          return 'react-forms'
        }
        if (id.includes('react-error-boundary') || id.includes('react-dropzone')) {
          return 'react-utils'
        }

        // Routing
        if (id.includes('@tanstack/react-router')) {
          return 'router'
        }

        // Data management
        if (id.includes('@tanstack/react-query')) {
          return 'react-query'
        }
        if (id.includes('zustand')) {
          return 'state'
        }
        if (id.includes('@supabase')) {
          return 'supabase'
        }

        // UI Components
        if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-popover')) {
          return 'radix-overlays'
        }
        if (id.includes('@radix-ui/react-form') || id.includes('@radix-ui/react-select')) {
          return 'radix-forms'
        }
        if (id.includes('@radix-ui')) {
          return 'radix-core'
        }
        if (id.includes('lucide-react')) {
          return 'icons'
        }

        // Validation & Utilities
        if (id.includes('zod')) {
          return 'validation'
        }
        if (id.includes('date-fns')) {
          return 'date-utils'
        }
        if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
          return 'styling-utils'
        }

        // Animation
        if (id.includes('framer-motion')) {
          return 'animation'
        }

        // Charts and Data Visualization
        if (id.includes('recharts')) {
          return 'charts'
        }

        // File handling
        if (id.includes('jspdf') || id.includes('jszip') || id.includes('docx')) {
          return 'file-utils'
        }

        // Payment processing
        if (id.includes('@stripe')) {
          return 'stripe'
        }

        // Analytics
        if (id.includes('@vercel/analytics') || id.includes('posthog')) {
          return 'analytics'
        }

        // Large dependencies
        if (id.includes('dompurify') || id.includes('embla-carousel')) {
          return 'misc-large'
        }

        // General vendor code
        if (id.includes('node_modules')) {
          return 'vendor'
        }
      },

      // Optimize asset organization
      assetFileNames: (assetInfo) => {
        const info = assetInfo.name.split('.')
        let extType = info[info.length - 1]
        
        // Categorize by file type
        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
          extType = 'images'
        } else if (/woff2?|eot|ttf|otf/i.test(extType)) {
          extType = 'fonts'
        } else if (/css/i.test(extType)) {
          extType = 'styles'
        } else if (/json/i.test(extType)) {
          extType = 'data'
        }
        
        return `assets/${extType}/[name]-[hash][extname]`
      },
      
      chunkFileNames: 'js/[name]-[hash].js',
      entryFileNames: 'js/[name]-[hash].js',
    },

    // External dependencies (don't bundle these)
    external: (id) => {
      return (
        id.includes('node:') ||
        id.startsWith('@supabase/node-fetch') ||
        id.startsWith('fsevents')
      )
    },
  },

  // More aggressive minification
  terserOptions: {
    compress: {
      arguments: true,
      drop_console: true,
      drop_debugger: true,
      pure_funcs: [
        'console.log',
        'console.info',
        'console.debug',
        'console.trace',
      ],
      passes: 2,
    },
    mangle: {
      safari10: true,
    },
    format: {
      comments: false,
      safari10: true,
    },
  },

  // Optimize CSS
  cssMinify: 'lightningcss',
  
  // Target modern browsers for better tree-shaking
  target: [
    'es2022',
    'edge79',
    'firefox67', 
    'chrome64',
    'safari12'
  ],

  // More aggressive module preservation
  moduleularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
      preventFullImport: true,
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
      preventFullImport: true,
    },
  },

  // Increase chunk size warning for better analysis
  chunkSizeWarningLimit: 500,
  
  // Smaller inline threshold to encourage HTTP/2 multiplexing
  assetsInlineLimit: 4096,
}

export default optimizationConfig