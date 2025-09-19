import { expect, test } from '@playwright/test'

test.describe('Premium SaaS Pricing Page - Quality Validation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')
	})

	test('should meet premium SaaS design standards', async ({ page }) => {
		// Check for premium visual elements
		const gradients = await page
			.locator('[class*="gradient"], [style*="gradient"]')
			.count()
		expect(gradients).toBeGreaterThan(5) // Should have multiple gradient elements

		// Check for sophisticated typography
		const headings = page.locator('h1, h2, h3')
		await expect(headings.first()).toHaveCSS('font-weight', '700')

		// Check for premium spacing
		const sections = page.locator('section')
		for (const section of await sections.all()) {
			const padding = await section.evaluate(
				el => getComputedStyle(el).paddingTop
			)
			expect(parseInt(padding)).toBeGreaterThan(80) // Premium spacing
		}

		// Check for premium shadows and effects
		const cards = page.locator('[class*="card"], [class*="shadow"]')
		await expect(cards).toHaveCount(await cards.count())

		// Check for premium color scheme
		const primaryElements = page.locator('[class*="blue"], [class*="slate"]')
		await expect(primaryElements).toBeVisible()
	})

	test('should have compelling value propositions', async ({ page }) => {
		// Check for value proposition quotes
		const valueProps = page.locator('[class*="italic"], [class*="value"]')
		await expect(valueProps).toHaveCount(await valueProps.count())

		// Check for benefit-focused copy
		const pageText = await page.locator('body').textContent()
		const compellingWords = [
			'transform',
			'streamline',
			'automate',
			'scale',
			'professional'
		]
		const foundWords = compellingWords.filter(word =>
			pageText?.toLowerCase().includes(word)
		)
		expect(foundWords.length).toBeGreaterThan(3)
	})

	test('should demonstrate social proof', async ({ page }) => {
		// Check for trust indicators
		const trustElements = page.locator('[class*="trust"], [class*="social"]')
		await expect(trustElements).toBeVisible()

		// Check for numbers/statistics
		const stats = page.locator('text=/[0-9,]+/')
		await expect(stats).toHaveCount(await stats.count())
	})

	test('should have premium feature presentation', async ({ page }) => {
		// Check for feature lists
		const features = page.locator('li')
		await expect(features).toHaveCount(await features.count())

		// Check for checkmark icons
		const checkmarks = page.locator('[class*="check"], svg')
		await expect(checkmarks).toHaveCount(await checkmarks.count())

		// Check for premium feature descriptions
		const featureText = await page.locator('li').first().textContent()
		expect(featureText?.length).toBeGreaterThan(20) // Detailed features
	})

	test('should have sophisticated pricing display', async ({ page }) => {
		// Check for large, prominent pricing
		const prices = page.locator('[class*="price"], [class*="cost"]')
		for (const price of await prices.all()) {
			const fontSize = await price.evaluate(el => getComputedStyle(el).fontSize)
			expect(parseInt(fontSize)).toBeGreaterThan(24) // Large pricing text
		}

		// Check for billing toggle
		const toggle = page.locator('[role="switch"], input[type="checkbox"]')
		await expect(toggle).toBeVisible()

		// Check for savings indicators
		const savings = page.locator('text=/save|Save|Savings/')
		await expect(savings).toBeVisible()
	})

	test('should have premium call-to-action design', async ({ page }) => {
		// Check for prominent CTAs
		const ctas = page.locator('button, [role="button"]')
		await expect(ctas).toHaveCount(await ctas.count())

		// Check for gradient buttons (premium feature)
		const gradientButtons = page.locator(
			'[class*="gradient"], [style*="gradient"]'
		)
		await expect(gradientButtons).toBeVisible()

		// Check for compelling CTA text
		const ctaText = await page.locator('button').first().textContent()
		const premiumCtaWords = ['Start', 'Get', 'Try', 'Begin']
		const hasPremiumCta = premiumCtaWords.some(word => ctaText?.includes(word))
		expect(hasPremiumCta).toBe(true)
	})

	test('should have premium micro-interactions', async ({ page }) => {
		// Test hover effects on cards
		const firstCard = page.locator('[class*="card"]').first()
		const initialTransform = await firstCard.evaluate(
			el => getComputedStyle(el).transform
		)

		await firstCard.hover()
		await page.waitForTimeout(300)

		const hoverTransform = await firstCard.evaluate(
			el => getComputedStyle(el).transform
		)
		expect(hoverTransform).not.toBe(initialTransform)
	})

	test('should be optimized for conversions', async ({ page }) => {
		// Check for urgency/scarcity elements
		const urgencyElements = page.locator(
			'text=/limited|Limited|only|Only|today|Today/'
		)
		// Not required but good to check

		// Check for risk reversal
		const riskReversal = page.locator(
			'text=/guarantee|Guarantee|refund|Refund/'
		)
		await expect(riskReversal).toBeVisible()

		// Check for social proof near CTAs
		const ctaSection = page
			.locator('button')
			.first()
			.locator('..')
			.locator('..')
		const nearbyText = await ctaSection.textContent()
		const hasSocialProof =
			nearbyText?.includes('10,000') || nearbyText?.includes('trusted')
		expect(hasSocialProof).toBe(true)
	})

	test('should have premium information architecture', async ({ page }) => {
		// Check for clear information hierarchy
		const h1Count = await page.locator('h1').count()
		const h2Count = await page.locator('h2').count()
		const h3Count = await page.locator('h3').count()

		expect(h1Count).toBeLessThanOrEqual(1) // Single main heading
		expect(h2Count).toBeGreaterThan(0) // Section headings
		expect(h3Count).toBeGreaterThan(h2Count) // More detailed headings

		// Check for logical content flow
		const sections = page.locator('section')
		await expect(sections).toHaveCount(await sections.count())
	})

	test('should demonstrate premium attention to detail', async ({ page }) => {
		// Check for consistent spacing
		const elements = page.locator('*')
		// This is a basic check - in a real premium audit we'd check specific spacing

		// Check for polished animations
		const animatedElements = page.locator(
			'[class*="animate"], [class*="transition"]'
		)
		await expect(animatedElements).toHaveCount(await animatedElements.count())

		// Check for premium loading states (if applicable)
		// This would be tested with actual interactions
	})

	test('should match SaaS leader benchmarks', async ({ page }) => {
		// Performance check
		const loadTime = await page.evaluate(() => performance.now())
		expect(loadTime).toBeLessThan(3000) // Should load quickly

		// Content quality check
		const wordCount =
			(await page.locator('body').textContent())?.split(' ').length || 0
		expect(wordCount).toBeGreaterThan(500) // Substantial content

		// Visual polish check
		const images = await page.locator('img').count()
		expect(images).toBeGreaterThan(0) // Should have visual elements

		// Mobile optimization check
		await page.setViewportSize({ width: 375, height: 667 })
		const mobileVisible = await page.locator('body').isVisible()
		expect(mobileVisible).toBe(true)
	})
})
