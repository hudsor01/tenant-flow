import { test, expect } from '@playwright/test'

/**
 * MINIMAL SMOKE TEST
 *
 * Tests that authentication via storageState works.
 * If this passes, the Playwright auth setup is working correctly.
 *
 * Per Playwright docs: Tests start already authenticated because
 * we specified storageState in the config.
 * @see https://playwright.dev/docs/auth
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

test.describe('Minimal Smoke Test', () => {
	test('authenticated user can access dashboard', async ({ page }) => {
		// Navigate directly to dashboard - should work because we're pre-authenticated
		await page.goto(`${BASE_URL}/dashboard`)

		// Wait for page to load
		await page.waitForLoadState('networkidle')

		// Check we're on the dashboard (not redirected to login)
		const currentURL = page.url()

		if (currentURL.includes('/login')) {
			// Take screenshot for debugging
			await page.screenshot({
				path: '/tmp/smoke-auth-failed.png',
				fullPage: true
			})
			throw new Error(
				`Authentication failed - redirected to login. StorageState may not be working.`
			)
		}

		// Verify we're on the dashboard
		expect(currentURL).toContain('/dashboard')

		// Optional: verify some dashboard content is visible
		await expect(page.locator('body')).toBeVisible()
	})
})
