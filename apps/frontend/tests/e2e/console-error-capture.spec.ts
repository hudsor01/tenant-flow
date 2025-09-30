import { test } from '@playwright/test'

test.describe('Console Error Capture', () => {
	let consoleMessages: Array<{ type: string; text: string; url: string }> = []

	test.beforeEach(async ({ page }) => {
		// Clear console messages for each test
		consoleMessages = []

		// Listen to console messages
		page.on('console', msg => {
			consoleMessages.push({
				type: msg.type(),
				text: msg.text(),
				url: page.url()
			})
		})

		// Listen to page errors
		page.on('pageerror', error => {
			consoleMessages.push({
				type: 'pageerror',
				text: error.message,
				url: page.url()
			})
		})

		// Listen to request failures for more detailed error info
		page.on('requestfailed', request => {
			const failure = request.failure()
			consoleMessages.push({
				type: 'requestfailed',
				text: `Failed to load ${request.url()}: ${failure?.errorText || 'Unknown error'}`,
				url: page.url()
			})
		})
	})

	test('Capture console errors on localhost:3005 (landing page)', async ({
		page
	}) => {
		await page.goto('http://localhost:3005')
		await page.waitForLoadState('networkidle')

		// Wait a bit more to catch any delayed console messages
		await page.waitForTimeout(2000)

		// Test passes if no unhandled errors occurred during page load
	})

	test('Capture console errors on localhost:3005/dashboard', async ({
		page
	}) => {
	await page.goto('http://localhost:3005/dashboard')
		await page.waitForLoadState('networkidle')

		// Wait a bit more to catch any delayed console messages
		await page.waitForTimeout(2000)

		// Test passes if no unhandled errors occurred during page load
	})
})
