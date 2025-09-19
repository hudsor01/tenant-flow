import { test, expect } from '@playwright/test'

test.describe('Apple Glassmorphism Quality - Trillion Dollar Aesthetic', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have perfect backdrop-blur rendering', async ({ page }) => {
		// Find elements with glassmorphism
		const glassElements = [
			'.card-interactive',
			'[class*="backdrop-blur"]',
			'[class*="bg-background/"]',
			'[class*="bg-card/"]'
		]

		for (const selector of glassElements) {
			const elements = page.locator(selector)
			const count = await elements.count()

			if (count > 0) {
				console.log(`Found ${count} glassmorphism elements with selector: ${selector}`)

				for (let i = 0; i < Math.min(count, 3); i++) {
					const element = elements.nth(i)

					// Check backdrop-filter properties
					const backdropFilter = await element.evaluate(el => {
						const styles = window.getComputedStyle(el)
						return {
							backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter || 'none',
							backgroundColor: styles.backgroundColor,
							opacity: styles.opacity,
							borderRadius: styles.borderRadius
						}
					})

					console.log(`Element ${i} glassmorphism:`, backdropFilter)

					// Validate Apple-quality blur
					if (backdropFilter.backdropFilter.includes('blur')) {
						console.log('✅ Backdrop blur detected')
					}

					// Screenshot for quality validation
					await expect(element).toHaveScreenshot(`glassmorphism-${selector.replace(/[\[\]\*\.\s\/]/g, '-')}-${i}.png`)
				}
			}
		}
	})

	test('should have proper glassmorphism layering', async ({ page }) => {
		// Test navbar glassmorphism (should be sticky)
		const navbar = page.locator('nav').first()
		if (await navbar.isVisible()) {
			// Scroll to test sticky glassmorphism
			await page.evaluate(() => window.scrollTo(0, 500))
			await page.waitForTimeout(300)

			const navbarStyles = await navbar.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					position: styles.position,
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor,
					zIndex: styles.zIndex
				}
			})

			console.log('Navbar glassmorphism:', navbarStyles)

			// Should be sticky with backdrop blur
			expect(navbarStyles.position).toMatch(/sticky|fixed/)

			await expect(navbar).toHaveScreenshot('navbar-glassmorphism-scrolled.png')
		}
	})

	test('should have macOS-quality card glassmorphism', async ({ page }) => {
		// Find card elements
		const cards = page.locator('.card-interactive, .card-base, [class*="card-"]')
		const count = await cards.count()

		console.log(`Testing ${count} cards for glassmorphism quality`)

		for (let i = 0; i < Math.min(count, 5); i++) {
			const card = cards.nth(i)

			// Test hover glassmorphism enhancement
			await expect(card).toHaveScreenshot(`card-glassmorphism-default-${i}.png`)

			// Hover to enhance glassmorphism
			await card.hover()
			await page.waitForTimeout(300)

			const hoverStyles = await card.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					transform: styles.transform,
					boxShadow: styles.boxShadow,
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor
				}
			})

			console.log(`Card ${i} hover glassmorphism:`, hoverStyles)

			await expect(card).toHaveScreenshot(`card-glassmorphism-hover-${i}.png`)
		}
	})

	test('should have perfect transparency levels', async ({ page }) => {
		// Test different opacity levels commonly used
		const transparencySelectors = [
			'[class*="/80"]',
			'[class*="/90"]',
			'[class*="/95"]',
			'[class*="/50"]'
		]

		for (const selector of transparencySelectors) {
			const elements = page.locator(selector)
			const count = await elements.count()

			if (count > 0) {
				console.log(`Found ${count} elements with transparency: ${selector}`)

				const element = elements.first()
				const opacity = await element.evaluate(el => {
					const bgColor = window.getComputedStyle(el).backgroundColor
					const match = bgColor.match(/rgba?\([^)]*,\s*([01]?\.?\d*)\)/)
					return match ? parseFloat(match[1]) : 1
				})

				console.log(`Opacity level for ${selector}: ${opacity}`)

				// Screenshot transparency quality
				await expect(element).toHaveScreenshot(`transparency-${selector.replace(/[\[\]\*\/]/g, '-')}.png`)
			}
		}
	})

	test('should have consistent glassmorphism across pages', async ({ page }) => {
		const pages = ['/', '/features', '/pricing', '/about']

		for (const pagePath of pages) {
			await page.goto(pagePath)
			await page.waitForLoadState('networkidle')

			// Find glassmorphism elements on this page
			const glassElements = page.locator('[class*="backdrop-blur"], [class*="bg-background/"], .card-interactive')
			const count = await glassElements.count()

			if (count > 0) {
				console.log(`Found ${count} glassmorphism elements on ${pagePath}`)

				// Test first few elements
				for (let i = 0; i < Math.min(count, 3); i++) {
					const element = glassElements.nth(i)

					const glassSpecs = await element.evaluate(el => {
						const styles = window.getComputedStyle(el)
						return {
							backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
							backgroundColor: styles.backgroundColor,
							borderRadius: styles.borderRadius
						}
					})

					console.log(`${pagePath} glassmorphism ${i}:`, glassSpecs)

					// Screenshot for cross-page consistency
					await expect(element).toHaveScreenshot(`glassmorphism-${pagePath.replace('/', 'home')}-${i}.png`)
				}
			}
		}
	})

	test('should handle glassmorphism in dark mode perfectly', async ({ page }) => {
		// Switch to dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		// Test glassmorphism in dark mode
		const glassElements = page.locator('.card-interactive, [class*="backdrop-blur"]')
		const count = await glassElements.count()

		console.log(`Testing ${count} glassmorphism elements in dark mode`)

		for (let i = 0; i < Math.min(count, 3); i++) {
			const element = glassElements.nth(i)

			const darkGlassSpecs = await element.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor,
					color: styles.color,
					borderColor: styles.borderColor
				}
			})

			console.log(`Dark mode glassmorphism ${i}:`, darkGlassSpecs)

			// Should maintain glassmorphism quality in dark mode
			await expect(element).toHaveScreenshot(`glassmorphism-dark-${i}.png`)

			// Test hover in dark mode
			await element.hover()
			await page.waitForTimeout(200)
			await expect(element).toHaveScreenshot(`glassmorphism-dark-hover-${i}.png`)
		}
	})
})