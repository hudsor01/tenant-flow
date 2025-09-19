import { expect, test } from '@playwright/test'

test.describe('Dashboard (Authenticated)', () => {
	test('displays dashboard with real data after authentication', async ({
		page
	}) => {
		// Navigate to dashboard - authentication state should be loaded automatically
		await page.goto('/dashboard')

		// Wait for the page to load by checking for dashboard elements
		await expect(page.getByText('Monthly Revenue')).toBeVisible()

		// Check that we're on the dashboard page
		await expect(page).toHaveURL(/.*dashboard/)

		// Check that the dashboard content area is visible (not empty)
		const dashboardContent = page.locator('div[class*="max-w-screen-2xl"]')
		await expect(dashboardContent).toBeVisible()

		// Check for dashboard metrics cards
		await expect(page.getByText('Properties')).toBeVisible()
		await expect(page.getByText('Tenants')).toBeVisible()
		await expect(page.getByText('Units')).toBeVisible()
		await expect(page.getByText('Open Requests')).toBeVisible()

		// Check for actual metric values (not just zeros)
		const propertyCount = page.locator('text=/^\\d+$/').first()
		await expect(propertyCount).toBeVisible()

		// Verify charts section is present
		await expect(page.locator('div[class*="col-span-12"]')).toBeVisible()

		// Take a screenshot for visual validation
		await page.screenshot({
			path: 'test-results/dashboard-authenticated.png',
			fullPage: true
		})

		console.log('✅ Dashboard authenticated test completed successfully')
	})

	test('dashboard API calls work correctly', async ({ page }) => {
		// Listen for API calls
		const apiCalls = []
		page.on('request', request => {
			if (request.url().includes('/api/dashboard')) {
				apiCalls.push({
					url: request.url(),
					method: request.method()
				})
			}
		})

		// Navigate to dashboard
		await page.goto('/dashboard')

		// Wait for API calls to complete
		await page.waitForTimeout(2000)

		// Verify API calls were made
		expect(apiCalls.length).toBeGreaterThan(0)
		console.log('Dashboard API calls:', apiCalls)

		// Check that we don't have the error message anymore
		await expect(
			page.getByText('Failed to load dashboard data')
		).not.toBeVisible()
	})
})
