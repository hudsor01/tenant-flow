/**
 * Vitest Configuration for Production Tests
 * Optimized for testing production functionality and API integration
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'production-tests',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup/production-test-setup.ts'],
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 15000, // 15 seconds for setup/teardown
    include: [
      'src/app/(public)/__tests__/**/*.test.{ts,tsx}',
      'src/app/(dashboard)/**/__tests__/**/*.test.{ts,tsx}',
      'src/__tests__/integration/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'src/__tests__/unit/**', // Exclude unit tests from production suite
      'src/__tests__/mocks/**'
    ],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/production',
      include: [
        'src/app/(public)/**/*.{ts,tsx}',
        'src/app/(dashboard)/**/*.{ts,tsx}',
        'src/components/landing/**/*.{ts,tsx}',
        'src/components/dashboard/**/*.{ts,tsx}'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/__tests__/**',
        'src/**/*.d.ts',
        'src/**/*.config.{ts,js}',
        'node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 70,
          statements: 70
        }
      }
    },
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/production-results.json',
      html: './test-results/production-results.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@repo/database': path.resolve(__dirname, '../../packages/database/src')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_ENV': '"test"'
  }
})