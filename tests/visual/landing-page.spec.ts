import { expect, test } from '@playwright/test'

test.describe('Landing Page Visual Regression', () => {
	test('should match landing page snapshot in light mode', async ({ page }) => {
		// Navigate to landing page
		await page.goto('http://localhost:3005')

		// Wait for page to fully load including CSS and fonts
		await page.waitForLoadState('networkidle')

		// Wait for any animations to settle
		await page.waitForTimeout(2000)

		// Take full page screenshot
		await expect(page).toHaveScreenshot('landing-page-light.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('should match landing page snapshot in dark mode', async ({ page }) => {
		// Navigate to landing page
		await page.goto('http://localhost:3005')

		// Wait for page to load
		await page.waitForLoadState('networkidle')

		// Switch to dark mode (if theme toggle exists)
		const themeToggle = page.locator('[data-testid="theme-toggle"]')
		if (await themeToggle.isVisible()) {
			await themeToggle.click()
			await page.waitForTimeout(500) // Wait for theme transition
		} else {
			// Manually add dark class to html element
			await page.evaluate(() => {
				document.documentElement.classList.add('dark')
			})
		}

		// Wait for dark mode to apply
		await page.waitForTimeout(1000)

		// Take full page screenshot
		await expect(page).toHaveScreenshot('landing-page-dark.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('should match mobile landing page snapshot', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 812 })

		// Navigate to landing page
		await page.goto('http://localhost:3005')

		// Wait for page to load
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Take full page screenshot
		await expect(page).toHaveScreenshot('landing-page-mobile.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('should capture current landing page state for debugging', async ({
		page
	}) => {
		// Navigate to landing page
		await page.goto('http://localhost:3005')

		// Wait for page to load
		await page.waitForLoadState('networkidle')

		// Capture console logs
		const logs: string[] = []
		page.on('console', msg => {
			logs.push(`[${msg.type()}] ${msg.text()}`)
		})

		// Check page content
		const title = await page.title()
		const hasContent = await page.locator('body').isVisible()

		console.log('Page Title:', title)
		console.log('Has Body Content:', hasContent)
		console.log('Console Logs:', logs.join('\n'))

		// Screenshot removed - visual debugging no longer needed

		// Basic content checks
		expect(title).toBeTruthy()
		expect(hasContent).toBe(true)
	})
})
