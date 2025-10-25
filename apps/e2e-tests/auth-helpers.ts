import { type Page, expect } from '@playwright/test'

/**
 * Shared Authentication Helpers for E2E Tests
 *
 * Performance Optimization:
 * - Session reuse per worker (login once per worker, not per test)
 * - Reduces login overhead from 3s per test → 3s per worker
 * - Example: 15 tests with 3 workers = 9s total login time (vs 45s)
 *
 * Security:
 * - Test-only credentials from environment variables
 * - Never committed to git (use Doppler secrets)
 * - Supabase httpOnly cookies properly captured
 */

// Cache authenticated sessions per worker
const sessionCache = new Map<string, any>()

interface LoginOptions {
	email?: string
	password?: string
	forceLogin?: boolean // Skip cache, force fresh login
}

/**
 * Login as property owner (admin/landlord role)
 *
 * @param page - Playwright page instance
 * @param options - Login options (email, password, forceLogin)
 *
 * Performance:
 * - First call in worker: ~3 seconds (real login)
 * - Subsequent calls: ~100ms (reuse session)
 *
 * Usage:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await loginAsOwner(page)
 * })
 * ```
 */
export async function loginAsOwner(page: Page, options: LoginOptions = {}) {
	const email = options.email || process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
	const password =
		options.password || process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'
	const cacheKey = `owner:${email}`

	// Use cached session if available (unless forceLogin)
	if (!options.forceLogin && sessionCache.has(cacheKey)) {
		const session = sessionCache.get(cacheKey)
		await page.context().addCookies(session.cookies)
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')
		return
	}

	// Perform fresh login
	await page.goto('/login')
	await page.waitForLoadState('networkidle')

	// Wait for form to be ready
	await expect(page.locator('#email')).toBeVisible({ timeout: 5000 })

	// Fill credentials
	await page.locator('#email').fill(email, { force: true })
	await page.locator('#password').fill(password, { force: true })

	// Wait for form state to stabilize
	await page.waitForTimeout(500)

	// Submit and wait for navigation
	await Promise.all([
		page.waitForURL(/\/(manage|dashboard)/, { timeout: 30000 }),
		page.getByRole('button', { name: /sign in|login|submit/i }).click()
	])

	// Wait for page to stabilize
	await page.waitForLoadState('networkidle')

	// Cache session for this worker (includes httpOnly cookies!)
	const session = await page.context().storageState()
	sessionCache.set(cacheKey, session)

	console.log(`✅ Logged in as owner (${email}) - Session cached for worker`)
}

/**
 * Login as tenant
 *
 * @param page - Playwright page instance
 * @param options - Login options (email, password, forceLogin)
 *
 * Performance:
 * - First call in worker: ~3 seconds (real login)
 * - Subsequent calls: ~100ms (reuse session)
 *
 * Usage:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await loginAsTenant(page)
 * })
 * ```
 */
export async function loginAsTenant(page: Page, options: LoginOptions = {}) {
	const email = options.email || process.env.E2E_TENANT_EMAIL || 'test-tenant@tenantflow.app'
	const password =
		options.password || process.env.E2E_TENANT_PASSWORD || 'TestPassword123!'
	const cacheKey = `tenant:${email}`

	// Use cached session if available (unless forceLogin)
	if (!options.forceLogin && sessionCache.has(cacheKey)) {
		const session = sessionCache.get(cacheKey)
		await page.context().addCookies(session.cookies)
		await page.goto('/tenant')
		await page.waitForLoadState('networkidle')
		return
	}

	// Perform fresh login
	await page.goto('/login')
	await page.waitForLoadState('networkidle')

	// Wait for form to be ready
	await expect(page.locator('#email')).toBeVisible({ timeout: 5000 })

	// Fill credentials
	await page.locator('#email').fill(email, { force: true })
	await page.locator('#password').fill(password, { force: true })

	// Wait for form state to stabilize
	await page.waitForTimeout(500)

	// Submit and wait for navigation
	await Promise.all([
		page.waitForURL(/\/tenant/, { timeout: 30000 }),
		page.getByRole('button', { name: /sign in|login|submit/i }).click()
	])

	// Wait for page to stabilize
	await page.waitForLoadState('networkidle')

	// Cache session for this worker (includes httpOnly cookies!)
	const session = await page.context().storageState()
	sessionCache.set(cacheKey, session)

	console.log(`✅ Logged in as tenant (${email}) - Session cached for worker`)
}

/**
 * Clear session cache (useful for testing logout scenarios)
 *
 * Usage:
 * ```typescript
 * test('logout flow', async ({ page }) => {
 *   await loginAsOwner(page)
 *   await page.click('[data-testid="logout"]')
 *   clearSessionCache() // Force fresh login next time
 * })
 * ```
 */
export function clearSessionCache() {
	sessionCache.clear()
	console.log('🗑️  Session cache cleared')
}
