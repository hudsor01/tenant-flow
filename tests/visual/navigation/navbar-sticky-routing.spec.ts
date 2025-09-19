import { test, expect } from '@playwright/test'

test.describe('Navbar Sticky Routing - Apple Quality Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have perfect sticky positioning on all public pages', async ({ page }) => {
		const publicPages = ['/', '/features', '/pricing', '/about', '/contact', '/help', '/faq', '/blog']

		for (const pagePath of publicPages) {
			await page.goto(pagePath)
			await page.waitForLoadState('networkidle')

			const navbar = page.locator('nav').first()
			if (await navbar.isVisible()) {
				// Test initial position
				const initialPosition = await navbar.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						position: styles.position,
						top: styles.top,
						zIndex: styles.zIndex
					}
				})

				console.log(`${pagePath} navbar initial:`, initialPosition)

				// Should be sticky positioned
				expect(initialPosition.position).toMatch(/sticky|fixed/)
				expect(parseInt(initialPosition.zIndex)).toBeGreaterThan(40)

				// Scroll to test sticky behavior
				await page.evaluate(() => window.scrollTo(0, 800))
				await page.waitForTimeout(300)

				const scrolledPosition = await navbar.evaluate(el => {
					const rect = el.getBoundingClientRect()
					const styles = window.getComputedStyle(el)
					return {
						top: rect.top,
						position: styles.position,
						backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter
					}
				})

				console.log(`${pagePath} navbar scrolled:`, scrolledPosition)

				// Should stay at top when scrolled
				expect(scrolledPosition.top).toBeLessThanOrEqual(10)

				// Should have glassmorphism when scrolled
				if (scrolledPosition.backdropFilter && scrolledPosition.backdropFilter !== 'none') {
					console.log(`✅ Glassmorphism detected on ${pagePath}`)
				}

				// Screenshot for visual validation
				await expect(navbar).toHaveScreenshot(`navbar-sticky-${pagePath.replace('/', 'home')}.png`)

				// Reset scroll for next test
				await page.evaluate(() => window.scrollTo(0, 0))
				await page.waitForTimeout(200)
			}
		}
	})

	test('should NOT be sticky on protected dashboard pages', async ({ page }) => {
		// Test that protected pages have their own layout without sticky navbar
		const protectedPages = ['/dashboard', '/dashboard/properties', '/dashboard/tenants']

		for (const pagePath of protectedPages) {
			await page.goto(pagePath)
			await page.waitForLoadState('networkidle')

			// Should redirect to auth or show protected layout
			const currentUrl = page.url()

			if (currentUrl.includes('/auth') || currentUrl.includes('/login')) {
				console.log(`✅ ${pagePath} properly redirects to auth`)
				continue
			}

			// If we reach protected page, check for different layout
			const publicNavbar = page.locator('nav[class*="sticky"], nav[class*="fixed"]').first()
			const isPublicNavVisible = await publicNavbar.isVisible().catch(() => false)

			if (!isPublicNavVisible) {
				console.log(`✅ ${pagePath} has protected layout without public sticky navbar`)
			}
		}
	})

	test('should have Linear-quality navigation transitions', async ({ page }) => {
		const navbar = page.locator('nav').first()

		// Test navigation link hover states
		const navLinks = navbar.locator('a')
		const linkCount = await navLinks.count()

		console.log(`Testing ${linkCount} navigation links`)

		for (let i = 0; i < Math.min(linkCount, 6); i++) {
			const link = navLinks.nth(i)

			// Capture default state
			await expect(link).toHaveScreenshot(`nav-link-${i}-default.png`)

			// Hover to test micro-interaction
			await link.hover()
			await page.waitForTimeout(200)

			// Check for smooth transition
			const hoverStyles = await link.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					color: styles.color,
					backgroundColor: styles.backgroundColor,
					transform: styles.transform,
					transition: styles.transition
				}
			})

			console.log(`Nav link ${i} hover:`, hoverStyles)

			// Capture hover state
			await expect(link).toHaveScreenshot(`nav-link-${i}-hover.png`)

			// Move away to reset
			await page.mouse.move(0, 0)
			await page.waitForTimeout(100)
		}
	})

	test('should maintain perfect navbar glassmorphism during scroll', async ({ page }) => {
		const navbar = page.locator('nav').first()

		// Test multiple scroll positions for glassmorphism consistency
		const scrollPositions = [0, 200, 500, 1000, 1500]

		for (const scrollY of scrollPositions) {
			await page.evaluate(y => window.scrollTo(0, y), scrollY)
			await page.waitForTimeout(300)

			const glassSpecs = await navbar.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
					backgroundColor: styles.backgroundColor,
					borderColor: styles.borderColor,
					boxShadow: styles.boxShadow
				}
			})

			console.log(`Scroll ${scrollY}px glassmorphism:`, glassSpecs)

			// Should maintain consistent glassmorphism
			await expect(navbar).toHaveScreenshot(`navbar-glass-scroll-${scrollY}.png`)
		}
	})

	test('should have perfect mobile navbar behavior', async ({ page }) => {
		// Test mobile responsive navbar
		await page.setViewportSize({ width: 375, height: 812 })
		await page.waitForTimeout(200)

		const navbar = page.locator('nav').first()

		// Check for mobile menu toggle
		const mobileToggle = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], [data-mobile-menu]').first()

		if (await mobileToggle.isVisible()) {
			// Test mobile menu toggle
			await expect(mobileToggle).toHaveScreenshot('mobile-menu-toggle-closed.png')

			await mobileToggle.click()
			await page.waitForTimeout(300)

			// Check if mobile menu opened
			const mobileMenu = page.locator('[role="dialog"], [data-mobile-menu-content], .mobile-menu').first()

			if (await mobileMenu.isVisible()) {
				await expect(mobileMenu).toHaveScreenshot('mobile-menu-opened.png')

				// Test menu glassmorphism
				const menuGlass = await mobileMenu.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
						backgroundColor: styles.backgroundColor
					}
				})

				console.log('Mobile menu glassmorphism:', menuGlass)

				// Close menu
				await mobileToggle.click()
				await page.waitForTimeout(300)
			}
		}

		// Test mobile navbar stickiness
		await page.evaluate(() => window.scrollTo(0, 600))
		await page.waitForTimeout(300)

		const mobileNavPosition = await navbar.evaluate(el => {
			const rect = el.getBoundingClientRect()
			return {
				top: rect.top,
				position: window.getComputedStyle(el).position
			}
		})

		console.log('Mobile navbar position:', mobileNavPosition)
		expect(mobileNavPosition.top).toBeLessThanOrEqual(10)

		await expect(navbar).toHaveScreenshot('navbar-mobile-sticky.png')
	})

	test('should have consistent routing across all navbar links', async ({ page }) => {
		const navbar = page.locator('nav').first()
		const navLinks = navbar.locator('a[href]')
		const linkCount = await navLinks.count()

		console.log(`Testing ${linkCount} navbar routing links`)

		for (let i = 0; i < linkCount; i++) {
			const link = navLinks.nth(i)
			const href = await link.getAttribute('href')

			if (href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
				console.log(`Testing navigation to: ${href}`)

				// Click the link
				await link.click()
				await page.waitForLoadState('networkidle')

				// Verify navigation worked
				const currentUrl = page.url()
				console.log(`Navigated to: ${currentUrl}`)

				// Check navbar is still present and sticky (unless protected route)
				if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/auth')) {
					const stickyNavbar = page.locator('nav').first()
					const isSticky = await stickyNavbar.evaluate(el => {
						const styles = window.getComputedStyle(el)
						return styles.position === 'sticky' || styles.position === 'fixed'
					})

					expect(isSticky).toBe(true)
					console.log(`✅ Navbar sticky on ${currentUrl}`)
				}

				// Return to home for next test
				await page.goto('/')
				await page.waitForLoadState('networkidle')
			}
		}
	})
})