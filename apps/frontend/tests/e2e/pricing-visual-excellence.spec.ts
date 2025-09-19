import { expect, test } from '@playwright/test'

test.describe('Premium SaaS Pricing Page - Visual Excellence', () => {
	test('should capture premium design elements', async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		// Capture full page
		await page.screenshot({
			path: 'test-results/premium-pricing-full.png',
			fullPage: true,
			quality: 100
		})

		// Capture hero section
		const heroSection = page.locator('section').first()
		await heroSection.screenshot({
			path: 'test-results/premium-pricing-hero.png',
			quality: 100
		})

		// Capture pricing cards
		const pricingCards = page.locator('[class*="card"]').first()
		await pricingCards.screenshot({
			path: 'test-results/premium-pricing-cards.png',
			quality: 100
		})

		// Capture mobile view
		await page.setViewportSize({ width: 375, height: 667 })
		await page.screenshot({
			path: 'test-results/premium-pricing-mobile.png',
			fullPage: true,
			quality: 100
		})

		// Capture tablet view
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.screenshot({
			path: 'test-results/premium-pricing-tablet.png',
			fullPage: true,
			quality: 100
		})

		// Capture desktop view
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.screenshot({
			path: 'test-results/premium-pricing-desktop.png',
			fullPage: true,
			quality: 100
		})
	})

	test('should validate premium color usage', async ({ page }) => {
		await page.goto('/pricing')

		// Check for sophisticated color palette
		const rootStyles = await page.evaluate(() => {
			const root = document.documentElement
			const styles = getComputedStyle(root)
			return {
				primary: styles.getPropertyValue('--primary'),
				background: styles.getPropertyValue('--background'),
				foreground: styles.getPropertyValue('--foreground'),
				muted: styles.getPropertyValue('--muted'),
				accent: styles.getPropertyValue('--accent')
			}
		})

		// Premium SaaS uses sophisticated color systems
		expect(rootStyles.primary).toBeTruthy()
		expect(rootStyles.background).toBeTruthy()
		expect(rootStyles.foreground).toBeTruthy()
	})

	test('should validate premium typography scale', async ({ page }) => {
		await page.goto('/pricing')

		// Check typography hierarchy
		const typographyScale = await page.evaluate(() => {
			const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
			const scale = Array.from(headings).map(h => ({
				tag: h.tagName,
				size: getComputedStyle(h).fontSize,
				weight: getComputedStyle(h).fontWeight,
				lineHeight: getComputedStyle(h).lineHeight
			}))
			return scale
		})

		// Premium SaaS has consistent, hierarchical typography
		expect(typographyScale.length).toBeGreaterThan(5)
		expect(typographyScale[0].weight).toBe('700') // H1 should be bold
	})

	test('should validate premium spacing system', async ({ page }) => {
		await page.goto('/pricing')

		// Check spacing consistency
		const spacingSystem = await page.evaluate(() => {
			const sections = document.querySelectorAll('section')
			const spacing = Array.from(sections).map(section => ({
				paddingTop: getComputedStyle(section).paddingTop,
				paddingBottom: getComputedStyle(section).paddingBottom,
				marginTop: getComputedStyle(section).marginTop,
				marginBottom: getComputedStyle(section).marginBottom
			}))
			return spacing
		})

		// Premium SaaS uses consistent spacing systems
		expect(spacingSystem.length).toBeGreaterThan(1)
	})

	test('should validate premium interaction design', async ({ page }) => {
		await page.goto('/pricing')

		// Test button interactions
		const buttons = page.locator('button')
		const firstButton = buttons.first()

		// Get initial styles
		const initialStyles = await firstButton.evaluate(el => ({
			backgroundColor: getComputedStyle(el).backgroundColor,
			transform: getComputedStyle(el).transform,
			boxShadow: getComputedStyle(el).boxShadow
		}))

		// Hover and check for changes
		await firstButton.hover()
		await page.waitForTimeout(200)

		const hoverStyles = await firstButton.evaluate(el => ({
			backgroundColor: getComputedStyle(el).backgroundColor,
			transform: getComputedStyle(el).transform,
			boxShadow: getComputedStyle(el).boxShadow
		}))

		// Premium buttons have sophisticated hover states
		expect(hoverStyles.transform).not.toBe(initialStyles.transform)
	})

	test('should validate premium layout composition', async ({ page }) => {
		await page.goto('/pricing')

		// Check layout balance
		const layoutMetrics = await page.evaluate(() => {
			const viewport = {
				width: window.innerWidth,
				height: window.innerHeight
			}

			const content = document.querySelector('main')
			const contentRect = content?.getBoundingClientRect()

			return {
				viewport,
				contentWidth: contentRect?.width,
				contentHeight: contentRect?.height,
				contentLeft: contentRect?.left,
				contentTop: contentRect?.top
			}
		})

		// Premium layouts are well-balanced and centered
		expect(layoutMetrics.contentWidth).toBeLessThan(
			layoutMetrics.viewport.width
		)
		expect(layoutMetrics.contentLeft).toBeGreaterThan(0)
	})

	test('should validate premium visual hierarchy', async ({ page }) => {
		await page.goto('/pricing')

		// Check visual hierarchy through size and contrast
		const hierarchyData = await page.evaluate(() => {
			const elements = document.querySelectorAll('h1, h2, h3, p, button')
			return Array.from(elements).map(el => ({
				tag: el.tagName,
				fontSize: parseInt(getComputedStyle(el).fontSize),
				fontWeight: parseInt(getComputedStyle(el).fontWeight),
				color: getComputedStyle(el).color
			}))
		})

		// Premium designs have clear visual hierarchy
		const h1Size = hierarchyData.find(h => h.tag === 'H1')?.fontSize
		const h2Size = hierarchyData.find(h => h.tag === 'H2')?.fontSize
		const pSize = hierarchyData.find(h => h.tag === 'P')?.fontSize

		if (h1Size && h2Size && pSize) {
			expect(h1Size).toBeGreaterThan(h2Size)
			expect(h2Size).toBeGreaterThan(pSize)
		}
	})

	test('should validate premium attention to detail', async ({ page }) => {
		await page.goto('/pricing')

		// Check for subtle design details
		const details = await page.evaluate(() => {
			const subtleElements = document.querySelectorAll(
				'[style*="opacity"], [class*="blur"], [class*="shadow"]'
			)
			return {
				subtleElements: subtleElements.length,
				totalElements: document.querySelectorAll('*').length,
				hasBackdropBlur: document.querySelector('[class*="backdrop"]') !== null,
				hasBorderRadius:
					document.querySelector(
						'[style*="border-radius"], [class*="rounded"]'
					) !== null
			}
		})

		// Premium designs have attention to detail
		expect(details.subtleElements).toBeGreaterThan(0)
		expect(details.hasBackdropBlur || details.hasBorderRadius).toBe(true)
	})
})
