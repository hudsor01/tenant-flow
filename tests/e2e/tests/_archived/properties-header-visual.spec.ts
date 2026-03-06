import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

test.describe('Properties Page Header - Visual Tests', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
		await page.goto('/properties')
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
		await page.waitForSelector('text=Properties', { state: 'visible' })
	})

	test('should display header with correct layout on desktop viewport', async ({
		page
	}) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 })

		// Wait for layout to adjust
		await page.waitForTimeout(500)

		// Verify header is visible
		await expect(page.locator('text=Properties')).toBeVisible()

		// Take screenshot of desktop layout
		await expect(page).toHaveScreenshot('properties-header-desktop.png', {
			fullPage: false,
			maxDiffPixels: 200
		})
	})

	test('should maintain visual consistency across page loads', async ({
		page
	}) => {
		// Take initial screenshot
		const headerCard = page
			.locator('div')
			.filter({ hasText: 'Properties' })
			.first()
		await expect(headerCard).toHaveScreenshot('header-load-1.png', {
			maxDiffPixels: 100
		})

		// Reload page
		await page.reload()
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
		await page.waitForSelector('text=Properties', { state: 'visible' })

		// Take second screenshot
		await expect(headerCard).toHaveScreenshot('header-load-2.png', {
			maxDiffPixels: 100
		})
	})
})

test.describe('Properties Page Header - Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
		await page.goto('/properties')
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
		await page.waitForSelector('text=Properties', { state: 'visible' })
	})

	test('should have proper heading hierarchy', async ({ page }) => {
		// Check for h1 heading
		const h1 = page.getByRole('heading', { level: 1, name: 'Properties' })
		await expect(h1).toBeVisible()
	})

	test('should have accessible button labels', async ({ page }) => {
		// Check Bulk Import button
		const bulkImportButton = page.getByRole('button', { name: /bulk import/i })
		await expect(bulkImportButton).toBeVisible()
		await expect(bulkImportButton).toHaveAccessibleName(/bulk import/i)

		// Check New Property button
		const newPropertyButton = page.getByRole('link', { name: /new property/i })
		await expect(newPropertyButton).toBeVisible()
		await expect(newPropertyButton).toHaveAccessibleName(/new property/i)
	})

	test('should have sufficient color contrast', async ({ page }) => {
		// This is a basic check - for full contrast testing, use axe-core
		const title = page.getByRole('heading', { name: 'Properties' })

		// Get computed styles
		const color = await title.evaluate(el => {
			return window.getComputedStyle(el).color
		})

		// Verify color is not transparent or white (basic check)
		expect(color).not.toBe('rgba(0, 0, 0, 0)')
		expect(color).not.toBe('rgb(255, 255, 255)')
	})

	test('should have keyboard navigable buttons', async ({ page }) => {
		// Focus on first button
		await page.keyboard.press('Tab')

		// Check if Bulk Import button is focused
		const bulkImportButton = page.getByRole('button', { name: /bulk import/i })
		await expect(bulkImportButton).toBeFocused()

		// Tab to next button
		await page.keyboard.press('Tab')

		// Check if New Property button is focused
		const newPropertyButton = page.getByRole('link', { name: /new property/i })
		await expect(newPropertyButton).toBeFocused()
	})
})
