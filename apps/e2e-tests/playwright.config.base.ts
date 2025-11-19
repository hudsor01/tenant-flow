import { devices, type PlaywrightTestConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))
const TESTS_DIR = path.join(ROOT_DIR, 'tests')

/**
 * Smoke test projects - core functionality verification
 */
/**
 * Accessibility testing project
 */
export const accessibilityProject = {
	name: 'accessibility',
	use: {
		...devices['Desktop Chrome']
	},
	testDir: TESTS_DIR,
	testMatch: ['accessibility.spec.ts']
}

export const smokeProjects = [
	{
		name: 'chromium',
		use: {
			...devices['Desktop Chrome']
		},
		testDir: TESTS_DIR,
		testIgnore: ['staging/**', 'production/**', 'tenant-management/**']
	},
	{
		name: 'chromium-tenant-management',
		use: {
			...devices['Desktop Chrome']
		},
		testDir: path.join(TESTS_DIR, 'tenant-management'),
		testMatch: ['**/*.e2e.spec.ts']
	},
	{
		name: 'chromium-visual',
		use: {
			...devices['Desktop Chrome']
		},
		testDir: path.join(TESTS_DIR, 'tenant-management'),
		testMatch: ['**/*.visual.spec.ts']
	},
	{
		name: 'public',
		use: { ...devices['Desktop Chrome'] },
		testDir: TESTS_DIR,
		testMatch: ['notification-system-public.spec.ts']
		// No auth needed for public pages
	},
	{
		name: 'mobile-chrome',
		use: { ...devices['Pixel 5'] },
		testDir: TESTS_DIR,
		testMatch: ['notification-system-public.spec.ts']
	}
]

/**
 * Staging environment project
 */
export const stagingProject = {
	name: 'staging',
	use: {
		...devices['Desktop Chrome']
	},
	testDir: path.join(TESTS_DIR, 'staging'),
	testMatch: ['**/*.spec.ts']
}

/**
 * Production monitoring project
 */
export const productionProject = {
	name: 'prod',
	use: {
		...devices['Desktop Chrome']
	},
	testDir: path.join(TESTS_DIR, 'production'),
	testMatch: ['**/*.spec.ts']
}

/**
 * Base configuration shared across all projects
 * 2025 best practices:
 * - Multiple reporters for different use cases
 * - Trace on retry for debugging
 * - Screenshots/videos only on failure (save disk space)
 * - Explicit timeouts
 */
export const baseConfig: PlaywrightTestConfig = {
	testDir: TESTS_DIR,

	// Explicit timeouts (Playwright best practice)
	timeout: 30000, // 30s per test
	expect: {
		timeout: 5000, // 5s for assertions
		toHaveScreenshot: {
			maxDiffPixels: 100, // Allow small rendering differences
			animations: 'disabled' // Consistent screenshots
		}
	},

	// Multiple reporters for different audiences
	reporter: [
		['list'], // Console output for CI
		['html', { open: 'never', outputFolder: 'playwright-report' }], // HTML report
		['json', { outputFile: 'test-results/results.json' }], // Machine-readable
		['junit', { outputFile: 'test-results/junit.xml' }], // CI integration
		...(process.env.CI
			? [['github'] as const] // GitHub Actions annotations
			: [])
	],

	use: {
		// Base URL for tests (can be overridden by environment variables)
		baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

		headless: true,

		// Capture diagnostic info
		trace: 'on-first-retry', // Only capture trace when test fails first time
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',

		// Explicit timeouts for actions
		actionTimeout: 10000, // 10s for clicks, fills, etc.
		navigationTimeout: 30000, // 30s for page loads

		// Locale and timezone for consistent test behavior
		locale: 'en-US',
		timezone: 'America/New_York',

			// Viewport size (standard desktop)
		viewport: { width: 1280, height: 720 },

		// Don't use pre-saved auth state - tests handle auth dynamically
		// storageState: 'apps/e2e-tests/.auth/owner.json'
	},

	// Parallel execution (2025 standard)
	fullyParallel: true,
	workers: process.env.CI ? 2 : undefined, // 2 workers in CI, unlimited locally

	// Test sharding for distributed execution across multiple machines
	// Set via env vars: SHARD=1/4, SHARD=2/4, etc.
	shard: process.env.SHARD
		? {
				total: parseInt(process.env.TOTAL_SHARDS || '1'),
				current: parseInt(process.env.CURRENT_SHARD || '1')
			}
		: undefined,

	// Fail fast in CI
	maxFailures: process.env.CI ? 5 : undefined,

	// Retry configuration
	retries: process.env.CI ? 2 : 0, // Retry twice in CI, never locally

	// Forbid .only in CI (prevents accidentally committing focused tests)
	forbidOnly: !!process.env.CI,

	// Output directory for test results
	outputDir: 'test-results/',

	// Global setup/teardown - disabled, tests handle auth directly
	// globalSetup: './apps/e2e-tests/playwright.auth.ts'
}