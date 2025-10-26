/**
 * Authentication Setup for E2E Tests - Supabase httpOnly Cookie Edition
 *
 * IMPORTANT: Supabase uses httpOnly cookies which CANNOT be captured by storageState()
 * Solution: Provide reusable login helpers that authenticate at the start of each test
 *
 * Pattern:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await loginAsOwner(page)
 * })
 * ```
 */

import { expect, type Page } from '@playwright/test'

/**
 * Resolve required environment variables for test credentials.
 * Throws immediately if nothing is configured so we never fall back to hardcoded secrets.
 */
function requireEnv(keys: string[], description: string) {
	for (const key of keys) {
		const value = process.env[key]
		if (value && value.trim().length > 0) {
			return value
		}
	}

	throw new Error(
		`[auth-helpers] Missing ${description}. Set one of: ${keys.join(', ')}.`
	)
}

/**
 * Login helper for property owner role
 * Use in test.beforeEach() to authenticate at the start of each test
 */
export async function loginAsOwner(page: Page) {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	await page.goto(`${baseUrl}/login`)

	// Wait for login form
	await expect(
		page.getByRole('heading', { name: /welcome back/i })
	).toBeVisible()

	// Fill credentials
	const email = requireEnv(
		['E2E_OWNER_EMAIL', 'TEST_OWNER_EMAIL'],
		'OWNER login email env vars'
	)
	const password = requireEnv(
		['E2E_OWNER_PASSWORD', 'TEST_OWNER_PASSWORD'],
		'OWNER login password env vars'
	)

	await page.locator('#email').fill(email)
	await page.locator('#password').fill(password)

	// Submit and wait for redirect
	await page.getByRole('button', { name: /sign in|login|submit/i }).click()

	// Wait for successful redirect to authenticated area
	await page.waitForURL(/\/(manage|dashboard)/, { timeout: 10000 })
}

/**
 * Login helper for tenant role
 * Use in test.beforeEach() to authenticate at the start of each test
 */
export async function loginAsTenant(page: Page) {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	await page.goto(`${baseUrl}/login`)

	await expect(
		page.getByRole('heading', { name: /welcome back/i })
	).toBeVisible()

	const email = requireEnv(
		['E2E_TENANT_EMAIL', 'TEST_TENANT_EMAIL'],
		'TENANT login email env vars'
	)
	const password = requireEnv(
		['E2E_TENANT_PASSWORD', 'TEST_TENANT_PASSWORD'],
		'TENANT login password env vars'
	)

	await page.locator('#email').fill(email)
	await page.locator('#password').fill(password)

	await page.getByRole('button', { name: /sign in|login|submit/i }).click()

	// Tenants redirect to /tenant
	await page.waitForURL(/\/tenant/, { timeout: 10000 })
}

/**
 * Login helper for admin role
 * Use in test.beforeEach() to authenticate at the start of each test
 */
export async function loginAsAdmin(page: Page) {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	await page.goto(`${baseUrl}/login`)

	await expect(
		page.getByRole('heading', { name: /welcome back/i })
	).toBeVisible()

	const email = requireEnv(
		['E2E_ADMIN_EMAIL', 'TEST_ADMIN_EMAIL'],
		'ADMIN login email env vars'
	)
	const password = requireEnv(
		['E2E_ADMIN_PASSWORD', 'TEST_ADMIN_PASSWORD'],
		'ADMIN login password env vars'
	)

	await page.locator('#email').fill(email)
	await page.locator('#password').fill(password)

	await page.getByRole('button', { name: /sign in|login|submit/i }).click()

	await page.waitForURL(/\/(manage|admin|dashboard)/, { timeout: 10000 })
}
