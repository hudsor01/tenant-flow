import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './frontend/src'),
			'~': path.resolve(__dirname, './frontend/app')
		}
	},
	server: {
		host: process.env.VITE_HOST || '0.0.0.0',
		port: Number(process.env.VITE_PORT) || 5173
	},
build: {
cssCodeSplit: true,
rollupOptions: {
output: {
manualChunks: (id) => {
// Core React framework - highest priority, cache longest
if (id.includes('react') && !id.includes('react-router') && !id.includes('react-hook-form') && !id.includes('react-email')) {
return 'react-core'
}

// Router - separate from React core for route-based loading
if (id.includes('react-router-dom')) {
return 'react-router'
}

// Radix UI components - split into logical groups by frequency of use
if (id.includes('@radix-ui/react-dialog') || 
    id.includes('@radix-ui/react-alert-dialog') || 
    id.includes('@radix-ui/react-popover') ||
    id.includes('@radix-ui/react-dropdown-menu')) {
  return 'radix-overlays'
}

if (id.includes('@radix-ui/react-select') || 
    id.includes('@radix-ui/react-checkbox') || 
    id.includes('@radix-ui/react-radio-group') ||
    id.includes('@radix-ui/react-switch') ||
    id.includes('@radix-ui/react-slider')) {
  return 'radix-forms'
}

if (id.includes('@radix-ui/react-tabs') ||
    id.includes('@radix-ui/react-accordion') ||
    id.includes('@radix-ui/react-collapsible') ||
    id.includes('@radix-ui/react-navigation-menu')) {
  return 'radix-navigation'
}

if (id.includes('@radix-ui/')) {
  return 'radix-misc'
}

// Form handling
if (id.includes('react-hook-form') || id.includes('@hookform/resolvers')) {
  return 'forms'
}

// Validation and utilities
if (id.includes('zod')) {
  return 'validation'
}

// Animation and icons - often loaded together
if (id.includes('framer-motion') || id.includes('lucide-react')) {
  return 'animations'
}

// Data fetching and state management
if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
  return 'state-management'
}

// Authentication and database
if (id.includes('@supabase/') || id.includes('posthog-js')) {
  return 'backend-services'
}

// Payment processing
if (id.includes('@stripe/')) {
  return 'stripe'
}

// Charts and data visualization
if (id.includes('recharts')) {
  return 'charts'
}

// Email functionality
if (id.includes('@react-email/') || id.includes('resend') || id.includes('react-email')) {
  return 'email'
}

// File handling and documents
if (id.includes('react-dropzone') || id.includes('jspdf') || id.includes('docx') || id.includes('jszip')) {
  return 'file-processing'
}

// Utility libraries
if (id.includes('date-fns') || 
    id.includes('clsx') || 
    id.includes('tailwind-merge') || 
    id.includes('class-variance-authority') ||
    id.includes('ahooks') ||
    id.includes('cmdk') ||
    id.includes('sonner') ||
    id.includes('vaul')) {
  return 'utilities'
}

// Analytics and tracking
if (id.includes('@vercel/analytics') || id.includes('@vercel/speed-insights') || id.includes('react-facebook-pixel')) {
  return 'analytics'
}

// UI components and interactions
if (id.includes('embla-carousel') || 
    id.includes('react-day-picker') ||
    id.includes('react-resizable-panels') ||
    id.includes('input-otp')) {
  return 'ui-components'
}

// Node modules that don't fit above categories
if (id.includes('node_modules')) {
  return 'vendor'
}
}
}
},
chunkSizeWarningLimit: 800
}
})
