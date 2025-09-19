import { test, expect } from '@playwright/test'

test.describe('Homepage Polish - Linear/Supabase Quality Standards', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have perfect hero section polish', async ({ page }) => {
		// Test hero section components individually
		const heroSection = page.locator('section').first()

		// Hero title typography
		const heroTitle = page.locator('h1').first()
		const titleStyles = await heroTitle.evaluate(el => {
			const styles = window.getComputedStyle(el)
			return {
				fontSize: styles.fontSize,
				fontWeight: styles.fontWeight,
				lineHeight: styles.lineHeight,
				letterSpacing: styles.letterSpacing,
				color: styles.color
			}
		})

		console.log('Hero title specs:', titleStyles)
		await expect(heroTitle).toHaveScreenshot('hero-title-typography.png')

		// Hero CTA buttons
		const primaryCTA = page.locator('.btn-primary').first()
		const secondaryCTA = page.locator('.btn-outline, .btn-secondary').first()

		if (await primaryCTA.isVisible()) {
			await expect(primaryCTA).toHaveScreenshot('hero-primary-cta.png')

			// Test hover micro-interaction
			await primaryCTA.hover()
			await page.waitForTimeout(300)
			await expect(primaryCTA).toHaveScreenshot('hero-primary-cta-hover.png')
		}

		if (await secondaryCTA.isVisible()) {
			await expect(secondaryCTA).toHaveScreenshot('hero-secondary-cta.png')
		}

		// Hero background quality
		const heroBackground = await heroSection.evaluate(el => {
			const styles = window.getComputedStyle(el)
			return {
				background: styles.background,
				backgroundImage: styles.backgroundImage,
				backgroundColor: styles.backgroundColor
			}
		})

		console.log('Hero background:', heroBackground)
		await expect(heroSection).toHaveScreenshot('hero-section-full.png')
	})

	test('should have Linear-quality feature cards', async ({ page }) => {
		// Find feature cards
		const featureCards = page.locator('.card-interactive, .feature-card, [class*="card-"]')
		const cardCount = await featureCards.count()

		console.log(`Testing ${cardCount} feature cards`)

		for (let i = 0; i < Math.min(cardCount, 6); i++) {
			const card = featureCards.nth(i)

			// Test default card state
			await expect(card).toHaveScreenshot(`feature-card-${i}-default.png`)

			// Test card glassmorphism
			const cardStyles = await card.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor,
					borderRadius: styles.borderRadius,
					boxShadow: styles.boxShadow,
					border: styles.border
				}
			})

			console.log(`Card ${i} glassmorphism:`, cardStyles)

			// Test hover interaction
			await card.hover()
			await page.waitForTimeout(300)

			const hoverTransform = await card.evaluate(el =>
				window.getComputedStyle(el).transform
			)

			console.log(`Card ${i} hover transform:`, hoverTransform)
			await expect(card).toHaveScreenshot(`feature-card-${i}-hover.png`)

			// Reset hover
			await page.mouse.move(0, 0)
			await page.waitForTimeout(200)
		}
	})

	test('should have Stripe-quality pricing section', async ({ page }) => {
		// Find pricing section
		const pricingSection = page.locator('section').filter({ hasText: /pricing|plan|price/i }).first()

		if (await pricingSection.isVisible()) {
			// Test pricing cards
			const pricingCards = pricingSection.locator('.card-interactive, .pricing-card, [class*="card-"]')
			const pricingCount = await pricingCards.count()

			console.log(`Testing ${pricingCount} pricing cards`)

			for (let i = 0; i < pricingCount; i++) {
				const pricingCard = pricingCards.nth(i)

				// Test default pricing card
				await expect(pricingCard).toHaveScreenshot(`pricing-card-${i}-default.png`)

				// Test pricing card hover
				await pricingCard.hover()
				await page.waitForTimeout(300)
				await expect(pricingCard).toHaveScreenshot(`pricing-card-${i}-hover.png`)

				// Test pricing CTA buttons
				const pricingCTA = pricingCard.locator('button, .btn-primary, a[class*="btn"]').first()
				if (await pricingCTA.isVisible()) {
					await expect(pricingCTA).toHaveScreenshot(`pricing-cta-${i}.png`)
				}
			}

			// Full pricing section screenshot
			await expect(pricingSection).toHaveScreenshot('pricing-section-full.png')
		}
	})

	test('should have perfect footer polish', async ({ page }) => {
		// Test footer
		const footer = page.locator('footer').first()

		if (await footer.isVisible()) {
			// Scroll to footer
			await footer.scrollIntoViewIfNeeded()
			await page.waitForTimeout(300)

			// Footer background and styling
			const footerStyles = await footer.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backgroundColor: styles.backgroundColor,
					borderTop: styles.borderTop,
					padding: styles.padding,
					color: styles.color
				}
			})

			console.log('Footer styles:', footerStyles)
			await expect(footer).toHaveScreenshot('footer-polish.png')

			// Test footer links
			const footerLinks = footer.locator('a')
			const linkCount = await footerLinks.count()

			console.log(`Testing ${Math.min(linkCount, 5)} footer links`)

			for (let i = 0; i < Math.min(linkCount, 5); i++) {
				const link = footerLinks.nth(i)

				// Test link hover
				await link.hover()
				await page.waitForTimeout(150)

				const linkHoverColor = await link.evaluate(el =>
					window.getComputedStyle(el).color
				)

				console.log(`Footer link ${i} hover color:`, linkHoverColor)
			}
		}
	})

	test('should have smooth scroll behavior', async ({ page }) => {
		// Test smooth scrolling behavior
		const scrollBehavior = await page.evaluate(() => {
			return window.getComputedStyle(document.documentElement).scrollBehavior
		})

		console.log('Scroll behavior:', scrollBehavior)

		// Test scroll to different sections
		const sections = page.locator('section')
		const sectionCount = await sections.count()

		for (let i = 0; i < Math.min(sectionCount, 4); i++) {
			const section = sections.nth(i)

			// Scroll to section
			await section.scrollIntoViewIfNeeded()
			await page.waitForTimeout(500)

			// Check scroll position
			const scrollY = await page.evaluate(() => window.scrollY)
			console.log(`Scrolled to section ${i} at position: ${scrollY}px`)

			// Screenshot during scroll
			await expect(page).toHaveScreenshot(`homepage-scroll-section-${i}.png`)
		}
	})

	test('should have consistent spacing and typography', async ({ page }) => {
		// Test typography consistency
		const headings = page.locator('h1, h2, h3, h4, h5, h6')
		const headingCount = await headings.count()

		console.log(`Testing ${headingCount} headings for consistency`)

		for (let i = 0; i < Math.min(headingCount, 8); i++) {
			const heading = headings.nth(i)
			const tagName = await heading.evaluate(el => el.tagName.toLowerCase())

			const headingStyles = await heading.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					fontSize: styles.fontSize,
					fontWeight: styles.fontWeight,
					lineHeight: styles.lineHeight,
					marginTop: styles.marginTop,
					marginBottom: styles.marginBottom
				}
			})

			console.log(`${tagName} styles:`, headingStyles)
		}

		// Test paragraph consistency
		const paragraphs = page.locator('p')
		const paragraphCount = await paragraphs.count()

		for (let i = 0; i < Math.min(paragraphCount, 5); i++) {
			const paragraph = paragraphs.nth(i)

			const pStyles = await paragraph.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					fontSize: styles.fontSize,
					lineHeight: styles.lineHeight,
					color: styles.color,
					marginBottom: styles.marginBottom
				}
			})

			console.log(`Paragraph ${i} styles:`, pStyles)
		}
	})

	test('should have perfect responsive layout', async ({ page }) => {
		const viewports = [
			{ width: 1920, height: 1080, name: 'desktop' },
			{ width: 1024, height: 768, name: 'tablet' },
			{ width: 375, height: 812, name: 'mobile' }
		]

		for (const viewport of viewports) {
			await page.setViewportSize(viewport)
			await page.waitForTimeout(300)

			// Test hero section responsiveness
			const heroSection = page.locator('section').first()
			await expect(heroSection).toHaveScreenshot(`homepage-hero-${viewport.name}.png`)

			// Test feature cards responsiveness
			const featureCards = page.locator('.card-interactive, .feature-card').first()
			if (await featureCards.isVisible()) {
				await expect(featureCards).toHaveScreenshot(`homepage-features-${viewport.name}.png`)
			}

			// Test full page layout
			await expect(page).toHaveScreenshot(`homepage-full-${viewport.name}.png`, { fullPage: true })
		}
	})
})