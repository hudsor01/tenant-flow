/**
 * Simple test to see what's actually on your homepage
 * No assumptions, just exploration
 */

import { expect, test } from '@playwright/test'

test('See what is actually on the homepage', async ({ page }) => {
	await page.goto(
		process.env.CI ? 'https://tenantflow.app' : 'http://localhost:4500'
	)

	// Get page title
	const title = await page.title()

	// Just pass - this is exploration, not testing specific functionality
	expect(title).toBeDefined()
})
