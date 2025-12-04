import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for production monitoring tests
 *
 * Usage: pnpm --filter @repo/e2e-tests test --config playwright.config.prod.ts
 *
 * Runs health checks and monitoring tests against production
 * Does NOT start local servers - expects production URLs
 *
 * @see https://playwright.dev/docs/test-configuration
 */

const PROD_FRONTEND_URL = process.env.PROD_FRONTEND_URL || 'https://tenantflow.app'

export default defineConfig({
	// ===================
	// Test Organization
	// ===================
	testDir: './tests',
	testMatch: ['**/production/**/*.spec.ts', '**/smoke/**/*.spec.ts'],

	// ===================
	// Timeouts (more lenient for production)
	// ===================
	timeout: 60_000, // 60s per test
	expect: {
		timeout: 10_000, // 10s for assertions
	},

	// ===================
	// Execution Strategy
	// ===================
	fullyParallel: false, // Sequential for production monitoring
	workers: 1, // Single worker to avoid overwhelming production
	retries: 1, // One retry for transient network issues
	forbidOnly: true, // No .only in production tests

	// ===================
	// Reporters
	// ===================
	reporter: [
		['list', { printSteps: true }],
		['json', { outputFile: 'test-results/prod-results.json' }],
	],

	// ===================
	// Global Settings
	// ===================
	use: {
		baseURL: PROD_FRONTEND_URL,

		// Recording options
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',

		// Action timeouts
		actionTimeout: 15_000,
		navigationTimeout: 45_000,

		// Consistency across runs
		locale: 'en-US',
		timezoneId: 'America/Chicago',
		viewport: { width: 1280, height: 720 },

		headless: true,

		// Production header for monitoring
		extraHTTPHeaders: {
			'x-playwright-test': 'production-monitoring',
		},
	},

	// ===================
	// Projects
	// ===================
	projects: [
		{
			name: 'production-chromium',
			use: {
				...devices['Desktop Chrome'],
			},
		},
	],

	// ===================
	// NO webServer - production tests hit live URLs
	// ===================

	// ===================
	// Output
	// ===================
	outputDir: 'test-results/production/',
})
