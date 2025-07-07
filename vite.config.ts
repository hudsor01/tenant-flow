import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	publicDir: './frontend/public',
	build: {
		outDir: './frontend/dist',
		emptyOutDir: true,
		cssCodeSplit: true,
		rollupOptions: {
			output: {
				manualChunks: {
					// Keep React and React-DOM together to prevent context issues
					'react-vendor': ['react', 'react-dom'],
					// Router in separate chunk
					'router': ['react-router-dom'],
					// Radix UI components
					'ui-vendor': [
						'@radix-ui/react-dialog',
						'@radix-ui/react-alert-dialog', 
						'@radix-ui/react-popover',
						'@radix-ui/react-dropdown-menu',
						'@radix-ui/react-select',
						'@radix-ui/react-checkbox',
						'@radix-ui/react-tabs',
						'@radix-ui/react-accordion'
					],
					// Form libraries
					'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
					// Data fetching
					'data-vendor': ['@tanstack/react-query', 'zustand', '@supabase/supabase-js'],
					// Utility libraries
					'utility-vendor': [
						'date-fns',
						'clsx', 
						'tailwind-merge',
						'class-variance-authority',
						'lucide-react',
						'framer-motion'
					]
				}
			}
		},
		chunkSizeWarningLimit: 800
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './frontend/src'),
			'~': path.resolve(__dirname, './frontend/app')
		}
	},
	server: {
		host: process.env.VITE_HOST || '0.0.0.0',
		port: Number(process.env.VITE_PORT) || 5173
	}
})
