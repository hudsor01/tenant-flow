import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration - TenantFlow E2E Tests
 * Following official Playwright documentation patterns
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	// Test organization
	testDir: './tests',
	testMatch: '**/*.e2e.spec.ts',
	testIgnore: ['**/staging/**', '**/production/**'],

	// Timeouts (per Playwright docs)
	timeout: 30000, // 30s per test
	expect: {
		timeout: 5000, // 5s for assertions
		toHaveScreenshot: {
			maxDiffPixels: 100,
			animations: 'disabled'
		}
	},

	// Execution strategy (best practices)
	fullyParallel: true, // Per-test parallelism for sharding
	workers: process.env.CI ? 2 : undefined,
	maxFailures: process.env.CI ? 5 : undefined,
	forbidOnly: !!process.env.CI,

	// Retry configuration (clean worker per retry)
	retries: process.env.CI ? 2 : 0,

	// Multiple reporters for different use cases
	reporter: [
		['list', { printSteps: true }], // Console output
		['html', { open: 'never', outputFolder: 'playwright-report' }],
		['json', { outputFile: 'test-results/results.json' }],
		['junit', { outputFile: 'test-results/junit.xml' }],
		...(process.env.CI ? [['github'] as const] : [])
	],

	// Global use options
	use: {
		// Base URL for navigation
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

		// Recording options (trace > screenshot > video)
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',

		// Action timeouts
		actionTimeout: 10000,
		navigationTimeout: 30000,

		// Consistency across runs
		locale: 'en-US',
		timezoneId: 'America/New_York',
		viewport: { width: 1280, height: 720 },

		// Headless by default
		headless: true,
	},

	// Projects with auth setup dependency
	projects: [
		// Setup project - runs FIRST
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
		},

		// Authenticated desktop tests
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'playwright/.auth/owner.json',
			},
			dependencies: ['setup'],
			testIgnore: ['**/auth.setup.ts', '**/*public.spec.ts'],
		},

		// Tenant management tests
		{
			name: 'chromium-tenant-management',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'playwright/.auth/owner.json',
			},
			dependencies: ['setup'],
			testDir: './tests/tenant-management',
		},

		// Public tests (no auth needed)
		{
			name: 'public',
			use: { ...devices['Desktop Chrome'] },
			testMatch: ['**/*public.spec.ts'],
		},

		// Mobile tests
		{
			name: 'mobile-chrome',
			use: {
				...devices['Pixel 5'],
				storageState: 'playwright/.auth/owner.json',
			},
			dependencies: ['setup'],
			testMatch: ['**/*public.spec.ts'],
		},
	],

	// Auto-start development servers
	webServer: [
		{
			command: 'doppler run -- pnpm --filter @repo/backend dev',
			url: 'http://localhost:4600',
			timeout: 120000,
			reuseExistingServer: !process.env.CI,
			stdout: 'ignore',
			stderr: 'pipe',
		},
		{
			command: 'pnpm --filter @repo/frontend dev',
			url: 'http://localhost:3000',
			timeout: 120000,
			reuseExistingServer: !process.env.CI,
			stdout: 'ignore',
			stderr: 'pipe',
		}
	],

	// Output directory
	outputDir: 'test-results/',
})
