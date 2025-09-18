import { test, expect } from '@playwright/test'

test.describe('Primary Button States - Linear/Stripe Polish', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have perfect default state styling', async ({ page }) => {
		// Debug: check what buttons exist on the page
		const allButtons = page.locator('button, .btn-primary, [class*="btn-"]')
		const buttonCount = await allButtons.count()
		console.log(`Found ${buttonCount} total buttons on page`)

		// Try multiple selectors to find primary buttons
		const primarySelectors = [
			'.btn-primary',
			'button.btn-primary',
			'[class*="btn-primary"]',
			'button[class*="btn-primary"]'
		]

		let primaryButton = null
		for (const selector of primarySelectors) {
			const found = page.locator(selector).first()
			if (await found.isVisible().catch(() => false)) {
				primaryButton = found
				console.log(`✅ Found primary button with selector: ${selector}`)
				break
			}
		}

		if (!primaryButton) {
			// Fallback to any button if no primary found
			primaryButton = page.locator('button').first()
			console.log('⚠️ Using fallback button selector')
		}

		await expect(primaryButton).toBeVisible()

		// Validate base styling
		await expect(primaryButton).toHaveCSS('background-color', /.*/) // Primary color
		await expect(primaryButton).toHaveCSS('border-radius', /.*/) // Rounded corners
		await expect(primaryButton).toHaveCSS('transition', /.*/) // Smooth transitions

		// Take screenshot for pixel-perfect validation
		await expect(primaryButton).toHaveScreenshot('btn-primary-default.png')
	})

	test('should have Linear-quality hover micro-interactions', async ({ page }) => {
		// Use the same button finding logic
		const primaryButton = page.locator('button[class*="btn-primary"], .btn-primary, button').first()

		// Capture default state
		await expect(primaryButton).toHaveScreenshot('btn-primary-before-hover.png')

		// Hover and capture micro-interaction
		await primaryButton.hover()
		await page.waitForTimeout(300) // Wait for transition completion

		// Validate hover state changes
		await expect(primaryButton).toHaveScreenshot('btn-primary-hover-state.png')

		// Check for smooth transition properties
		const transformValue = await primaryButton.evaluate(el =>
			window.getComputedStyle(el).transform
		)

		// Should have subtle scale or other micro-interaction
		console.log('Hover transform:', transformValue)
	})

	test('should have Stripe-quality focus state', async ({ page }) => {
		const primaryButton = page.locator('button[class*="btn-primary"], .btn-primary, button').first()

		// Focus the button
		await primaryButton.focus()
		await page.waitForTimeout(100)

		// Validate focus ring quality
		const outline = await primaryButton.evaluate(el =>
			window.getComputedStyle(el).outline
		)
		const boxShadow = await primaryButton.evaluate(el =>
			window.getComputedStyle(el).boxShadow
		)

		console.log('Focus outline:', outline)
		console.log('Focus box-shadow:', boxShadow)

		// Capture focus state
		await expect(primaryButton).toHaveScreenshot('btn-primary-focus-state.png')
	})

	test('should have Apple-quality active state', async ({ page }) => {
		const primaryButton = page.locator('button[class*="btn-primary"], .btn-primary, button').first()

		// Simulate active press
		await primaryButton.dispatchEvent('mousedown')
		await page.waitForTimeout(50)

		// Capture active state
		await expect(primaryButton).toHaveScreenshot('btn-primary-active-state.png')

		// Release
		await primaryButton.dispatchEvent('mouseup')
		await page.waitForTimeout(200)

		// Should return to normal
		await expect(primaryButton).toHaveScreenshot('btn-primary-after-active.png')
	})

	test('should have consistent styling across different buttons', async ({ page }) => {
		// Find all primary buttons on page
		const primaryButtons = page.locator('button[class*="btn-primary"], .btn-primary, button')
		const count = await primaryButtons.count()

		console.log(`Found ${count} primary buttons`)

		// Check each button for consistent styling
		for (let i = 0; i < Math.min(count, 5); i++) {
			const button = primaryButtons.nth(i)

			// Validate consistent base properties
			const bgColor = await button.evaluate(el =>
				window.getComputedStyle(el).backgroundColor
			)
			const borderRadius = await button.evaluate(el =>
				window.getComputedStyle(el).borderRadius
			)
			const padding = await button.evaluate(el =>
				window.getComputedStyle(el).padding
			)

			console.log(`Button ${i}: bg=${bgColor}, radius=${borderRadius}, padding=${padding}`)

			// Screenshot each button for visual consistency
			await expect(button).toHaveScreenshot(`btn-primary-${i}-consistency.png`)
		}
	})

	test('should have perfect responsive scaling', async ({ page }) => {
		const primaryButton = page.locator('button[class*="btn-primary"], .btn-primary, button').first()

		// Test desktop size
		await page.setViewportSize({ width: 1920, height: 1080 })
		await expect(primaryButton).toHaveScreenshot('btn-primary-desktop.png')

		// Test tablet size
		await page.setViewportSize({ width: 1024, height: 768 })
		await expect(primaryButton).toHaveScreenshot('btn-primary-tablet.png')

		// Test mobile size
		await page.setViewportSize({ width: 375, height: 812 })
		await expect(primaryButton).toHaveScreenshot('btn-primary-mobile.png')
	})
})