import { test, expect } from '@playwright/test'

/**
 * CRITICAL PATH SMOKE TESTS — Login Flow
 *
 * The original critical-paths suite had 5 tests, 4 of which started by
 * re-running `loginAsOwner()` through the UI. That hammered Supabase's
 * ~45-sign-ins/minute auth rate limit on busy days (4+ PRs merging in
 * quick succession), producing the "P0 Dashboard loads for owner" flake
 * captured in MEMORY.md.
 *
 * The 4 post-login tests moved to `authenticated-flows.smoke.spec.ts`,
 * which reuses the existing `setup-owner` storageState (one Supabase
 * Auth API call per CI run, not five UI logins). This file keeps only
 * the test that genuinely exercises the login UI itself — it MUST stay
 * un-authenticated.
 *
 * Project wiring: this file matches the `smoke` project
 * (`storageState: { cookies: [], origins: [] }`); the authenticated
 * sibling matches the `smoke-authenticated` project.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || ''
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || ''
const hasCredentials = Boolean(OWNER_EMAIL && OWNER_PASSWORD)

test.describe('🚨 CRITICAL PATH SMOKE TESTS — Login Flow 🚨', () => {
	test.skip(!hasCredentials, 'E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD must be set')

	test('🔥 P0: Owner can login', async ({ page }) => {
		// Navigate to login
		await page.goto(`${BASE_URL}/login`)

		// Wait for form to be fully interactive (inputs enabled)
		const emailInput = page.locator('input#email')
		const passwordInput = page.locator('input#password')
		const submitButton = page.locator('button[type="submit"]')

		// Wait for email input to be visible and enabled
		await expect(emailInput).toBeVisible({ timeout: 10000 })
		await expect(emailInput).toBeEnabled({ timeout: 5000 })

		// Fill credentials - use click + type for controlled components
		await emailInput.click()
		await emailInput.fill(OWNER_EMAIL)

		await passwordInput.click()
		await passwordInput.fill(OWNER_PASSWORD)

		// Verify values were entered
		await expect(emailInput).toHaveValue(OWNER_EMAIL)
		await expect(passwordInput).toHaveValue(OWNER_PASSWORD)

		// Submit
		await submitButton.click()

		// Wait for navigation AWAY from login page (not just any URL)
		try {
			await page.waitForURL(url => !url.pathname.includes('/login'), {
				timeout: 15000
			})
		} catch (e) {
			// Check if there's an error message on the page
			const errorMsg = await page
				.locator('text=/Sign in failed|Invalid|error/i')
				.textContent()
				.catch(() => null)
			if (errorMsg) {
				throw new Error(
					`🚨 LOGIN FAILED: ${errorMsg}\n\n` +
						`❌ CRITICAL: Owner cannot login!\n` +
						`Account: ${OWNER_EMAIL}\n\n` +
						`Fix:\n` +
						`1. Check Supabase Dashboard → Users\n` +
						`2. Verify account exists with correct password`,
					{ cause: e }
				)
			}
			throw new Error(
				`🚨 LOGIN TIMEOUT: No redirect after 15s\n` +
					`Current URL: ${page.url()}\n` +
					`Check: Supabase env vars, backend health, frontend build`,
				{ cause: e }
			)
		}

		// Verify we ended up on an authenticated page (dashboard or similar)
		const currentUrl = page.url()
		expect(currentUrl).not.toContain('/login')
	})
})

test.describe('🔍 SMOKE: Environment Sanity Checks', () => {
	test('Environment variables are set', async () => {
		test.skip(!hasCredentials, 'E2E credentials not configured — skipping env check')
		expect(OWNER_EMAIL, 'E2E_OWNER_EMAIL must be set').toBeTruthy()
		expect(OWNER_PASSWORD, 'E2E_OWNER_PASSWORD must be set').toBeTruthy()
		expect(BASE_URL, 'PLAYWRIGHT_BASE_URL must be set').toBeTruthy()
	})

	test('Frontend is reachable', async ({ request }) => {
		const frontendResponse = await request.get(BASE_URL).catch(() => null)
		expect(
			frontendResponse,
			`Frontend not reachable at ${BASE_URL}`
		).toBeTruthy()
	})
})
