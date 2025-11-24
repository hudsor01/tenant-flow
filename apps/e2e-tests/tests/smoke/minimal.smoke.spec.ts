import { test, expect } from '@playwright/test'

/**
 * ABSOLUTE MINIMUM SMOKE TEST
 *
 * This is the SIMPLEST possible test.
 * If this doesn't work, NOTHING else will work.
 *
 * Test ONLY one thing: Can a user login?
 * That's it. Nothing fancy. No complex flows.
 *
 * Target: <5 seconds
 * Success criteria: User ends up at /dashboard after login
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD

test.describe('🎯 MINIMAL SMOKE TEST - Login Only', () => {
	test('Can user login? (Yes/No)', async ({ page }) => {
		// Step 1: Go to login page
		console.log(`[1/4] Going to ${BASE_URL}/login`)
		await page.goto(`${BASE_URL}/login`)

		// Step 2: Fill email
		console.log(`[2/4] Filling email: ${OWNER_EMAIL}`)
		await page.fill('input[type="email"]', OWNER_EMAIL!)

		// Step 3: Fill password
		console.log(`[3/4] Filling password`)
		await page.fill('input[type="password"]', OWNER_PASSWORD!)

		// Step 4: Click submit (force to bypass Next.js dev overlay)
		console.log(`[4/4] Clicking submit`)
		await page.locator('button[type="submit"]').click({ force: true })

		// Step 5: Wait 10 seconds and check where we are
		console.log(`[5/5] Waiting to see what happens...`)
		await page.waitForTimeout(10000)

		const finalURL = page.url()
		console.log(`Final URL: ${finalURL}`)

		// Take screenshot for debugging
		await page.screenshot({ path: '/tmp/login-result.png', fullPage: true })
		console.log(`Screenshot saved to: /tmp/login-result.png`)

		// Check if we made it to /dashboard
		if (finalURL.includes('/dashboard')) {
			console.log(`✅ SUCCESS: Login worked! User is at ${finalURL}`)
		} else {
			console.log(`❌ FAILED: Login did not work. Still at: ${finalURL}`)

			// Check for error message
			const errorElement = page.locator('text=/Sign in failed|Invalid|error/i')
			const hasError = await errorElement.isVisible().catch(() => false)

			if (hasError) {
				const errorText = await errorElement.textContent()
				console.log(`Error message on page: "${errorText}"`)
			}

			// Print page content for debugging
			const pageText = await page.locator('body').textContent()
			console.log(`Page content (first 500 chars): ${pageText?.substring(0, 500)}`)

			throw new Error(`Login failed. User did not reach /dashboard. Currently at: ${finalURL}`)
		}

		expect(finalURL).toContain('/dashboard')
	})
})
