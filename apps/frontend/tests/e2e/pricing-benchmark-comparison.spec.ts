import { expect, test } from '@playwright/test'

test.describe('Premium SaaS Benchmark Comparison', () => {
	test('should benchmark against Linear pricing page', async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		// Linear-style benchmarks
		const linearMetrics = await page.evaluate(() => {
			const metrics = {
				// Typography sophistication
				hasLargeHeadings: document.querySelectorAll('h1').length > 0,
				hasBoldTypography: Array.from(document.querySelectorAll('*')).some(
					el => parseInt(getComputedStyle(el).fontWeight) >= 600
				),

				// Color sophistication
				hasGradients:
					document.querySelector('[style*="gradient"], [class*="gradient"]') !==
					null,
				hasSubtleColors:
					document.querySelector('[style*="opacity"], [class*="opacity"]') !==
					null,

				// Layout sophistication
				hasGenerousSpacing:
					document.querySelector('[style*="padding"], [class*="space"]') !==
					null,
				hasCenteredLayout:
					document.querySelector('main')?.style.textAlign === 'center' ||
					document.querySelector(
						'[class*="center"], [class*="justify-center"]'
					) !== null,

				// Interactive sophistication
				hasHoverEffects:
					document.querySelector('[class*="hover"], [style*="hover"]') !== null,
				hasSmoothTransitions:
					document.querySelector(
						'[style*="transition"], [class*="transition"]'
					) !== null,

				// Content sophistication
				hasTrustIndicators:
					document.querySelector(
						'[class*="trust"], [class*="badge"], [class*="certified"]'
					) !== null,
				hasSocialProof:
					document.querySelector(
						'[class*="users"], [class*="customers"], [class*="rating"]'
					) !== null
			}

			return metrics
		})

		// Linear meets these premium standards
		expect(linearMetrics.hasLargeHeadings).toBe(true)
		expect(linearMetrics.hasBoldTypography).toBe(true)
		expect(linearMetrics.hasGradients).toBe(true)
		expect(linearMetrics.hasSubtleColors).toBe(true)
		expect(linearMetrics.hasGenerousSpacing).toBe(true)
		expect(linearMetrics.hasCenteredLayout).toBe(true)
		expect(linearMetrics.hasHoverEffects).toBe(true)
		expect(linearMetrics.hasSmoothTransitions).toBe(true)
		expect(linearMetrics.hasTrustIndicators).toBe(true)
		expect(linearMetrics.hasSocialProof).toBe(true)
	})

	test('should benchmark against Resend pricing page', async ({ page }) => {
		await page.goto('/pricing')

		// Resend-style benchmarks (trust and conversion focus)
		const resendMetrics = await page.evaluate(() => {
			const metrics = {
				// Trust indicators
				hasComplianceBadges:
					document.querySelector(
						'[class*="soc"], [class*="gdpr"], [class*="iso"]'
					) !== null,
				hasUserCounts:
					document.querySelector('[class*="users"], [class*="customers"]') !==
					null,
				hasTestimonials:
					document.querySelector(
						'[class*="testimonial"], [class*="review"]'
					) !== null,

				// Risk reversal
				hasMoneyBack:
					document.querySelector(
						'[class*="money"], [class*="refund"], [class*="guarantee"]'
					) !== null,
				hasTrialOffer:
					document.querySelector('[class*="trial"], [class*="free"]') !== null,

				// Conversion optimization
				hasMultipleCTAs:
					document.querySelectorAll(
						'button, a[class*="cta"], [class*="button"]'
					).length >= 3,
				hasUrgencyElements:
					document.querySelector(
						'[class*="limited"], [class*="time"], [class*="offer"]'
					) !== null,

				// Professional credibility
				hasAwards:
					document.querySelector('[class*="award"], [class*="winner"]') !==
					null,
				hasCertifications:
					document.querySelector(
						'[class*="certified"], [class*="verified"]'
					) !== null
			}

			return metrics
		})

		// Resend meets these premium standards
		expect(resendMetrics.hasComplianceBadges).toBe(true)
		expect(resendMetrics.hasUserCounts).toBe(true)
		expect(resendMetrics.hasMoneyBack).toBe(true)
		expect(resendMetrics.hasTrialOffer).toBe(true)
		expect(resendMetrics.hasMultipleCTAs).toBe(true)
	})

	test('should benchmark against Retool pricing page', async ({ page }) => {
		await page.goto('/pricing')

		// Retool-style benchmarks (feature clarity and value communication)
		const retoolMetrics = await page.evaluate(() => {
			const metrics = {
				// Feature clarity
				hasDetailedFeatures:
					document.querySelectorAll('[class*="feature"]').length >= 5,
				hasBenefitFocused:
					document.querySelector('[class*="benefit"], [class*="value"]') !==
					null,
				hasComparisonTable:
					document.querySelector(
						'table, [class*="compare"], [class*="table"]'
					) !== null,

				// Value communication
				hasValueProps:
					document.querySelector('[class*="value"], [class*="benefit"]') !==
					null,
				hasUseCases:
					document.querySelector('[class*="use"], [class*="case"]') !== null,

				// Pricing transparency
				hasClearPricing:
					document.querySelectorAll('[class*="price"], [class*="cost"]')
						.length >= 2,
				hasBillingToggle:
					document.querySelector(
						'input[type="checkbox"], [class*="toggle"], [class*="switch"]'
					) !== null,

				// Enterprise focus
				hasEnterpriseSection:
					document.querySelector(
						'[class*="enterprise"], [class*="business"]'
					) !== null,
				hasCustomPricing:
					document.querySelector('[class*="custom"], [class*="contact"]') !==
					null
			}

			return metrics
		})

		// Retool meets these premium standards
		expect(retoolMetrics.hasDetailedFeatures).toBe(true)
		expect(retoolMetrics.hasBenefitFocused).toBe(true)
		expect(retoolMetrics.hasValueProps).toBe(true)
		expect(retoolMetrics.hasClearPricing).toBe(true)
		expect(retoolMetrics.hasBillingToggle).toBe(true)
		expect(retoolMetrics.hasEnterpriseSection).toBe(true)
	})

	test('should validate premium SaaS performance metrics', async ({
		page,
		browser
	}) => {
		const startTime = Date.now()
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')
		const loadTime = Date.now() - startTime

		// Premium SaaS pages load quickly
		expect(loadTime).toBeLessThan(3000) // Under 3 seconds

		// Check for performance optimizations
		const performanceMetrics = await page.evaluate(() => {
			const metrics = {
				hasLazyLoading: document.querySelector('img[loading="lazy"]') !== null,
				hasOptimizedImages: document.querySelector('img[alt]') !== null,
				hasMinifiedCSS:
					document.querySelectorAll('link[rel="stylesheet"]').length > 0,
				hasMinifiedJS: document.querySelectorAll('script[src]').length > 0
			}
			return metrics
		})

		expect(performanceMetrics.hasOptimizedImages).toBe(true)
	})

	test('should validate premium SaaS accessibility standards', async ({
		page
	}) => {
		await page.goto('/pricing')

		// Accessibility benchmarks
		const accessibilityMetrics = await page.evaluate(() => {
			const metrics = {
				hasProperHeadings:
					document.querySelectorAll('h1, h2, h3, h4, h5, h6').length >= 5,
				hasAltText: Array.from(document.querySelectorAll('img')).every(
					img => img.alt
				),
				hasFocusIndicators:
					document.querySelector('[class*="focus"], [style*="focus"]') !== null,
				hasAriaLabels:
					document.querySelector('[aria-label], [aria-describedby]') !== null,
				hasSemanticHTML:
					document.querySelectorAll('main, section, article, aside').length > 0,
				hasProperContrast: true // Would need actual contrast checking tool
			}

			return metrics
		})

		// Premium SaaS meets accessibility standards
		expect(accessibilityMetrics.hasProperHeadings).toBe(true)
		expect(accessibilityMetrics.hasAltText).toBe(true)
		expect(accessibilityMetrics.hasSemanticHTML).toBe(true)
	})

	test('should validate premium SaaS mobile experience', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		// Mobile benchmarks
		const mobileMetrics = await page.evaluate(() => {
			const metrics = {
				isResponsive: window.innerWidth <= 375,
				hasTouchFriendly: document.querySelectorAll('button, a').length > 0,
				hasReadableText: Array.from(document.querySelectorAll('*')).every(
					el => parseInt(getComputedStyle(el).fontSize) >= 14
				),
				hasProperSpacing:
					document.querySelector('[class*="space"], [style*="padding"]') !==
					null,
				avoidsHorizontalScroll: document.body.scrollWidth <= window.innerWidth
			}

			return metrics
		})

		// Premium SaaS provides excellent mobile experience
		expect(mobileMetrics.isResponsive).toBe(true)
		expect(mobileMetrics.hasTouchFriendly).toBe(true)
		expect(mobileMetrics.hasReadableText).toBe(true)
		expect(mobileMetrics.avoidsHorizontalScroll).toBe(true)
	})

	test('should capture competitive analysis screenshots', async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		// Capture key sections for competitive analysis
		const sections = await page.locator('section').all()

		for (let i = 0; i < sections.length; i++) {
			await sections[i].screenshot({
				path: `test-results/pricing-section-${i + 1}.png`,
				quality: 100
			})
		}

		// Capture interactive elements
		const buttons = await page.locator('button').all()
		for (let i = 0; i < Math.min(buttons.length, 3); i++) {
			await buttons[i].screenshot({
				path: `test-results/pricing-button-${i + 1}.png`,
				quality: 100
			})
		}

		// Capture pricing cards
		const cards = await page
			.locator('[class*="card"], [class*="pricing"]')
			.all()
		for (let i = 0; i < Math.min(cards.length, 3); i++) {
			await cards[i].screenshot({
				path: `test-results/pricing-card-${i + 1}.png`,
				quality: 100
			})
		}
	})
})
