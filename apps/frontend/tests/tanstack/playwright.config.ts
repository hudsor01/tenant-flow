/**
 * Playwright configuration specifically for TanStack Query tests
 * Optimized for testing query behavior, cache management, and real user workflows
 */

import { defineConfig, devices } from '@playwright/test'
import baseConfig from '../../playwright.config'

export default defineConfig({
	...baseConfig,

	// Override test directory for TanStack Query tests
	testDir: './tests/tanstack',

	// Specific configuration for TanStack Query testing
	use: {
		...baseConfig.use,

		// Longer timeout for complex cache operations
		actionTimeout: 15000,

		// Enable tracing for debugging query behavior
		trace: 'retain-on-failure',

		// Video for debugging complex workflows
		video: 'retain-on-failure',

		// Screenshots for visual debugging
		screenshot: 'only-on-failure',

		// Disable browser context caching to ensure clean test state
		storageState: undefined
	},

	projects: [
		// Main TanStack Query test project
		{
			name: 'tanstack-query-chrome',
			use: {
				...devices['Desktop Chrome'],
				// Viewport for consistent testing
				viewport: { width: 1280, height: 720 },

				// Enable developer tools for debugging
				devtools: false,

				// Slower execution for complex query operations
				launchOptions: {
					slowMo: 50 // 50ms delay between actions for stability
				}
			}
		},

		// Mobile testing for responsive query behavior
		{
			name: 'tanstack-query-mobile',
			use: {
				...devices['iPhone 13']
				// Test infinite scroll on mobile
			},
			testIgnore: [
				'**/performance-testing.spec.ts' // Skip performance tests on mobile
			]
		},

		// Network simulation testing
		{
			name: 'tanstack-query-network-sim',
			use: {
				...devices['Desktop Chrome'],
				// Simulate slower network for testing loading states
				launchOptions: {
					args: ['--simulate-outdated-no-au-prompt']
				}
			},
			testMatch: ['**/error-handling.spec.ts', '**/cache-behavior.spec.ts']
		}
	],

	// Test execution settings optimized for query testing
	fullyParallel: false, // Sequential execution to avoid cache conflicts
	workers: 1, // Single worker to avoid test interference

	// Longer global timeout for complex workflows
	timeout: 60000,

	// Expect timeout for query-related assertions
	expect: {
		...baseConfig.expect,
		timeout: 15000 // Longer timeout for query state changes
	},

	// Retry configuration for query tests
	retries: process.env.CI ? 2 : 1,

	// Specific reporter for TanStack Query tests
	reporter: [
		['html', { outputFolder: 'tanstack-test-results' }],
		['json', { outputFile: 'tanstack-test-results/results.json' }],
		['list']
	],

	// Web server configuration for testing
	webServer: {
		command: 'pnpm dev',
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	},

	// Global setup for TanStack Query tests
	globalSetup: require.resolve('./tanstack-global-setup.ts'),

	// Global teardown
	globalTeardown: require.resolve('./tanstack-global-teardown.ts')
})
