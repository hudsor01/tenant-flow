import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

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
		// Prevent watch mode in CI/pre-commit hooks
		watch: process.env.CI ? false : undefined,
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		// Use vmThreads pool with singleThread to prevent "Timeout starting forks runner" errors
		// The default forks pool was causing timeout issues during test initialization
		// vmThreads provides better stability for React component tests with jsdom environment
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
			// Integration tests in tests/ directory are excluded by default
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
			'playwright/**'
		],
		testTimeout: 10000,
		hookTimeout: 10000
	}
})
