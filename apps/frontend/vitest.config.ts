import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'frontend',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    reporters: ['verbose', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*.stories.{js,ts,jsx,tsx}',
        '**/*.d.ts',
        '.next/',
        'coverage/',
        'public/',
        '*.config.*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        './src/components/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        './src/hooks/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    includeSource: ['src/**/*.{js,ts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '.next/**',
      'public/**'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks', // Better for React 19 compatibility
    poolOptions: {
      forks: {
        singleFork: true, // Prevents React hooks issues in concurrent mode
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@repo/database': path.resolve(__dirname, '../../packages/database/src'),
    },
  },
  define: {
    // Define global test constants
    __TEST__: true,
  },
})