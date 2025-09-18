import { expect, test } from '@playwright/test'

test.describe('Pricing Page Quality Assessment', () => {
	test('should evaluate current pricing page quality', async ({ page }) => {
		// Navigate to pricing page
		await page.goto('http://localhost:3005/pricing')
		await page.waitForLoadState('networkidle')

		// Take screenshot for visual assessment
		await page.screenshot({
			path: 'test-results/current-pricing-page.png',
			fullPage: true
		})

		// Basic checks
		const title = await page.title()
		console.log('Page title:', title)

		// Check for basic elements
		const hasNavbar = (await page.locator('nav').count()) > 0
		const hasPricingSection = (await page.locator('section').count()) > 0
		const hasButtons = (await page.locator('button').count()) > 0

		console.log('Has navbar:', hasNavbar)
		console.log('Has pricing section:', hasPricingSection)
		console.log('Has buttons:', hasButtons)

		// Check for text content
		const pageText = await page.locator('body').textContent()
		console.log(
			'Page contains pricing text:',
			pageText?.toLowerCase().includes('pricing')
		)
		console.log(
			'Page contains plan text:',
			pageText?.toLowerCase().includes('plan')
		)

		// Check for visual elements
		const images = await page.locator('img').count()
		const headings = await page.locator('h1, h2, h3').count()

		console.log('Number of images:', images)
		console.log('Number of headings:', headings)

		// Check for responsive design
		await page.setViewportSize({ width: 375, height: 667 })
		await page.screenshot({
			path: 'test-results/current-pricing-mobile.png',
			fullPage: true
		})

		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.screenshot({
			path: 'test-results/current-pricing-desktop.png',
			fullPage: true
		})

		// Always pass this test - it's for assessment
		expect(true).toBe(true)
	})
})
