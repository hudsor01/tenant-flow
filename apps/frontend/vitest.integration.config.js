import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true'

export default defineConfig({
	plugins: [
		tsconfigPaths({
			ignoreConfigErrors: true
		}),
		react()
	],
	test: {
		name: 'frontend-integration',
		environment: 'jsdom',
		// Prevent watch mode in CI/pre-commit hooks
		watch: process.env.CI ? false : undefined,
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		globalSetup: ['./tests/integration/setup.ts'],
		env: {
			VITEST_INTEGRATION: 'true',
			RUN_INTEGRATION_TESTS: shouldRunIntegration ? 'true' : 'false'
		},
		include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
		exclude: [
			'node_modules',
			'dist',
			'.next',
			'out',
			'build',
			'coverage',
			'tests/integration/api-data-flow-integration.spec.ts',
			'tests/integration/mock-auth-dashboard-integration.spec.ts',
			'tests/integration/hooks/api/use-property-images.test.tsx'
		],
		// Integration tests may take longer
		testTimeout: 30000,
		hookTimeout: 30000,
		// Run serially to avoid conflicts with shared resources
		threads: false,
		// Retry failed tests (network issues, etc.)
		retry: 1
	}
})
