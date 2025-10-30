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
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
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
				'src/types/**'
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
			'tests/**',
			'e2e/**',
			'playwright/**'
		],
		testTimeout: 10000,
		hookTimeout: 10000
	}
})
