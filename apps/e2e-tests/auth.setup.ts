/**
 * Authentication Setup for E2E Tests
 * Official Playwright pattern: https://playwright.dev/docs/auth
 *
 * Runs once before all tests, stores authenticated session state.
 * All subsequent tests reuse this state for instant authentication.
 */

import { expect, test as setup } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Storage paths for different user roles
export const STORAGE_STATE = {
	OWNER: path.join(__dirname, '.auth', 'owner.json'),
	TENANT: path.join(__dirname, '.auth', 'tenant.json'),
	ADMIN: path.join(__dirname, '.auth', 'admin.json')
}

/**
 * Setup authenticated session for property owner
 * Most tests use this role (manage tenants, properties, leases)
 */
setup('authenticate as owner', async ({ page }) => {
	await page.goto('/login')

	// Wait for login form to be ready - check for the actual h1 heading
	await expect(
		page.getByRole('heading', { name: /welcome back/i })
	).toBeVisible()

	// Wait for any form progress restoration to complete
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)

	// Fill login credentials from environment variables
	const email =
		process.env.E2E_OWNER_EMAIL ||
		process.env.TEST_OWNER_EMAIL ||
		'rhudsontspr+46@gmail.com'
	const password =
		process.env.E2E_OWNER_PASSWORD ||
		process.env.TEST_OWNER_PASSWORD ||
		'TestPassword123!'

	// Use standard Playwright fill() with force to bypass actionability checks
	await page.locator('#email').fill(email, { force: true })
	await page.locator('#password').fill(password, { force: true })

	// Verify fields are filled
	await expect(page.locator('#email')).toHaveValue(email)
	await expect(page.locator('#password')).toHaveValue(password)

	// Submit form
	await page.getByRole('button', { name: /sign in|login|submit/i }).click()

	// Wait for successful authentication
	// Adjust this URL based on your actual redirect after login
	await page.waitForURL(/\/(manage|dashboard|tenant)/, { timeout: 30000 })

	// Verify authentication succeeded
	await expect(page).toHaveURL(/\/(manage|dashboard|tenant)/)

	// Store authenticated state to file
	await page.context().storageState({ path: STORAGE_STATE.OWNER })
})

/**
 * Setup authenticated session for tenant
 * For testing tenant portal features
 */
setup('authenticate as tenant', async ({ page }) => {
	await page.goto('/login')

	await expect(
		page.getByRole('heading', { name: /welcome back/i })
	).toBeVisible()

	// Wait for any form progress restoration to complete
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)

	// Fill login credentials from environment variables
	const email =
		process.env.E2E_TENANT_EMAIL ||
		process.env.TEST_TENANT_EMAIL ||
		'test-tenant@tenantflow.app'
	const password =
		process.env.E2E_TENANT_PASSWORD ||
		process.env.TEST_TENANT_PASSWORD ||
		'TestPassword123!'

	// Use standard Playwright fill() with force to bypass actionability checks
	await page.locator('#email').fill(email, { force: true })
	await page.locator('#password').fill(password, { force: true })

	// Verify fields are filled
	await expect(page.locator('#email')).toHaveValue(email)
	await expect(page.locator('#password')).toHaveValue(password)

	// Submit form
	await page.getByRole('button', { name: /sign in|login|submit/i }).click()

	// Wait for redirect - tenants should go to /tenant, but may hit /manage first due to middleware
	await page.waitForURL(/\/(manage|tenant)/, { timeout: 30000 })

	// If landed on /manage, wait for redirect to /tenant
	const currentUrl = page.url()
	if (currentUrl.includes('/manage')) {
		try {
			await page.waitForURL(/\/tenant/, { timeout: 5000 })
		} catch {
			// Some test tenants may not yet be provisioned with tenant portal access.
			// It's acceptable to remain on manage for setup purposes.
		}
	}

	await page.context().storageState({ path: STORAGE_STATE.TENANT })
})

/**
 * Setup authenticated session for admin
 * For testing admin-only features
 */
setup('authenticate as admin', async ({ page }) => {
	await page.goto('/login')

	await expect(
		page.getByRole('heading', { name: /welcome back/i })
	).toBeVisible()

	// Wait for any form progress restoration to complete
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)

	// Fill login credentials from environment variables
	const email =
		process.env.E2E_ADMIN_EMAIL ||
		process.env.TEST_ADMIN_EMAIL ||
		'test-admin@tenantflow.app'
	const password =
		process.env.E2E_ADMIN_PASSWORD ||
		process.env.TEST_ADMIN_PASSWORD ||
		'TestPassword123!'

	// Use standard Playwright fill() with force to bypass actionability checks
	await page.locator('#email').fill(email, { force: true })
	await page.locator('#password').fill(password, { force: true })

	// Verify fields are filled
	await expect(page.locator('#email')).toHaveValue(email)
	await expect(page.locator('#password')).toHaveValue(password)

	// Submit form
	await page.getByRole('button', { name: /sign in|login|submit/i }).click()

	// Wait for successful authentication
	await page.waitForURL(/\/(manage|admin|dashboard|tenant)/, { timeout: 30000 })

	// Store authenticated state to file
	await page.context().storageState({ path: STORAGE_STATE.ADMIN })
})

/**
 * Cleanup function for CI environments
 * Removes stored authentication files after test run
 */
setup.afterAll(async () => {
	// Only cleanup when explicitly requested.
	// NOTE: auth.setup runs as its own Playwright project; in CI this 'afterAll'
	// would run before other projects that consume the stored .auth files.
	// Deleting the files when `CI=true` causes downstream tests to fail because
	// the storage state no longer exists. Require an explicit env var to opt-in
	// to cleanup so multi-project runs can reuse the storage state files.
	if (process.env.PLAYWRIGHT_CLEAN_AUTH === 'true') {
		const fs = await import('node:fs/promises')
		try {
			await fs.rm(path.join(__dirname, '.auth'), {
				recursive: true,
				force: true
			})
		} catch (error) {
			// Ignore cleanup errors
		}
	}
})
