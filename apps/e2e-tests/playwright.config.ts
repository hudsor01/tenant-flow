import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

/**
 * Playwright Configuration - TenantFlow E2E Tests
 *
 * Following official Playwright documentation patterns:
 * @see https://playwright.dev/docs/test-configuration
 * @see https://playwright.dev/docs/auth
 * @see https://playwright.dev/docs/test-webserver
 *
 * Environment Variables:
 * This config loads .env.test for local Supabase configuration.
 * @see https://nextjs.org/docs/pages/guides/environment-variables
 */

// ESM-compatible __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.test for test environment variables
// Use override: true to ensure local Supabase URLs
dotenv.config({ path: path.join(__dirname, '.env.test'), override: true })

// Dedicated test ports to avoid conflicts with development servers
const TEST_FRONTEND_PORT = 3050
const TEST_BACKEND_PORT = 4650
const TEST_FRONTEND_URL = `http://localhost:${TEST_FRONTEND_PORT}`
const TEST_BACKEND_URL = `http://localhost:${TEST_BACKEND_PORT}`

// Local Supabase configuration (from .env.test)
const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const LOCAL_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const LOCAL_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Auth state file paths (official Playwright pattern)
// @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
const OWNER_AUTH_FILE = path.join(__dirname, 'playwright/.auth/owner.json')
const TENANT_AUTH_FILE = path.join(__dirname, 'playwright/.auth/tenant.json')

export default defineConfig({
	// ===================
	// Test Organization
	// ===================
	testDir: './tests',
	testMatch: ['**/*.e2e.spec.ts', '**/*.spec.ts'],
	testIgnore: ['**/staging/**', '**/production/**', '**/fixtures/**'],

	// ===================
	// Timeouts
	// ===================
	timeout: 30_000, // 30s per test
	expect: {
		timeout: 5_000, // 5s for assertions
		toHaveScreenshot: {
			maxDiffPixels: 100,
			animations: 'disabled'
		}
	},

	// ===================
	// Execution Strategy
	// ===================
	fullyParallel: true,
	maxFailures: 1, // Stop on first failure for debugging
	workers: process.env.CI ? 2 : 1, // Single worker locally for sequential debugging
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,

	// ===================
	// Reporters
	// @see https://playwright.dev/docs/test-reporters
	// ===================
	reporter: process.env.CI
		? [
				['github'],
				['html', { open: 'never', outputFolder: 'playwright-report' }],
				['json', { outputFile: 'test-results/results.json' }],
				['junit', { outputFile: 'test-results/junit.xml' }]
			]
		: [
				['list', { printSteps: true }],
				['html', { open: 'on-failure', outputFolder: 'playwright-report' }]
			],

	// ===================
	// Global Settings
	// @see https://playwright.dev/docs/api/class-testoptions
	// ===================
	use: {
		// Base URL - all page.goto() calls will be relative to this
		baseURL: TEST_FRONTEND_URL,

		// Bypass CSP to allow test scripts to run
		// @see https://playwright.dev/docs/api/class-browser#browser-new-context-option-bypass-csp
		bypassCSP: true,

		// Recording options
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',

		// Action timeouts
		actionTimeout: 10_000,
		navigationTimeout: 30_000,

		// Consistency across runs
		locale: 'en-US',
		timezoneId: 'America/Chicago',
		viewport: { width: 1280, height: 720 },

		// Always headless (use --headed flag to override)
		headless: true

		// Note: Removed x-playwright-test header - not in CORS allowed headers
	},

	// ===================
	// Projects
	// @see https://playwright.dev/docs/auth
	// @see https://playwright.dev/docs/test-projects
	// ===================
	projects: [
		// ─────────────────────────────────────────
		// SETUP: Authenticate owner via API (runs first)
		// ─────────────────────────────────────────
		{
			name: 'setup-owner',
			testMatch: /auth-api\.setup\.ts/,
			retries: 2
		},

		// ─────────────────────────────────────────
		// SETUP: Invite tenant (owner creates tenant record)
		// Must run after owner auth, creates tenant record in DB
		// ─────────────────────────────────────────
		{
			name: 'setup-invite-tenant',
			testMatch: /setup-invite-tenant\.setup\.ts/,
			dependencies: ['setup-owner'],
			use: {
				storageState: OWNER_AUTH_FILE
			},
			retries: 2
		},

		// ─────────────────────────────────────────
		// SETUP: Authenticate tenant via API
		// Must run after invite (tenant record must exist)
		// ─────────────────────────────────────────
		{
			name: 'setup-tenant',
			testMatch: /auth-tenant\.setup\.ts/,
			dependencies: ['setup-invite-tenant'],
			retries: 2
		},

		// ─────────────────────────────────────────
		// OWNER: Owner dashboard tests (authenticated)
		// Uses storageState - tests start authenticated
		// ─────────────────────────────────────────
		{
			name: 'owner',
			use: {
				...devices['Desktop Chrome'],
				storageState: OWNER_AUTH_FILE
			},
			dependencies: ['setup-owner'],
			testMatch: ['**/owner/**/*.spec.ts']
		},

		// ─────────────────────────────────────────
		// TENANT: Tenant portal tests (authenticated)
		// Uses storageState - tests start authenticated
		// ─────────────────────────────────────────
		{
			name: 'tenant',
			use: {
				...devices['Desktop Chrome'],
				storageState: TENANT_AUTH_FILE
			},
			dependencies: ['setup-tenant'],
			testMatch: ['**/tenant/**/*.spec.ts']
		},

		// ─────────────────────────────────────────
		// CHROMIUM: Other authenticated tests
		// ─────────────────────────────────────────
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: OWNER_AUTH_FILE
			},
			dependencies: ['setup-owner'],
			testIgnore: [
				'**/*.setup.ts',
				'**/public/**',
				'**/owner/**',
				'**/tenant/**',
				'**/stripe-payment-flow.e2e.spec.ts'
			]
		},

		// ─────────────────────────────────────────
		// SMOKE: Critical path tests (no auth - tests login flow)
		// ─────────────────────────────────────────
		{
			name: 'smoke',
			use: {
				...devices['Desktop Chrome'],
				storageState: { cookies: [], origins: [] } // No auth - tests login flow
			},
			testMatch: ['**/smoke/**/*.spec.ts'],
			testIgnore: ['**/minimal.smoke.spec.ts'] // This test requires pre-auth, runs in chromium project
		},

		// ─────────────────────────────────────────
		// PUBLIC: No auth required
		// ─────────────────────────────────────────
		{
			name: 'public',
			use: {
				...devices['Desktop Chrome'],
				storageState: { cookies: [], origins: [] } // Explicitly no auth
			},
			testMatch: ['**/public/**/*.spec.ts', '**/*public*.spec.ts']
		},

		// ─────────────────────────────────────────
		// FIREFOX: Cross-browser testing (owner tests only)
		// ─────────────────────────────────────────
		{
			name: 'firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: OWNER_AUTH_FILE
			},
			dependencies: ['setup-owner'],
			testMatch: ['**/owner/**/*.spec.ts'] // Owner tests for cross-browser
		},

		// ─────────────────────────────────────────
		// MOBILE: Responsive testing (owner tests only)
		// ─────────────────────────────────────────
		{
			name: 'mobile-chrome',
			use: {
				...devices['Pixel 5'],
				storageState: OWNER_AUTH_FILE
			},
			dependencies: ['setup-owner'],
			testMatch: ['**/owner/**/*.spec.ts'] // Owner tests for responsive
		}
	],

	// ===================
	// Web Server
	// @see https://playwright.dev/docs/test-webserver
	//
	// Uses dedicated ports (3050, 4650) to avoid conflicts
	// with development servers (3001, 4600)
	//
	// ===================
	webServer: [
		{
			// Backend: Override Supabase URLs after injection
			command: `bash -c "export SUPABASE_URL='${LOCAL_SUPABASE_URL}' && export SUPABASE_SERVICE_ROLE_KEY='${LOCAL_SUPABASE_SERVICE_KEY}' && exec pnpm --filter @repo/backend dev --port ${TEST_BACKEND_PORT}"`,
			url: `${TEST_BACKEND_URL}/health/ping`,
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			stdout: 'pipe',
			stderr: 'pipe',
			env: {
				PORT: String(TEST_BACKEND_PORT),
				SUPABASE_URL: LOCAL_SUPABASE_URL,
				SUPABASE_SERVICE_ROLE_KEY: LOCAL_SUPABASE_SERVICE_KEY
			}
		},
		{
			// rm -rf .next ensures fresh build with correct env vars
			// Note: Using pnpm --filter instead of direct next call to ensure proper PATH
			command: `cd apps/frontend && rm -rf .next && bash -c "export NEXT_PUBLIC_SUPABASE_URL='${LOCAL_SUPABASE_URL}' && export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='${LOCAL_SUPABASE_ANON_KEY}' && export NEXT_PUBLIC_API_BASE_URL='${TEST_BACKEND_URL}' && exec npx next dev --turbopack --port ${TEST_FRONTEND_PORT}"`,
			url: TEST_FRONTEND_URL,
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: '/Users/richard/Developer/tenant-flow',
			env: {
				NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
				NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_SUPABASE_ANON_KEY,
				NEXT_PUBLIC_API_BASE_URL: TEST_BACKEND_URL
			}
		}
	],

	// ===================
	// Output
	// ===================
	outputDir: 'test-results/'
})
