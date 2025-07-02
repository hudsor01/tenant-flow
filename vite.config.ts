import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend/src"),
      "~": path.resolve(__dirname, "./frontend/app"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-avatar',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],
          'form-vendor': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          'animation-vendor': [
            'framer-motion',
            'lucide-react'
          ],
          'data-vendor': [
            '@tanstack/react-query',
            '@supabase/supabase-js'
          ],
          'utility-vendor': [
            'date-fns',
            'clsx',
            'tailwind-merge',
            'class-variance-authority'
          ],
          'chart-vendor': [
            'recharts'
          ],
          'email-vendor': [
            '@react-email/components',
            '@react-email/render',
            'resend'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
