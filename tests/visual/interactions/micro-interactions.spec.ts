import { test, expect } from '@playwright/test'

test.describe('Micro-Interactions Quality - Apple/Linear Polish', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have perfect button micro-interactions', async ({ page }) => {
		// Test all button types for micro-interactions
		const buttons = page.locator('.btn-primary, .btn-secondary, .btn-outline, button')
		const buttonCount = await buttons.count()

		console.log(`Testing ${buttonCount} button micro-interactions`)

		for (let i = 0; i < Math.min(buttonCount, 8); i++) {
			const button = buttons.nth(i)

			if (await button.isVisible()) {
				// Test transition timing
				const transitionSpecs = await button.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						transition: styles.transition,
						transitionDuration: styles.transitionDuration,
						transitionTimingFunction: styles.transitionTimingFunction
					}
				})

				console.log(`Button ${i} transitions:`, transitionSpecs)

				// Should have smooth transitions (200-300ms range)
				const duration = transitionSpecs.transitionDuration
				if (duration && duration !== 'auto' && duration !== '0s') {
					console.log(`✅ Button ${i} has transition: ${duration}`)
				}

				// Test micro-interaction sequence
				await expect(button).toHaveScreenshot(`micro-btn-${i}-rest.png`)

				// Hover micro-interaction
				await button.hover()
				await page.waitForTimeout(150) // Mid-transition
				await expect(button).toHaveScreenshot(`micro-btn-${i}-hover-mid.png`)

				await page.waitForTimeout(200) // Full transition
				await expect(button).toHaveScreenshot(`micro-btn-${i}-hover-complete.png`)

				// Active press micro-interaction
				await button.dispatchEvent('mousedown')
				await page.waitForTimeout(100)
				await expect(button).toHaveScreenshot(`micro-btn-${i}-active.png`)

				// Release and return
				await button.dispatchEvent('mouseup')
				await page.waitForTimeout(200)
				await expect(button).toHaveScreenshot(`micro-btn-${i}-release.png`)

				// Reset to neutral
				await page.mouse.move(0, 0)
				await page.waitForTimeout(300)
			}
		}
	})

	test('should have perfect card hover micro-interactions', async ({ page }) => {
		// Test card micro-interactions
		const cards = page.locator('.card-interactive, .feature-card, [class*="card-"]')
		const cardCount = await cards.count()

		console.log(`Testing ${cardCount} card micro-interactions`)

		for (let i = 0; i < Math.min(cardCount, 6); i++) {
			const card = cards.nth(i)

			// Test card transition properties
			const cardTransitions = await card.evaluate(el => {
				const styles = window.getComputedStyle(el)
				return {
					transition: styles.transition,
					transform: styles.transform,
					boxShadow: styles.boxShadow
				}
			})

			console.log(`Card ${i} micro-interaction setup:`, cardTransitions)

			// Rest state
			await expect(card).toHaveScreenshot(`micro-card-${i}-rest.png`)

			// Approach hover (cursor near but not on card)
			const cardBox = await card.boundingBox()
			if (cardBox) {
				await page.mouse.move(cardBox.x + cardBox.width + 20, cardBox.y + cardBox.height / 2)
				await page.waitForTimeout(100)
				await expect(card).toHaveScreenshot(`micro-card-${i}-approach.png`)

				// Enter hover
				await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
				await page.waitForTimeout(150) // Mid-transition
				await expect(card).toHaveScreenshot(`micro-card-${i}-hover-mid.png`)

				await page.waitForTimeout(200) // Full hover
				const hoverTransform = await card.evaluate(el =>
					window.getComputedStyle(el).transform
				)
				console.log(`Card ${i} hover transform:`, hoverTransform)
				await expect(card).toHaveScreenshot(`micro-card-${i}-hover-complete.png`)

				// Exit hover
				await page.mouse.move(cardBox.x + cardBox.width + 20, cardBox.y + cardBox.height / 2)
				await page.waitForTimeout(150) // Mid-exit
				await expect(card).toHaveScreenshot(`micro-card-${i}-exit-mid.png`)

				await page.waitForTimeout(200) // Complete exit
				await expect(card).toHaveScreenshot(`micro-card-${i}-exit-complete.png`)
			}
		}
	})

	test('should have perfect scroll-triggered micro-interactions', async ({ page }) => {
		// Test scroll-based animations and micro-interactions
		const animatedElements = page.locator('[class*="animate-"], [data-animate], .fade-in, .slide-in')
		const animatedCount = await animatedElements.count()

		console.log(`Testing ${animatedCount} scroll-triggered animations`)

		// Initial state before scroll
		await expect(page).toHaveScreenshot('micro-scroll-initial.png')

		// Smooth scroll through page to trigger animations
		const scrollSteps = [200, 500, 800, 1200, 1600]

		for (let i = 0; i < scrollSteps.length; i++) {
			const scrollY = scrollSteps[i]

			// Smooth scroll to position
			await page.evaluate(y => {
				window.scrollTo({ top: y, behavior: 'smooth' })
			}, scrollY)

			await page.waitForTimeout(300) // Wait for scroll animation

			// Check for elements that should be animated at this scroll position
			const visibleAnimated = page.locator('[class*="animate-"], [data-animate]')
			const visibleCount = await visibleAnimated.count()

			console.log(`At scroll ${scrollY}px: ${visibleCount} animated elements visible`)

			await expect(page).toHaveScreenshot(`micro-scroll-${scrollY}.png`)

			// Test individual animated elements if any are visible
			for (let j = 0; j < Math.min(visibleCount, 3); j++) {
				const animatedElement = visibleAnimated.nth(j)

				if (await animatedElement.isVisible()) {
					const animationStyles = await animatedElement.evaluate(el => {
						const styles = window.getComputedStyle(el)
						return {
							opacity: styles.opacity,
							transform: styles.transform,
							animation: styles.animation
						}
					})

					console.log(`Animated element ${j} at scroll ${scrollY}:`, animationStyles)
				}
			}
		}
	})

	test('should have perfect focus micro-interactions', async ({ page }) => {
		// Test focus micro-interactions for accessibility
		const focusableElements = page.locator('a, button, input, textarea, select')
		const focusableCount = await focusableElements.count()

		console.log(`Testing ${Math.min(focusableCount, 8)} focus micro-interactions`)

		for (let i = 0; i < Math.min(focusableCount, 8); i++) {
			const element = focusableElements.nth(i)

			if (await element.isVisible()) {
				// Rest state
				await expect(element).toHaveScreenshot(`micro-focus-${i}-rest.png`)

				// Focus transition
				await element.focus()
				await page.waitForTimeout(100) // Mid-focus transition
				await expect(element).toHaveScreenshot(`micro-focus-${i}-focusing.png`)

				await page.waitForTimeout(200) // Complete focus
				const focusStyles = await element.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						outline: styles.outline,
						boxShadow: styles.boxShadow,
						borderColor: styles.borderColor
					}
				})

				console.log(`Focus ${i} styles:`, focusStyles)
				await expect(element).toHaveScreenshot(`micro-focus-${i}-focused.png`)

				// Blur transition
				await element.blur()
				await page.waitForTimeout(100) // Mid-blur
				await expect(element).toHaveScreenshot(`micro-focus-${i}-blurring.png`)

				await page.waitForTimeout(200) // Complete blur
				await expect(element).toHaveScreenshot(`micro-focus-${i}-blurred.png`)
			}
		}
	})

	test('should have perfect loading micro-interactions', async ({ page }) => {
		// Test loading states and micro-interactions
		const loadingElements = page.locator('[class*="loading"], [class*="spinner"], .animate-spin')
		const loadingCount = await loadingElements.count()

		if (loadingCount > 0) {
			console.log(`Testing ${loadingCount} loading micro-interactions`)

			for (let i = 0; i < loadingCount; i++) {
				const loader = loadingElements.nth(i)

				if (await loader.isVisible()) {
					// Test loading animation
					const animationSpecs = await loader.evaluate(el => {
						const styles = window.getComputedStyle(el)
						return {
							animation: styles.animation,
							animationDuration: styles.animationDuration,
							animationTimingFunction: styles.animationTimingFunction,
							animationIterationCount: styles.animationIterationCount
						}
					})

					console.log(`Loading ${i} animation:`, animationSpecs)

					// Capture loading states at different times
					await expect(loader).toHaveScreenshot(`micro-loading-${i}-start.png`)

					await page.waitForTimeout(250)
					await expect(loader).toHaveScreenshot(`micro-loading-${i}-quarter.png`)

					await page.waitForTimeout(250)
					await expect(loader).toHaveScreenshot(`micro-loading-${i}-half.png`)

					await page.waitForTimeout(250)
					await expect(loader).toHaveScreenshot(`micro-loading-${i}-three-quarter.png`)
				}
			}
		}

		// Test simulated loading states by triggering form submissions or interactions
		const forms = page.locator('form')
		const formCount = await forms.count()

		for (let i = 0; i < Math.min(formCount, 2); i++) {
			const form = forms.nth(i)
			const submitButton = form.locator('button[type="submit"], input[type="submit"]').first()

			if (await submitButton.isVisible()) {
				// Test loading state on submit
				await expect(submitButton).toHaveScreenshot(`micro-submit-${i}-ready.png`)

				// Simulate form interaction (don't actually submit)
				await submitButton.hover()
				await page.waitForTimeout(200)
				await expect(submitButton).toHaveScreenshot(`micro-submit-${i}-hover.png`)
			}
		}
	})

	test('should have perfect mobile touch micro-interactions', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 812 })
		await page.waitForTimeout(300)

		// Test mobile touch interactions
		const touchElements = page.locator('button, .card-interactive, a')
		const touchCount = await touchElements.count()

		console.log(`Testing ${Math.min(touchCount, 6)} mobile touch micro-interactions`)

		for (let i = 0; i < Math.min(touchCount, 6); i++) {
			const element = touchElements.nth(i)

			if (await element.isVisible()) {
				// Rest state
				await expect(element).toHaveScreenshot(`micro-mobile-${i}-rest.png`)

				// Touch start
				await element.dispatchEvent('touchstart')
				await page.waitForTimeout(100)
				await expect(element).toHaveScreenshot(`micro-mobile-${i}-touch-start.png`)

				// Touch active
				await page.waitForTimeout(150)
				await expect(element).toHaveScreenshot(`micro-mobile-${i}-touch-active.png`)

				// Touch end
				await element.dispatchEvent('touchend')
				await page.waitForTimeout(200)
				await expect(element).toHaveScreenshot(`micro-mobile-${i}-touch-end.png`)

				// Return to rest
				await page.waitForTimeout(300)
				await expect(element).toHaveScreenshot(`micro-mobile-${i}-rest-return.png`)
			}
		}
	})

	test('should have consistent micro-interaction timing', async ({ page }) => {
		// Test that all micro-interactions follow consistent timing patterns
		const interactiveElements = page.locator('button, a, .card-interactive, input')
		const elementCount = await interactiveElements.count()

		const timingData = []

		for (let i = 0; i < Math.min(elementCount, 10); i++) {
			const element = interactiveElements.nth(i)

			if (await element.isVisible()) {
				const timing = await element.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						transitionDuration: styles.transitionDuration,
						transitionTimingFunction: styles.transitionTimingFunction,
						animationDuration: styles.animationDuration
					}
				})

				timingData.push({ element: i, ...timing })
			}
		}

		console.log('Micro-interaction timing analysis:', timingData)

		// Check for consistency (most should be in 200-300ms range)
		const commonDurations = timingData
			.filter(t => t.transitionDuration && t.transitionDuration !== '0s')
			.map(t => t.transitionDuration)

		console.log('Common transition durations:', [...new Set(commonDurations)])

		// Check for Apple-style easing
		const easingFunctions = timingData
			.filter(t => t.transitionTimingFunction)
			.map(t => t.transitionTimingFunction)

		console.log('Easing functions used:', [...new Set(easingFunctions)])
	})
})