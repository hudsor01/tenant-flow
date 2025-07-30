/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables from .env.test
  const env = loadEnv(mode, path.resolve(process.cwd(), '../../'), [''])
  
  return {
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,ts}'],
      exclude: [
        'node_modules',
        'dist',
        '.turbo',
        'prisma'
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          'dist/',
          'prisma/',
          'src/main.ts',
          '**/*.config.*'
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
          }
        }
      },
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: env.TEST_DATABASE_URL || env.DATABASE_URL,
        DIRECT_URL: env.TEST_DATABASE_URL || env.DIRECT_URL,
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET,
        JWT_SECRET: env.JWT_SECRET,
        STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
        COOKIE_SECRET: env.COOKIE_SECRET,
        CORS_ORIGINS: env.CORS_ORIGINS,
        FRONTEND_URL: env.FRONTEND_URL
      },
      testTimeout: 30000,
      hookTimeout: 30000
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})