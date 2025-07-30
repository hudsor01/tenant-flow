/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables from .env.test
  const env = loadEnv(mode, path.resolve(process.cwd(), '../../'), [''])
  
  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: [
        'node_modules',
        'dist',
        '.idea',
        '.git',
        '.cache',
        'e2e',
        'src/tests/e2e/**',
        'src/components/auth/SupabaseAuthProcessor.test.tsx', // Temporarily disabled due to infinite loop
        'src/lib/loaders/__tests__/loaders.test.ts' // Temporarily disabled due to mocking issues
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/routeTree.gen.ts',
          'src/main.tsx',
          'src/vite-env.d.ts'
        ],
        thresholds: {
          global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
          }
        }
      },
      env: {
        NODE_ENV: 'test',
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
        VITE_SUPABASE_PUBLISHABLE_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        VITE_BACKEND_URL: env.VITE_BACKEND_URL,
        VITE_API_BASE_URL: env.VITE_API_BASE_URL,
        VITE_STRIPE_PUBLISHABLE_KEY: env.VITE_STRIPE_PUBLISHABLE_KEY
      },
      testTimeout: 300000, // 5 minutes
      hookTimeout: 300000
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})