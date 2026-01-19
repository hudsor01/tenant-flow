import { test, expect } from '@playwright/test'

/**
 * Seed test for Playwright agents
 * This shows agents how our app works and common patterns to use
 */
test.describe('TenantFlow Seed - App Patterns', () => {
	test('authenticated navigation pattern', async ({ page }) => {
		// Tests start already authenticated via storageState
		// Navigate to tenant management
		await page.goto('/tenants')
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

		// Verify we're on the page
		await expect(page).toHaveURL(/\/tenants/)
	})

	test('form interaction pattern', async ({ page }) => {
		// Example of filling forms with our data-testid pattern
		await page.goto('/tenants')

		// Our app uses data-testid attributes for test stability
		// Click buttons by role when possible
		// Use data-testid for inputs and complex components

		// Example button click
		const addButton = page.getByRole('button', { name: /add tenant/i })
		if ((await addButton.count()) > 0) {
			await addButton.click()
		}
	})

	test('API interaction pattern', async ({ request }) => {
		// API tests use the request fixture
		// All requests are authenticated via storageState
		const response = await request.get('/api/v1/tenants')
		expect(response.ok()).toBeTruthy()
	})
})
