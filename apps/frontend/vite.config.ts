import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        TanStackRouterVite({
            routesDirectory: './src/routes',
            generatedRouteTree: './src/routeTree.gen.ts',
        }),
    ],
    publicDir: './public',
    build: {
        outDir: './dist',
        emptyOutDir: true,
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'router': ['@tanstack/react-router'],
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
                    'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
                    'data-vendor': ['@tanstack/react-query', 'zustand', '@supabase/supabase-js'],
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
            '@': path.resolve(__dirname, './src'),
            '~': path.resolve(__dirname, './app')
        }
    },
    server: {
        host: process.env.VITE_HOST || '0.0.0.0',
        port: Number(process.env.VITE_PORT) || 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3002',
                changeOrigin: true
            }
        },
        watch: {
            ignored: [
                '**/.git_disabled/**',
                '**/node_modules/**',
                '**/dist/**'
            ]
        }
    }
})
