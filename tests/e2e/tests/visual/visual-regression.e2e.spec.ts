import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
	test.describe.configure({ mode: 'serial' })

	test('login page', async ({ page }) => {
		await page.goto('/auth/login')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveScreenshot('login-page.png', {
			maxDiffPixelRatio: 0.01,
			fullPage: true
		})
	})

	test('owner dashboard', async ({ page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		// Wait for charts and dynamic content to render
		await page.waitForTimeout(2000)
		await expect(page).toHaveScreenshot('owner-dashboard.png', {
			maxDiffPixelRatio: 0.01,
			fullPage: true
		})
	})

	test('properties list', async ({ page }) => {
		await page.goto('/dashboard/properties')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)
		await expect(page).toHaveScreenshot('properties-list.png', {
			maxDiffPixelRatio: 0.01,
			fullPage: true
		})
	})

	test('tenant dashboard', async ({ page }) => {
		await page.goto('/tenant')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)
		await expect(page).toHaveScreenshot('tenant-dashboard.png', {
			maxDiffPixelRatio: 0.01,
			fullPage: true
		})
	})
})
