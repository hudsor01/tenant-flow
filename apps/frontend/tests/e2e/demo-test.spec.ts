import { test, expect } from '@playwright/test'

test.describe('Demo Page Tests', () => {
	test('should load demo page and show dashboard features', async ({
		page
	}) => {
		// Navigate to demo page
		await page.goto('/demo')
		await page.waitForLoadState('networkidle')

		// Check page title
		await expect(page.locator('h1')).toContainText(
			'Dashboard Features Demo'
		)

		// Check all feature sections are visible
		await expect(page.locator('h2:has-text("Theme System")')).toBeVisible()
		await expect(
			page.locator('h2:has-text("Command Palette")')
		).toBeVisible()
		await expect(
			page.locator('h2:has-text("Dense Data Tables")')
		).toBeVisible()
		await expect(
			page.locator('h2:has-text("Mobile Navigation")')
		).toBeVisible()
		await expect(
			page.locator('h2:has-text("Sparkline Charts")')
		).toBeVisible()

		// Check theme toggle button
		await expect(
			page.locator('button', { hasText: 'Theme Toggle' })
		).toBeVisible()

		// Check command palette input
		await expect(page.locator('input[placeholder*="⌘K"]')).toBeVisible()

		// Check data table
		await expect(page.locator('table')).toBeVisible()
		await expect(page.locator('text=Sunset Apartments')).toBeVisible()

		// Check mobile navigation (on mobile viewport)
		await page.setViewportSize({ width: 375, height: 667 })
		await page.waitForTimeout(500)

		await expect(page.locator('text=Home')).toBeVisible()
		await expect(page.locator('button', { hasText: '+' })).toBeVisible()
	})

	test('should show performance checklist', async ({ page }) => {
		await page.goto('/demo')
		await page.waitForLoadState('networkidle')

		// Check performance indicators
		await expect(page.locator('text=✅ Theme switching')).toBeVisible()
		await expect(page.locator('text=✅ Command palette (⌘K)')).toBeVisible()
		await expect(page.locator('text=✅ Responsive design')).toBeVisible()
		await expect(page.locator('text=✅ Fast rendering')).toBeVisible()
	})

	test('should be responsive', async ({ page }) => {
		// Test different viewport sizes
		const viewports = [
			{ width: 1280, height: 800, name: 'desktop' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 375, height: 667, name: 'mobile' }
		]

		for (const viewport of viewports) {
			await page.setViewportSize(viewport)
			await page.goto('/demo')
			await page.waitForLoadState('networkidle')

			// Main content should be visible
			await expect(page.locator('h1')).toBeVisible()

			// Grid should adapt
			const grid = page.locator('.grid')
			await expect(grid).toBeVisible()
		}
	})

	test('should load quickly', async ({ page }) => {
		const startTime = Date.now()

		await page.goto('/demo')
		await page.waitForLoadState('networkidle')

		const loadTime = Date.now() - startTime

		// Should load in under 3 seconds
		expect(loadTime).toBeLessThan(3000)

		// All content should be visible
		await expect(page.locator('h1')).toBeVisible()
		await expect(page.locator('.grid')).toBeVisible()
	})
})
