import { test, expect } from '@playwright/test'

test.describe('Outline Button Polish - Linear Border Quality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
	})

	test('should have pixel-perfect border quality', async ({ page }) => {
		const outlineButton = page.locator('.btn-outline').first()
		await expect(outlineButton).toBeVisible()

		// Validate border precision
		const borderWidth = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).borderWidth
		)
		const borderStyle = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).borderStyle
		)
		const borderColor = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).borderColor
		)

		console.log('Border specs:', { borderWidth, borderStyle, borderColor })

		// Should be crisp 1px or 2px border
		expect(borderWidth).toMatch(/^[12]px$/)
		expect(borderStyle).toBe('solid')

		// Capture for pixel-perfect validation
		await expect(outlineButton).toHaveScreenshot('btn-outline-border-quality.png')
	})

	test('should have Linear-quality hover border transition', async ({ page }) => {
		const outlineButton = page.locator('.btn-outline').first()

		// Capture default border
		await expect(outlineButton).toHaveScreenshot('btn-outline-default-border.png')

		// Hover and capture border transition
		await outlineButton.hover()
		await page.waitForTimeout(200) // Transition duration

		// Check hover border changes
		const hoverBorderColor = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).borderColor
		)
		const hoverBackground = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).backgroundColor
		)

		console.log('Hover border:', hoverBorderColor)
		console.log('Hover background:', hoverBackground)

		// Capture hover state
		await expect(outlineButton).toHaveScreenshot('btn-outline-hover-border.png')
	})

	test('should have subtle glassmorphism on hover', async ({ page }) => {
		const outlineButton = page.locator('.btn-outline').first()

		// Hover to trigger glassmorphism
		await outlineButton.hover()
		await page.waitForTimeout(300)

		// Check for backdrop-filter or background opacity
		const backdropFilter = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).backdropFilter || window.getComputedStyle(el).webkitBackdropFilter
		)
		const background = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).backgroundColor
		)

		console.log('Glassmorphism backdrop-filter:', backdropFilter)
		console.log('Glassmorphism background:', background)

		// Should have subtle glassmorphism effect
		if (backdropFilter && backdropFilter !== 'none') {
			console.log('✅ Glassmorphism detected')
		}

		await expect(outlineButton).toHaveScreenshot('btn-outline-glassmorphism.png')
	})

	test('should maintain border sharpness at all zoom levels', async ({ page }) => {
		const outlineButton = page.locator('.btn-outline').first()

		// Test different zoom levels for border crispness
		const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

		for (const zoom of zoomLevels) {
			await page.evaluate(zoomLevel => {
				document.body.style.zoom = zoomLevel.toString()
			}, zoom)

			await page.waitForTimeout(100)

			// Capture border at this zoom level
			await expect(outlineButton).toHaveScreenshot(`btn-outline-zoom-${zoom}x.png`)
		}

		// Reset zoom
		await page.evaluate(() => {
			document.body.style.zoom = '1'
		})
	})

	test('should have consistent outline buttons across pages', async ({ page }) => {
		const pages = ['/', '/features', '/pricing', '/about']

		for (const pagePath of pages) {
			await page.goto(pagePath)
			await page.waitForLoadState('networkidle')

			const outlineButtons = page.locator('.btn-outline')
			const count = await outlineButtons.count()

			if (count > 0) {
				console.log(`Found ${count} outline buttons on ${pagePath}`)

				// Test first outline button on each page
				const firstButton = outlineButtons.first()

				// Validate consistent border styling
				const borderSpecs = await firstButton.evaluate(el => {
					const styles = window.getComputedStyle(el)
					return {
						borderWidth: styles.borderWidth,
						borderStyle: styles.borderStyle,
						borderRadius: styles.borderRadius,
						padding: styles.padding
					}
				})

				console.log(`${pagePath} button specs:`, borderSpecs)

				// Screenshot for cross-page consistency
				await expect(firstButton).toHaveScreenshot(`btn-outline-${pagePath.replace('/', 'home')}.png`)
			}
		}
	})

	test('should have perfect dark mode border rendering', async ({ page }) => {
		const outlineButton = page.locator('.btn-outline').first()

		// Switch to dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})
		await page.waitForTimeout(200)

		// Validate dark mode border
		const darkBorder = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).borderColor
		)
		const darkBackground = await outlineButton.evaluate(el =>
			window.getComputedStyle(el).backgroundColor
		)

		console.log('Dark mode border:', darkBorder)
		console.log('Dark mode background:', darkBackground)

		// Capture dark mode rendering
		await expect(outlineButton).toHaveScreenshot('btn-outline-dark-mode.png')

		// Test hover in dark mode
		await outlineButton.hover()
		await page.waitForTimeout(200)
		await expect(outlineButton).toHaveScreenshot('btn-outline-dark-hover.png')
	})
})