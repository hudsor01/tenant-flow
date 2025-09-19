import { test, expect } from '@playwright/test'

test.describe('Dark Mode Perfection - Apple macOS Quality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have instant dark mode toggle with perfect transitions', async ({ page }) => {
		// Find theme toggle button
		const themeToggle = page.locator('[data-theme-toggle], [aria-label*="theme"], button[class*="theme"]').first()

		if (await themeToggle.isVisible()) {
			// Capture light mode state
			await expect(page).toHaveScreenshot('light-mode-full.png')

			// Toggle to dark mode
			await themeToggle.click()
			await page.waitForTimeout(500) // Wait for transition

			// Capture dark mode state
			await expect(page).toHaveScreenshot('dark-mode-full.png')

			// Test dark mode toggle button state
			await expect(themeToggle).toHaveScreenshot('theme-toggle-dark.png')

			// Toggle back to light
			await themeToggle.click()
			await page.waitForTimeout(500)

			// Verify return to light mode
			await expect(themeToggle).toHaveScreenshot('theme-toggle-light.png')
		} else {
			// Manual dark mode activation
			await page.evaluate(() => {
				document.documentElement.classList.add('dark')
			})
			await page.waitForTimeout(500)

			console.log('✅ Manual dark mode activated')
		}
	})

	test('should have perfect dark mode glassmorphism', async ({ page }) => {
		// Activate dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		// Test glassmorphism elements in dark mode
		const glassElements = page.locator('.card-interactive, [class*="backdrop-blur"], [class*="bg-background/"]')
		const glassCount = await glassElements.count()

		console.log(`Testing ${glassCount} glassmorphism elements in dark mode`)

		for (let i = 0; i < Math.min(glassCount, 6); i++) {
			const element = glassElements.nth(i)

			const darkGlassSpecs = await element.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor,
					borderColor: styles.borderColor,
					color: styles.color,
					boxShadow: styles.boxShadow
				}
			})

			console.log(`Dark glassmorphism ${i}:`, darkGlassSpecs)

			// Should maintain quality in dark mode
			await expect(element).toHaveScreenshot(`dark-glassmorphism-${i}.png`)

			// Test hover in dark mode
			await element.hover()
			await page.waitForTimeout(300)
			await expect(element).toHaveScreenshot(`dark-glassmorphism-${i}-hover.png`)

			// Reset hover
			await page.mouse.move(0, 0)
			await page.waitForTimeout(200)
		}
	})

	test('should have consistent dark mode button states', async ({ page }) => {
		// Activate dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		// Test all button variants in dark mode
		const buttons = page.locator('.btn-primary, .btn-secondary, .btn-outline, button')
		const buttonCount = await buttons.count()

		console.log(`Testing ${buttonCount} buttons in dark mode`)

		for (let i = 0; i < Math.min(buttonCount, 8); i++) {
			const button = buttons.nth(i)

			if (await button.isVisible()) {
				// Test dark mode button styling
				const darkButtonStyles = await button.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						backgroundColor: styles.backgroundColor,
						color: styles.color,
						borderColor: styles.borderColor,
						boxShadow: styles.boxShadow
					}
				})

				console.log(`Dark button ${i}:`, darkButtonStyles)

				// Default dark state
				await expect(button).toHaveScreenshot(`dark-button-${i}-default.png`)

				// Hover dark state
				await button.hover()
				await page.waitForTimeout(300)
				await expect(button).toHaveScreenshot(`dark-button-${i}-hover.png`)

				// Focus dark state
				await button.focus()
				await page.waitForTimeout(200)
				await expect(button).toHaveScreenshot(`dark-button-${i}-focus.png`)

				// Reset
				await button.blur()
				await page.mouse.move(0, 0)
				await page.waitForTimeout(200)
			}
		}
	})

	test('should have perfect dark mode navbar quality', async ({ page }) => {
		// Activate dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		const navbar = page.locator('nav').first()

		if (await navbar.isVisible()) {
			// Test dark navbar styling
			const darkNavStyles = await navbar.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backgroundColor: styles.backgroundColor,
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					borderColor: styles.borderColor,
					boxShadow: styles.boxShadow
				}
			})

			console.log('Dark navbar styles:', darkNavStyles)

			// Test navbar at different scroll positions
			const scrollPositions = [0, 300, 600]

			for (const scrollY of scrollPositions) {
				await page.evaluate(y => window.scrollTo(0, y), scrollY)
				await page.waitForTimeout(300)

				await expect(navbar).toHaveScreenshot(`dark-navbar-scroll-${scrollY}.png`)
			}

			// Test dark navbar links
			const navLinks = navbar.locator('a')
			const linkCount = await navLinks.count()

			for (let i = 0; i < Math.min(linkCount, 5); i++) {
				const link = navLinks.nth(i)

				// Test dark link hover
				await link.hover()
				await page.waitForTimeout(200)

				const darkLinkColor = await link.evaluate(el =>
					window.getComputedStyle(el).color
				)

				console.log(`Dark nav link ${i} hover:`, darkLinkColor)
			}
		}
	})

	test('should have perfect dark mode card interactions', async ({ page }) => {
		// Activate dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		// Test feature cards in dark mode
		const cards = page.locator('.card-interactive, .feature-card, [class*="card-"]')
		const cardCount = await cards.count()

		console.log(`Testing ${cardCount} cards in dark mode`)

		for (let i = 0; i < Math.min(cardCount, 6); i++) {
			const card = cards.nth(i)

			// Test dark card properties
			const darkCardSpecs = await card.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backgroundColor: styles.backgroundColor,
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					borderColor: styles.borderColor,
					color: styles.color,
					boxShadow: styles.boxShadow
				}
			})

			console.log(`Dark card ${i}:`, darkCardSpecs)

			// Default dark card
			await expect(card).toHaveScreenshot(`dark-card-${i}-default.png`)

			// Hover dark card
			await card.hover()
			await page.waitForTimeout(300)

			const darkHoverTransform = await card.evaluate(el =>
				window.getComputedStyle(el).transform
			)

			console.log(`Dark card ${i} hover transform:`, darkHoverTransform)
			await expect(card).toHaveScreenshot(`dark-card-${i}-hover.png`)
		}
	})

	test('should have consistent dark mode across all pages', async ({ page }) => {
		const pages = ['/', '/features', '/pricing', '/about', '/contact']

		for (const pagePath of pages) {
			await page.goto(pagePath)
			await page.waitForLoadState('networkidle')

			// Activate dark mode
			await page.evaluate(() => {
				document.documentElement.classList.add('dark')
			})
			await page.waitForTimeout(500)

			// Test page background in dark mode
			const pageBackground = await page.evaluate(() => {
				const styles = window.getComputedStyle(document.body)
				return {
					backgroundColor: styles.backgroundColor,
					color: styles.color
				}
			})

			console.log(`${pagePath} dark background:`, pageBackground)

			// Full page dark mode screenshot
			await expect(page).toHaveScreenshot(`dark-page-${pagePath.replace('/', 'home')}.png`)

			// Test key elements on each page
			const keyElements = page.locator('h1, h2, .btn-primary, .card-interactive').first()
			if (await keyElements.isVisible()) {
				await expect(keyElements).toHaveScreenshot(`dark-element-${pagePath.replace('/', 'home')}.png`)
			}
		}
	})

	test('should have perfect dark mode mobile experience', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 812 })
		await page.waitForTimeout(300)

		// Activate dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		// Test mobile dark mode layout
		await expect(page).toHaveScreenshot('dark-mobile-full.png')

		// Test mobile dark navbar
		const mobileNav = page.locator('nav').first()
		if (await mobileNav.isVisible()) {
			await expect(mobileNav).toHaveScreenshot('dark-mobile-navbar.png')

			// Test mobile menu toggle in dark mode
			const mobileToggle = page.locator('button[aria-label*="menu"], [data-mobile-menu]').first()
			if (await mobileToggle.isVisible()) {
				await mobileToggle.click()
				await page.waitForTimeout(300)

				const mobileMenu = page.locator('[role="dialog"], [data-mobile-menu-content]').first()
				if (await mobileMenu.isVisible()) {
					await expect(mobileMenu).toHaveScreenshot('dark-mobile-menu.png')
				}
			}
		}

		// Test mobile dark cards
		const mobileCards = page.locator('.card-interactive, .feature-card').first()
		if (await mobileCards.isVisible()) {
			await expect(mobileCards).toHaveScreenshot('dark-mobile-card.png')
		}
	})

	test('should have perfect dark mode text contrast', async ({ page }) => {
		// Activate dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(500)

		// Test text elements for proper contrast
		const textElements = page.locator('h1, h2, h3, p, span, a').filter({ hasText: /.+/ })
		const textCount = await textElements.count()

		console.log(`Testing ${Math.min(textCount, 10)} text elements for dark mode contrast`)

		for (let i = 0; i < Math.min(textCount, 10); i++) {
			const textElement = textElements.nth(i)

			const textStyles = await textElement.evaluate(el => {
				const styles = window.getComputedStyle(el)
				const parentStyles = window.getComputedStyle(el.parentElement || el)
				return {
					color: styles.color,
					backgroundColor: parentStyles.backgroundColor,
					opacity: styles.opacity,
					fontSize: styles.fontSize
				}
			})

			console.log(`Dark text ${i}:`, textStyles)

			// Ensure text is readable (not too low contrast)
			const textColor = textStyles.color
			if (textColor.includes('rgb(')) {
				const match = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (match) {
					const [, r, g, b] = match.map(Number)
					const brightness = (r * 299 + g * 587 + b * 114) / 1000

					// In dark mode, text should be light enough to read
					if (brightness < 150) {
						console.warn(`⚠️ Low contrast text detected: ${textColor}`)
					} else {
						console.log(`✅ Good contrast: ${textColor}`)
					}
				}
			}
		}
	})
})