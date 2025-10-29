import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
	plugins: [react()],
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
	},
	resolve: {
		alias: {
			'#app': path.resolve(__dirname, './src/app'),
			'#components': path.resolve(__dirname, './src/components'),
			'#contexts': path.resolve(__dirname, './src/contexts'),
			'#design-system': path.resolve(__dirname, './src/design-system'),
			'#lib': path.resolve(__dirname, './src/lib'),
			'#hooks': path.resolve(__dirname, './src/hooks'),
			'#stores': path.resolve(__dirname, './src/stores'),
			'#types': path.resolve(__dirname, './src/types'),
			'#providers': path.resolve(__dirname, './src/providers'),
			'#test': path.resolve(__dirname, './src/test')
		}
	}
})
