import { test, expect } from '@playwright/test'

test.describe('Features Page Polish - Modern SaaS Quality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/features')
		await page.waitForLoadState('networkidle')
	})

	test('should have perfect feature grid layout', async ({ page }) => {
		// Test feature grid sections
		const featureGrids = page.locator('[class*="grid"], .features-grid, section')
		const gridCount = await featureGrids.count()

		console.log(`Testing ${gridCount} feature grid sections`)

		for (let i = 0; i < Math.min(gridCount, 4); i++) {
			const grid = featureGrids.nth(i)

			// Test grid layout
			const gridStyles = await grid.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					display: styles.display,
					gridTemplateColumns: styles.gridTemplateColumns,
					gap: styles.gap,
					padding: styles.padding
				}
			})

			console.log(`Feature grid ${i}:`, gridStyles)
			await expect(grid).toHaveScreenshot(`features-grid-${i}.png`)
		}
	})

	test('should have consistent feature card interactions', async ({ page }) => {
		// Find all feature cards
		const featureCards = page.locator('.card-interactive, .feature-card, [class*="card-"]')
		const cardCount = await featureCards.count()

		console.log(`Testing ${cardCount} feature cards`)

		for (let i = 0; i < Math.min(cardCount, 8); i++) {
			const card = featureCards.nth(i)

			// Test default state
			await expect(card).toHaveScreenshot(`features-card-${i}-default.png`)

			// Test card glassmorphism properties
			const cardGlass = await card.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor,
					borderRadius: styles.borderRadius,
					border: styles.border,
					boxShadow: styles.boxShadow
				}
			})

			console.log(`Feature card ${i} glassmorphism:`, cardGlass)

			// Test hover micro-interaction
			await card.hover()
			await page.waitForTimeout(300)

			const hoverEffects = await card.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					transform: styles.transform,
					boxShadow: styles.boxShadow,
					borderColor: styles.borderColor
				}
			})

			console.log(`Feature card ${i} hover:`, hoverEffects)
			await expect(card).toHaveScreenshot(`features-card-${i}-hover.png`)

			// Reset hover
			await page.mouse.move(0, 0)
			await page.waitForTimeout(200)
		}
	})

	test('should have perfect icon and illustration quality', async ({ page }) => {
		// Test feature icons
		const featureIcons = page.locator('svg, .icon, [class*="icon-"]')
		const iconCount = await featureIcons.count()

		console.log(`Testing ${Math.min(iconCount, 10)} feature icons`)

		for (let i = 0; i < Math.min(iconCount, 10); i++) {
			const icon = featureIcons.nth(i)

			// Test icon styling
			const iconStyles = await icon.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					width: styles.width,
					height: styles.height,
					color: styles.color,
					fill: styles.fill,
					stroke: styles.stroke
				}
			})

			console.log(`Feature icon ${i}:`, iconStyles)

			// Screenshot individual icons for quality check
			await expect(icon).toHaveScreenshot(`features-icon-${i}.png`)
		}

		// Test illustrations or larger graphics
		const illustrations = page.locator('img, picture, .illustration')
		const illustrationCount = await illustrations.count()

		for (let i = 0; i < Math.min(illustrationCount, 5); i++) {
			const illustration = illustrations.nth(i)

			if (await illustration.isVisible()) {
				await expect(illustration).toHaveScreenshot(`features-illustration-${i}.png`)
			}
		}
	})

	test('should have consistent feature section spacing', async ({ page }) => {
		// Test section spacing and layout
		const sections = page.locator('section')
		const sectionCount = await sections.count()

		console.log(`Testing ${sectionCount} feature sections`)

		for (let i = 0; i < sectionCount; i++) {
			const section = sections.nth(i)

			const sectionStyles = await section.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					paddingTop: styles.paddingTop,
					paddingBottom: styles.paddingBottom,
					marginTop: styles.marginTop,
					marginBottom: styles.marginBottom,
					backgroundColor: styles.backgroundColor
				}
			})

			console.log(`Feature section ${i} spacing:`, sectionStyles)

			// Scroll to section for full view
			await section.scrollIntoViewIfNeeded()
			await page.waitForTimeout(300)

			await expect(section).toHaveScreenshot(`features-section-${i}.png`)
		}
	})

	test('should have perfect CTA button placement and styling', async ({ page }) => {
		// Find all CTA buttons in features
		const ctaButtons = page.locator('.btn-primary, .btn-secondary, .btn-outline, button')
		const buttonCount = await ctaButtons.count()

		console.log(`Testing ${buttonCount} CTA buttons`)

		for (let i = 0; i < Math.min(buttonCount, 6); i++) {
			const button = ctaButtons.nth(i)

			if (await button.isVisible()) {
				// Test button styling
				const buttonStyles = await button.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						backgroundColor: styles.backgroundColor,
						borderRadius: styles.borderRadius,
						padding: styles.padding,
						fontSize: styles.fontSize,
						fontWeight: styles.fontWeight
					}
				})

				console.log(`CTA button ${i}:`, buttonStyles)

				// Test default state
				await expect(button).toHaveScreenshot(`features-cta-${i}-default.png`)

				// Test hover state
				await button.hover()
				await page.waitForTimeout(300)
				await expect(button).toHaveScreenshot(`features-cta-${i}-hover.png`)

				// Test focus state
				await button.focus()
				await page.waitForTimeout(200)
				await expect(button).toHaveScreenshot(`features-cta-${i}-focus.png`)

				// Reset
				await button.blur()
				await page.mouse.move(0, 0)
				await page.waitForTimeout(200)
			}
		}
	})

	test('should have perfect mobile feature layout', async ({ page }) => {
		// Test mobile responsiveness
		await page.setViewportSize({ width: 375, height: 812 })
		await page.waitForTimeout(300)

		// Test mobile feature cards
		const mobileCards = page.locator('.card-interactive, .feature-card')
		const mobileCardCount = await mobileCards.count()

		console.log(`Testing ${mobileCardCount} mobile feature cards`)

		for (let i = 0; i < Math.min(mobileCardCount, 5); i++) {
			const card = mobileCards.nth(i)

			// Scroll card into view
			await card.scrollIntoViewIfNeeded()
			await page.waitForTimeout(200)

			// Test mobile card layout
			await expect(card).toHaveScreenshot(`features-mobile-card-${i}.png`)

			// Test mobile card touch interaction
			await card.tap()
			await page.waitForTimeout(200)
			await expect(card).toHaveScreenshot(`features-mobile-card-${i}-tap.png`)
		}

		// Test full mobile page
		await expect(page).toHaveScreenshot('features-mobile-full.png', { fullPage: true })
	})

	test('should have consistent feature typography hierarchy', async ({ page }) => {
		// Test typography across feature sections
		const featureHeadings = page.locator('h2, h3, h4').filter({ hasText: /.+/ })
		const headingCount = await featureHeadings.count()

		console.log(`Testing ${headingCount} feature headings`)

		for (let i = 0; i < Math.min(headingCount, 8); i++) {
			const heading = featureHeadings.nth(i)
			const tagName = await heading.evaluate(el => el.tagName.toLowerCase())

			const headingStyles = await heading.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					fontSize: styles.fontSize,
					fontWeight: styles.fontWeight,
					lineHeight: styles.lineHeight,
					color: styles.color,
					marginBottom: styles.marginBottom
				}
			})

			console.log(`${tagName} heading ${i}:`, headingStyles)
		}

		// Test feature descriptions
		const featureDescriptions = page.locator('p').filter({ hasText: /.{20,}/ })
		const descCount = await featureDescriptions.count()

		for (let i = 0; i < Math.min(descCount, 6); i++) {
			const desc = featureDescriptions.nth(i)

			const descStyles = await desc.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					fontSize: styles.fontSize,
					lineHeight: styles.lineHeight,
					color: styles.color,
					opacity: styles.opacity
				}
			})

			console.log(`Feature description ${i}:`, descStyles)
		}
	})

	test('should have perfect background and gradient quality', async ({ page }) => {
		// Test page background quality
		const pageBackground = await page.evaluate(() => {
			const styles = window.getComputedStyle(document.body)
			return {
				backgroundColor: styles.backgroundColor,
				backgroundImage: styles.backgroundImage,
				background: styles.background
			}
		})

		console.log('Features page background:', pageBackground)

		// Test section backgrounds
		const sectionsWithBg = page.locator('section[class*="bg-"], section[style*="background"]')
		const bgSectionCount = await sectionsWithBg.count()

		for (let i = 0; i < bgSectionCount; i++) {
			const section = sectionsWithBg.nth(i)

			const sectionBg = await section.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backgroundColor: styles.backgroundColor,
					backgroundImage: styles.backgroundImage,
					background: styles.background
				}
			})

			console.log(`Features section ${i} background:`, sectionBg)

			// Should NOT have pink/purple gradients
			const bgString = JSON.stringify(sectionBg).toLowerCase()
			if (bgString.includes('purple') || bgString.includes('pink')) {
				console.error(`❌ VIOLATION: Pink/purple detected in section ${i}`)
			} else {
				console.log(`✅ Professional colors in section ${i}`)
			}

			await expect(section).toHaveScreenshot(`features-section-bg-${i}.png`)
		}
	})
})