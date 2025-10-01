import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E testing
 * MVP APPROACH: Single browser, simple setup following CLAUDE.md KISS principles
 * - Chrome only (covers 90% of users)
 * - No over-engineering with multiple browsers
 * - Fast feedback for production confidence
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		['html'],
		['json', { outputFile: 'test-results/results.json' }],
		['junit', { outputFile: 'test-results/junit.xml' }]
	],

	use: {
		// Enhanced debugging configuration
		trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',

		// Headless mode configuration - true for performance and CI compatibility
		headless: true,

		// Better base URL handling with explicit configuration required
		baseURL: process.env.CI
			? process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: 'https://tenantflow.app'
			: 'http://localhost:4500', // Default for local testing - matches webServer port

		// Performance and reliability settings
		actionTimeout: 10000,
		navigationTimeout: 30000,

		// Visual testing settings
		ignoreHTTPSErrors: true,
		acceptDownloads: true,

		// Viewport for consistent screenshots
		viewport: { width: 1280, height: 720 }
	},

	projects: [
		// Setup project for authentication
		{
			name: 'setup',
			testMatch: /.*\.setup\.ts/,
			use: {
				...devices['Desktop Chrome'],
				headless: true,
				baseURL: (() => {
					if (process.env.PLAYWRIGHT_TEST_BASE_URL)
						return process.env.PLAYWRIGHT_TEST_BASE_URL
					if (process.env.PLAYWRIGHT_BASE_URL)
						return process.env.PLAYWRIGHT_BASE_URL
					if (process.env.CI) {
						if (process.env.VERCEL_URL)
							return `https://${process.env.VERCEL_URL}`
						return 'https://tenantflow.app'
					}
					return 'http://localhost:4500' // Default for local testing
				})()
			}
		},

		// Main test project with authentication
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				headless: true,
				// Use saved authentication state
				storageState: 'playwright/.auth/user.json',
				baseURL: (() => {
					if (process.env.PLAYWRIGHT_TEST_BASE_URL)
						return process.env.PLAYWRIGHT_TEST_BASE_URL
					if (process.env.PLAYWRIGHT_BASE_URL)
						return process.env.PLAYWRIGHT_BASE_URL
					if (process.env.CI) {
						if (process.env.VERCEL_URL)
							return `https://${process.env.VERCEL_URL}`
						return 'https://tenantflow.app'
					}
					return 'http://localhost:4500' // Default for local testing
				})()
			},
			dependencies: ['setup']
		},

		// Project for tests that don't need authentication
		{
			name: 'chromium-no-auth',
			use: {
				...devices['Desktop Chrome'],
				headless: true,
				baseURL: (() => {
					if (process.env.PLAYWRIGHT_TEST_BASE_URL)
						return process.env.PLAYWRIGHT_TEST_BASE_URL
					if (process.env.PLAYWRIGHT_BASE_URL)
						return process.env.PLAYWRIGHT_BASE_URL
					if (process.env.CI) {
						if (process.env.VERCEL_URL)
							return `https://${process.env.VERCEL_URL}`
						return 'https://tenantflow.app'
					}
					return 'http://localhost:4500' // Default for local testing
				})()
			},
			testIgnore: ['**/auth.setup.ts']
		}
	],

	// Visual regression testing configuration
	expect: {
		// Enhanced screenshot comparison
		toHaveScreenshot: {
			maxDiffPixels: 100,
			threshold: 0.2,
			animations: 'disabled', // More reliable screenshots
			stylePath: './tests/visual-regression.css'
		},
		// General assertion timeout
		timeout: 10000
	},

	// Global test configuration
	globalSetup: './tests/global-setup.ts',
	globalTeardown: './tests/global-teardown.ts'
})
