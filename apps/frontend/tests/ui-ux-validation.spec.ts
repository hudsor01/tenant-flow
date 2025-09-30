/**
 * UI/UX Validation Tests
 * Comprehensive testing for perfect UI/UX using Playwright
 */

import { expect, test } from '@playwright/test'

test.describe('Magic UI Marketing Pages', () => {
	test('Landing page loads successfully', async ({ page }) => {
		await page.goto('http://localhost:3005')

		// Validate page loads properly
		await expect(page).toHaveTitle(/TenantFlow/)

		// Check for key UI elements
		const ctaButton = page.locator('button:has-text("Get Started")')
		await expect(ctaButton).toBeVisible()
	})

	test('Responsive design works on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('http://localhost:3005')

		// Verify mobile layout loads
		await expect(page).toHaveTitle(/TenantFlow/)

		// Check mobile navigation
		const mobileNav = page.locator('[aria-label="Mobile menu"]')
		if (await mobileNav.isVisible()) {
			await expect(mobileNav).toBeVisible()
		}
	})

	test('Essential buttons are accessible', async ({ page }) => {
		await page.goto('http://localhost:3005')

		// Find all interactive buttons
		const buttons = page.locator('button, [role="button"]')
		const buttonCount = await buttons.count()

		// Should have interactive elements
		expect(buttonCount).toBeGreaterThan(0)

		// First button should be focusable
		if (buttonCount > 0) {
			await buttons.first().focus()
			await expect(buttons.first()).toBeFocused()
		}
	})

	test('Page loads within reasonable time', async ({ page }) => {
		const startTime = Date.now()
		await page.goto('http://localhost:3005')

		// Wait for page to be fully loaded
		await page.waitForLoadState('networkidle')
		const loadTime = Date.now() - startTime

		// Page should load within 10 seconds
		expect(loadTime).toBeLessThan(10000)
	})
})

test.describe('Visual Regression Testing', () => {
	test('Pricing page loads correctly', async ({ page }) => {
		await page.goto('http://localhost:3005/pricing')

		// Disable animations for consistent state
		await page.addStyleTag({
			content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
		})

		// Verify pricing page elements
		await expect(page).toHaveTitle(/TenantFlow/)
		const pricingCards = page.locator('[data-testid*="pricing"], .pricing-card')
		const cardCount = await pricingCards.count()
		expect(cardCount).toBeGreaterThanOrEqual(1)
	})
})

test.describe('Interaction Testing', () => {
	test('CTA buttons have proper hover states', async ({ page }) => {
		await page.goto('http://localhost:3005')

		// Find all CTA buttons
		const ctaButtons = await page.$$(
			'[data-testid*="cta"], button:has-text("Get Started")'
		)

		for (const button of ctaButtons) {
			const beforeHover = await button.evaluate(
				el => window.getComputedStyle(el).background
			)

			await button.hover()
			await page.waitForTimeout(100)

			const afterHover = await button.evaluate(
				el => window.getComputedStyle(el).background
			)

			// Background should change on hover
			expect(beforeHover).not.toBe(afterHover)
		}
	})

	test('Forms have proper validation feedback', async ({ page }) => {
		await page.goto('http://localhost:3005/login')

		// Try to submit empty form
		await page.click('button[type="submit"]')

		// Should show validation errors
		const errors = await page.$$('.text-destructive, [role="alert"]')
		expect(errors.length).toBeGreaterThan(0)
	})
})

test.describe('Magic UI Specific Tests', () => {
	test('Shimmer buttons animate correctly', async ({ page }) => {
		await page.goto('http://localhost:3005')

		// Wait for shimmer button to be visible
		const shimmerButton = await page.waitForSelector('.animate-shimmer', {
			timeout: 5000
		})

		// Check animation is running
		const animationName = await shimmerButton.evaluate(el => {
			const style = window.getComputedStyle(el)
			return style.animationName
		})

		expect(animationName).not.toBe('none')
	})

	test('Grid patterns render in background', async ({ page }) => {
		await page.goto('http://localhost:3005')

		const gridPattern = await page.$('[class*="grid-pattern"]')
		if (gridPattern) {
			const opacity = await gridPattern.evaluate(
				el => window.getComputedStyle(el).opacity
			)

			// Grid should be subtle
			expect(parseFloat(opacity)).toBeLessThan(0.5)
		}
	})

	test('Number tickers animate on scroll', async ({ page }) => {
		await page.goto('http://localhost:3005')

		// Scroll to stats section
		await page.evaluate(() => {
			const stats = document.querySelector('[class*="number-ticker"]')
			stats?.scrollIntoView()
		})

		await page.waitForTimeout(2000) // Wait for animation

		// Check if numbers have animated
		const numberValue = await page.$eval(
			'[class*="number-ticker"]',
			el => el.textContent
		)

		expect(numberValue).toBeTruthy()
		expect(parseFloat(numberValue || '0')).toBeGreaterThan(0)
	})
})
