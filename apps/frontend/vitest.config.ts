import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const loadEnvFile = (fileName: string) => {
  const path = resolve(__dirname, fileName)
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) continue
      const key = trimmed.slice(0, equalsIndex)
      const value = trimmed.slice(equalsIndex + 1)
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  } catch {
    // Missing env file is acceptable; other mechanisms may provide values
  }
}

loadEnvFile('.env.test')

export default defineConfig({
  plugins: [
    tsconfigPaths({
      ignoreConfigErrors: true
    }),
    react()
  ],
  test: {
    name: 'frontend',
    environment: 'jsdom',
    watch: process.env.CI ? false : undefined,
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        singleThread: true
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/generated/**',
        '**/__mocks__/**',
        'src/types/**',
        'tests/**' // Exclude integration tests from coverage
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      '__tests__/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'out',
      'build',
      'coverage',
      'tests/**', // Exclude integration tests from unit test runs
      'e2e/**',
      'playwright/**',
      'tests/tanstack/tanstack-test-results/**' // Exclude test result HTML files
    ],
    testTimeout: 10000,
    hookTimeout: 10000
  }
})
