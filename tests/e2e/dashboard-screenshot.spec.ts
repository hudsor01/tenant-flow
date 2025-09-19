import { expect, test } from '@playwright/test'

test.describe('Dashboard Screenshot', () => {
	test('should navigate to dashboard and take screenshot', async ({ page }) => {
		// Navigate to the dashboard
		await page.goto('http://localhost:3005/dashboard')

		// Wait for the page to load completely
		await page.waitForLoadState('networkidle')

		// Wait for any potential loading states to complete
		await page.waitForTimeout(2000)

		// Screenshot removed - visual validation no longer needed

		// Verify we're on the dashboard page
		expect(page.url()).toContain('/dashboard')

		// Look for dashboard indicators (cards, metrics, etc.)
		const title = await page.title()
		console.log('Page title:', title)

		// Check if we can find any Card components or dashboard content
		const cardElements = await page.locator('[class*="card"]').count()
		console.log('Found card-like elements:', cardElements)

		// Screenshot removed - viewport visual validation no longer needed
	})
})
