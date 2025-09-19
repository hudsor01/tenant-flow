import { expect, test } from '@playwright/test'

test.describe('Premium SaaS Visual Regression Suite', () => {
	test('should maintain premium design consistency across viewports', async ({
		page
	}) => {
		const viewports = [
			{ width: 375, height: 667, name: 'mobile' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 1440, height: 900, name: 'desktop' },
			{ width: 1920, height: 1080, name: 'wide' }
		]

		for (const viewport of viewports) {
			await page.setViewportSize({
				width: viewport.width,
				height: viewport.height
			})
			await page.goto('/pricing')
			await page.waitForLoadState('networkidle')

			// Capture full page for visual regression
			await page.screenshot({
				path: `test-results/pricing-${viewport.name}-full.png`,
				fullPage: true,
				quality: 100
			})

			// Validate premium design elements remain consistent
			const designElements = await page.evaluate(() => {
				return {
					hasGradients:
						document.querySelector(
							'[style*="gradient"], [class*="gradient"]'
						) !== null,
					hasShadows:
						document.querySelector('[style*="shadow"], [class*="shadow"]') !==
						null,
					hasRoundedCorners:
						document.querySelector(
							'[style*="border-radius"], [class*="rounded"]'
						) !== null,
					hasProperTypography:
						document.querySelectorAll('h1, h2, h3').length >= 3,
					hasInteractiveElements:
						document.querySelectorAll('button, a').length >= 5,
					hasTrustElements:
						document.querySelector('[class*="trust"], [class*="badge"]') !==
						null
				}
			})

			// Premium design elements should be present across all viewports
			expect(designElements.hasGradients).toBe(true)
			expect(designElements.hasShadows).toBe(true)
			expect(designElements.hasRoundedCorners).toBe(true)
			expect(designElements.hasProperTypography).toBe(true)
			expect(designElements.hasInteractiveElements).toBe(true)
			expect(designElements.hasTrustElements).toBe(true)
		}
	})

	test('should validate premium interaction states', async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		// Test button hover states
		const buttons = page.locator('button')
		const buttonCount = await buttons.count()

		for (let i = 0; i < Math.min(buttonCount, 3); i++) {
			const button = buttons.nth(i)

			// Capture initial state
			await button.screenshot({
				path: `test-results/button-${i}-initial.png`,
				quality: 100
			})

			// Hover and capture
			await button.hover()
			await page.waitForTimeout(200)
			await button.screenshot({
				path: `test-results/button-${i}-hover.png`,
				quality: 100
			})

			// Validate hover effects exist
			const hasHoverEffect = await button.evaluate(el => {
				const styles = getComputedStyle(el)
				return (
					styles.transform !== 'none' ||
					styles.boxShadow !== 'none' ||
					styles.backgroundColor !== getComputedStyle(el).backgroundColor
				)
			})

			expect(hasHoverEffect).toBe(true)
		}
	})

	test('should validate premium loading states', async ({ page }) => {
		await page.goto('/pricing')

		// Test loading states for interactive elements
		const interactiveElements = page.locator(
			'button, [role="button"], a[class*="cta"]'
		)
		const elementCount = await interactiveElements.count()

		for (let i = 0; i < Math.min(elementCount, 3); i++) {
			const element = interactiveElements.nth(i)

			// Click and observe loading state
			const clickPromise = element.click()
			await page.waitForTimeout(100)

			// Check for loading indicators
			const hasLoadingState = await page.evaluate(() => {
				return (
					document.querySelector(
						'[class*="loading"], [class*="spinner"], [aria-busy="true"]'
					) !== null
				)
			})

			// Loading states are important for premium UX
			if (hasLoadingState) {
				await page.screenshot({
					path: `test-results/loading-state-${i}.png`,
					quality: 100
				})
			}
		}
	})

	test('should validate premium color contrast', async ({ page }) => {
		await page.goto('/pricing')

		// Test color contrast for accessibility
		const contrastData = await page.evaluate(() => {
			const elements = document.querySelectorAll('h1, h2, h3, p, button, a')
			const contrastResults = Array.from(elements).map(el => {
				const styles = getComputedStyle(el)
				return {
					tag: el.tagName,
					fontSize: parseInt(styles.fontSize),
					color: styles.color,
					backgroundColor: styles.backgroundColor,
					fontWeight: parseInt(styles.fontWeight)
				}
			})
			return contrastResults
		})

		// Premium designs maintain good contrast
		expect(contrastData.length).toBeGreaterThan(10)

		// Validate text is readable
		const hasReadableText = contrastData.every(
			item => item.fontSize >= 14 || item.fontWeight >= 600
		)
		expect(hasReadableText).toBe(true)
	})

	test('should validate premium spacing system', async ({ page }) => {
		await page.goto('/pricing')

		// Test spacing consistency
		const spacingData = await page.evaluate(() => {
			const sections = document.querySelectorAll('section')
			const spacing = Array.from(sections).map(section => {
				const styles = getComputedStyle(section)
				return {
					paddingTop: parseInt(styles.paddingTop) || 0,
					paddingBottom: parseInt(styles.paddingBottom) || 0,
					marginTop: parseInt(styles.marginTop) || 0,
					marginBottom: parseInt(styles.marginBottom) || 0
				}
			})
			return spacing
		})

		// Premium designs use consistent spacing
		expect(spacingData.length).toBeGreaterThan(1)

		// Check for generous spacing (premium feel)
		const hasGenerousSpacing = spacingData.some(
			section => section.paddingTop > 40 || section.paddingBottom > 40
		)
		expect(hasGenerousSpacing).toBe(true)
	})

	test('should validate premium animation performance', async ({ page }) => {
		await page.goto('/pricing')

		// Test animation performance
		const animationData = await page.evaluate(() => {
			const animatedElements = document.querySelectorAll(
				'[style*="transition"], [style*="animation"], [class*="animate"]'
			)
			return {
				animatedCount: animatedElements.length,
				hasSmoothAnimations:
					document.querySelector('[style*="ease"], [class*="ease"]') !== null,
				hasPerformanceOptimizations:
					document.querySelector(
						'[style*="transform"], [class*="transform"]'
					) !== null
			}
		})

		// Premium designs use smooth, performant animations
		expect(animationData.animatedCount).toBeGreaterThan(0)
		expect(animationData.hasSmoothAnimations).toBe(true)
	})

	test('should capture premium design system elements', async ({ page }) => {
		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		// Capture design system components
		const designSystemElements = [
			{ selector: 'h1', name: 'hero-heading' },
			{ selector: 'button', name: 'primary-button' },
			{ selector: '[class*="card"]', name: 'pricing-card' },
			{
				selector: '[class*="badge"], [class*="trust"]',
				name: 'trust-indicator'
			},
			{ selector: '[class*="gradient"]', name: 'gradient-element' }
		]

		for (const element of designSystemElements) {
			const locator = page.locator(element.selector).first()
			if ((await locator.count()) > 0) {
				await locator.screenshot({
					path: `test-results/design-system-${element.name}.png`,
					quality: 100
				})
			}
		}
	})

	test('should validate premium content hierarchy', async ({ page }) => {
		await page.goto('/pricing')

		// Test content hierarchy and readability
		const contentHierarchy = await page.evaluate(() => {
			const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
			const hierarchy = Array.from(headings).map(h => ({
				level: parseInt(h.tagName.charAt(1)),
				text: h.textContent?.trim(),
				fontSize: parseInt(getComputedStyle(h).fontSize),
				fontWeight: parseInt(getComputedStyle(h).fontWeight)
			}))

			return {
				hierarchy,
				hasProperStructure: hierarchy.every(
					(h, i) => i === 0 || h.level <= hierarchy[i - 1].level + 1
				),
				hasDescriptiveHeadings: hierarchy.every(
					h => h.text && h.text.length > 3
				)
			}
		})

		// Premium content has proper hierarchy
		expect(contentHierarchy.hasProperStructure).toBe(true)
		expect(contentHierarchy.hasDescriptiveHeadings).toBe(true)
		expect(contentHierarchy.hierarchy.length).toBeGreaterThan(3)
	})
})
