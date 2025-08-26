import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	test: {
		name: 'frontend-vitest',
		environment: 'jsdom',
		setupFiles: [
			'@repo/test-utils/setup/vitest.setup',
			'./src/test/setup.ts'
		],
		globals: true,
		include: [
			'src/**/*.{test,spec}.{ts,tsx}',
			'tests/unit/**/*.{test,spec}.{ts,tsx}'
		],
		exclude: [
			'node_modules/**',
			'dist/**',
			'.next/**',
			'tests/e2e/**',
			'tests/integration/**',
			'tests/production/**'
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html'],
			reportsDirectory: './coverage',
			include: [
				'src/**/*.{ts,tsx}',
			],
			exclude: [
				'src/**/*.stories.{ts,tsx}',
				'src/**/*.test.{ts,tsx}',
				'src/**/*.spec.{ts,tsx}',
				'src/test/**',
				'src/**/*.d.ts',
			],
			thresholds: {
				global: {
					branches: 10,
					functions: 10,
					lines: 10,
					statements: 10,
				},
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@repo/shared': path.resolve(__dirname, '../../packages/shared/src'),
			'@repo/test-utils': path.resolve(__dirname, '../../packages/test-utils/src'),
		},
	},
	define: {
		'process.env.NODE_ENV': '"test"',
	},
});