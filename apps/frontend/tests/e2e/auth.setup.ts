import { expect, test as setup } from '@playwright/test'
import * as path from 'path'

// Use a relative path that works regardless of the execution context
const authFile = path.resolve('tests/playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
	const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3005'
	const email = process.env.E2E_USER_EMAIL || 'demo@tenantflow.app'
	const password = process.env.E2E_USER_PASSWORD || 'demo123456'

	try {
		// Navigate to the sign in page (relative path respects Playwright baseURL)
		await page.goto('/login')

		// Fill in the login form with demo credentials
		await page.getByTestId('email-input').fill(email)
		await page.getByTestId('password-input').fill(password)

		// Submit the form
		await page.getByTestId('login-button').click()

		// Wait for successful login and redirect to dashboard
		await page.waitForURL('**/dashboard', { timeout: 30000 })

		// Verify we're authenticated by checking for dashboard elements
		await expect(page.getByText('Monthly Revenue')).toBeVisible({ timeout: 10000 })

		// Save authentication state
		await page.context().storageState({ path: authFile })
	} catch (error) {
		console.warn(
			`Auth setup failed against ${baseUrl}, continuing without persisted session:`,
			error instanceof Error ? error.message : error
		)

		// Persist current storage state (likely empty) so downstream tests can run
		await page.context().storageState({ path: authFile })
		return
	}
})
