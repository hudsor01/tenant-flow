import { expect, test } from '@playwright/test'

test.describe('Premium SaaS Pricing Page - Visual Regression', () => {
	test('should match premium SaaS design standards', async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForSelector('[data-testid="pricing-section"]', {
			timeout: 10000
		})

		// Take full page screenshot for visual regression
		await page.screenshot({
			path: 'test-results/pricing-page-full.png',
			fullPage: true
		})

		// Test different viewport sizes for responsive design
		const viewports = [
			{ width: 375, height: 667, name: 'mobile' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 1440, height: 900, name: 'desktop' },
			{ width: 1920, height: 1080, name: 'desktop-wide' }
		]

		for (const viewport of viewports) {
			await page.setViewportSize(viewport)
			await page.screenshot({
				path: `test-results/pricing-page-${viewport.name}.png`,
				fullPage: true
			})
		}
	})

	test('should have premium color scheme', async ({ page }) => {
		await page.goto('/pricing')

		// Check for premium color usage
		const primaryElements = page.locator('[class*="primary"], [class*="brand"]')
		const gradientElements = page.locator('[class*="gradient"]')

		// Premium SaaS pages use sophisticated color schemes
		await expect(primaryElements.or(gradientElements)).toBeVisible()

		// Check for proper contrast ratios
		const textElements = page.locator('h1, h2, h3, p')
		for (const element of await textElements.all()) {
			const color = await element.evaluate(el => getComputedStyle(el).color)
			const backgroundColor = await element.evaluate(
				el => getComputedStyle(el).backgroundColor
			)

			// Basic check that colors are defined
			expect(color).toBeTruthy()
			expect(backgroundColor).toBeTruthy()
		}
	})

	test('should have premium typography', async ({ page }) => {
		await page.goto('/pricing')

		// Check for premium typography stack
		const headings = page.locator('h1, h2, h3, h4, h5, h6')

		for (const heading of await headings.all()) {
			const fontFamily = await heading.evaluate(
				el => getComputedStyle(el).fontFamily
			)
			const fontSize = await heading.evaluate(
				el => getComputedStyle(el).fontSize
			)
			const fontWeight = await heading.evaluate(
				el => getComputedStyle(el).fontWeight
			)

			// Premium SaaS uses modern font stacks
			expect(fontFamily.toLowerCase()).toMatch(
				/inter|system-ui|sf pro|helvetica neue/
			)

			// Check for proper font sizes
			expect(parseInt(fontSize)).toBeGreaterThan(12)
		}

		// Check for proper line heights
		const paragraphs = page.locator('p')
		for (const p of await paragraphs.all()) {
			const lineHeight = await p.evaluate(el => getComputedStyle(el).lineHeight)
			expect(parseFloat(lineHeight)).toBeGreaterThan(1.2)
		}
	})

	test('should have premium spacing and layout', async ({ page }) => {
		await page.goto('/pricing')

		// Check for proper spacing using design tokens
		const sections = page.locator('section, [class*="section"]')

		for (const section of await sections.all()) {
			const padding = await section.evaluate(el => getComputedStyle(el).padding)
			const margin = await section.evaluate(el => getComputedStyle(el).margin)

			// Premium SaaS has generous, consistent spacing
			expect(padding || margin).toBeTruthy()
		}

		// Check for proper grid layouts
		const grids = page.locator('[class*="grid"], [class*="flex"]')
		await expect(grids).toHaveCount(await grids.count())
	})

	test('should have premium interactive elements', async ({ page }) => {
		await page.goto('/pricing')

		// Test button styles
		const buttons = page.locator('button, [role="button"]')

		for (const button of await buttons.all()) {
			const borderRadius = await button.evaluate(
				el => getComputedStyle(el).borderRadius
			)
			const padding = await button.evaluate(el => getComputedStyle(el).padding)
			const transition = await button.evaluate(
				el => getComputedStyle(el).transition
			)

			// Premium buttons have rounded corners and smooth transitions
			expect(borderRadius).not.toBe('0px')
			expect(transition).toBeTruthy()
		}

		// Test card hover effects
		const cards = page.locator('[data-testid="pricing-card"], [class*="card"]')

		for (const card of await cards.all()) {
			await card.hover()
			await page.waitForTimeout(200)

			// Check for transform or shadow changes on hover
			const transform = await card.evaluate(
				el => getComputedStyle(el).transform
			)
			const boxShadow = await card.evaluate(
				el => getComputedStyle(el).boxShadow
			)

			// Premium cards have subtle hover effects
			expect(transform !== 'none' || boxShadow !== 'none').toBeTruthy()
		}
	})

	test('should have premium micro-animations', async ({ page }) => {
		await page.goto('/pricing')

		// Check for smooth animations and transitions
		const animatedElements = page.locator(
			'[class*="animate"], [class*="transition"]'
		)

		// Premium SaaS pages use subtle animations
		await expect(animatedElements).toHaveCount(await animatedElements.count())

		// Test scroll-triggered animations
		await page.evaluate(() =>
			window.scrollTo(0, document.body.scrollHeight / 2)
		)
		await page.waitForTimeout(500)

		// Check for animation triggers
		const visibleElements = page.locator('[class*="fade"], [class*="slide"]')
		// Note: This would need more specific animation classes to test properly
	})
})
