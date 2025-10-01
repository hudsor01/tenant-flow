import { defineConfig, devices } from '@playwright/test'

// Ensure we're in an isolated test environment
process.env.NODE_ENV = 'testing'

/**
 * Playwright Configuration for TenantFlow E2E Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './tests/e2e',

	/* Global test timeout */
	timeout: 60000,

	/* Expect timeout for assertions */
	expect: {
		timeout: 10000,
		// Screenshot expectations
		toHaveScreenshot: {
			maxDiffPixels: 100
		}
	},

	/* Run tests in files in parallel */
	fullyParallel: true,

	/* Fail the build on CI if you accidentally left test.only in the source code */
	forbidOnly: !!process.env.CI,

	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,

	/* Opt out of parallel tests on CI */
	workers: process.env.CI ? 1 : undefined,

	/* Global setup for auth */
	globalSetup: './tests/e2e/global-setup',

	/* Global teardown */
	globalTeardown: './tests/e2e/global-teardown',

	/* Reporter configuration */
	reporter: [
		/* Use the html reporter for local development */
		['html', { open: 'never' }],

		/* Use list reporter for CI */
		process.env.CI ? ['github'] : ['list'],

		/* JSON reporter for test result processing */
		['json', { outputFile: 'test-results/results.json' }]

		/* Allure reporter for detailed reporting - disabled until installed */
		// [
		// 	'allure-playwright',
		// 	{
		// 		detail: true,
		// 		outputFolder: 'allure-results',
		// 		suiteTitle: 'TenantFlow E2E Tests'
		// 	}
		// ]
	],

	/* Shared settings for all projects */
	use: {
		/* Base URL for the application */
		baseURL: process.env.CI
			? 'https://tenantflow.app'
			: 'http://localhost:4500',

		/* Collect comprehensive trace for all test runs */
		trace: 'on',

		/* Disable screenshots - using comprehensive tracing instead */
		screenshot: 'off',

		/* Record video on failure */
		video: 'retain-on-failure',

		/* Maximum time for navigation */
		navigationTimeout: 30000,

		/* Maximum time for actions */
		actionTimeout: 10000,

		/* Ignore HTTPS errors */
		ignoreHTTPSErrors: true,

		/* Test environment configuration */
		extraHTTPHeaders: {
			...(process.env.E2E_API_TOKEN
				? { Authorization: process.env.E2E_API_TOKEN }
				: {})
		},

		/* Viewport size */
		viewport: { width: 1280, height: 720 },

		/* Permissions */
		permissions: ['geolocation', 'clipboard-read', 'clipboard-write'],

		/* Locale and timezone */
		locale: 'en-US',
		timezoneId: 'America/New_York'
	},

	/* Configure projects for major browsers */
	projects: [
		/* Setup project for auth */
		{
			name: 'setup',
			testMatch: /global\.setup\.ts/,
			use: {
				// Use playwright-chromium for consistent auth flow
				browserName: 'chromium'
			}
		},

		/* Desktop Chrome with auth state */
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				// Use auth state from global setup
				storageState: 'playwright/.auth/user.json'
			},
			dependencies: ['setup']
		},

		/* Mobile Chrome - for responsive testing */
		{
			name: 'mobile-chrome',
			use: {
				...devices['Pixel 5'],
				storageState: 'playwright/.auth/user.json'
			},
			dependencies: ['setup']
		},

		/* Test without auth for login/signup flows */
		{
			name: 'chromium-no-auth',
			use: {
				...devices['Desktop Chrome']
				// No storage state - fresh browser
			},
			testMatch: /auth\/.+\.spec\.ts/
		}
	],

	/* Local dev server configuration - disable for manual testing */
	webServer: process.env.SKIP_WEB_SERVER
		? undefined
		: process.env.CI
			? undefined
			: [
					// Optionally start backend (set SKIP_BACKEND=1 to skip)
					...(process.env.SKIP_BACKEND
						? []
						: [
								{
									command: 'pnpm dev --filter=@repo/backend',
									port: 8000,
									reuseExistingServer: !process.env.CI,
									timeout: 120000,
									env: {
										NODE_ENV: 'test',
										DATABASE_URL:
											process.env.DATABASE_URL_TEST ||
											process.env.DATABASE_URL ||
											'', // Empty string will cause proper error in backend
										JWT_SECRET:
											process.env.JWT_SECRET ||
											(() => {
												throw new Error(
													'JWT_SECRET is required for Playwright tests'
												)
											})(),
										STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY_TEST || '', // Empty string will cause proper error
										STRIPE_WEBHOOK_SECRET:
											process.env.STRIPE_WEBHOOK_SECRET_TEST || '' // Empty string will cause proper error
									}
								}
							]),
					{
						command: 'pnpm dev --filter=@repo/frontend',
						port: 4500,
						reuseExistingServer: !process.env.CI,
						timeout: 120000,
						env: {
							NODE_ENV: 'test',
							PORT: '4500', // Explicitly set port for Next.js
							NEXT_PUBLIC_API_URL: 'https://api.tenantflow.app/api',
							NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
								process.env.STRIPE_PUBLISHABLE_KEY_TEST || '' // Empty string will cause proper error in frontend
						}
					}
				],

	/* Test output configuration */
	outputDir: 'test-results/',

	/* Snapshots directory */
	snapshotDir: 'tests/e2e/__snapshots__',
	snapshotPathTemplate:
		'{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

	/* Test metadata */
	metadata: {
		project: 'TenantFlow',
		environment:
			process.env.NODE_ENV ||
			(() => {
				throw new Error(
					'NODE_ENV environment variable is required for Playwright tests'
				)
			})(),
		version: process.env.npm_package_version || undefined // Let it be undefined if not set
	}
})

/* Test patterns and organization */
export const testPatterns = {
	unit: '@/**/*.{test,spec}.{js,ts}',
	integration: 'tests/integration/**/*.{test,spec}.{js,ts}',
	e2e: 'tests/e2e/**/*.spec.ts',
	performance: 'tests/performance/**/*.spec.ts',
	critical: 'tests/e2e/**/*.critical.spec.ts',
	auth: 'tests/e2e/auth/**/*.spec.ts',
	dashboard: 'tests/e2e/dashboard/**/*.spec.ts'
}

/* Environment-specific configurations */
export const environments = {
	development: {
		baseURL: 'https://tenantflow.app',
		workers: 1,
		retries: 0
	},
	staging: {
		baseURL: process.env.STAGING_URL,
		workers: 2,
		retries: 1
	},
	production: {
		baseURL: process.env.PRODUCTION_URL,
		workers: 1,
		retries: 2,
		forbidOnly: true
	}
}

/* Auth configurations for different user roles */
export const authStates = {
	admin: 'playwright/.auth/admin.json',
	user: 'playwright/.auth/user.json',
	landlord: 'playwright/.auth/landlord.json',
	tenant: 'playwright/.auth/tenant.json'
}
