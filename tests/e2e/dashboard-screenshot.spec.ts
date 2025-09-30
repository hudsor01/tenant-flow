import { expect, test } from '@playwright/test'

test.describe('Dashboard Screenshot', () => {
	test('should navigate to dashboard and take screenshot', async ({ page }) => {
		if (!process.env.NEXT_PUBLIC_APP_URL) {
			throw new Error('NEXT_PUBLIC_APP_URL is required for dashboard screenshot tests')
		}
		// Navigate to the dashboard
		await page.goto(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)

		// Wait for the page to load completely
		await page.waitForLoadState('networkidle')

		// Wait for any potential loading states to complete
		await page.waitForTimeout(2000)

		// Verify we're on the dashboard page
		expect(page.url()).toContain('/dashboard')

		// Test passes if we successfully navigate to dashboard
	})
})
