/**
 * UI/UX Validation Tests
 * Comprehensive testing for perfect UI/UX using Playwright
 */

import { expect, test } from '@playwright/test'
import { UITestHelper } from '../playwright-ui-helper'

test.describe('Magic UI Marketing Pages', () => {
	let helper: UITestHelper

	test.beforeEach(async ({ page }) => {
		helper = new UITestHelper(page)
	})

	test('Landing page has all Magic UI enhancements', async ({ page }) => {
		await page.goto('http://localhost:3005')

		// Validate Magic UI components are present
		const magicComponents = await helper.validateMagicUIComponents()
		expect(magicComponents.totalEnhancements).toBeGreaterThan(0)

		// Check animations are smooth
		const animationPerf = await helper.measureAnimationPerformance(
			'.animate-shimmer',
			1000
		)
		expect(animationPerf).toHaveProperty('averageFPS')
		expect(animationPerf.averageFPS).toBeGreaterThan(50) // Should be close to 60fps

		// Capture visual state
		await helper.captureVisualBaseline('landing-page-magic-ui')
	})

	test('Responsive design works across all breakpoints', async ({ page }) => {
		await page.goto('http://localhost:3005')

		const responsive = await helper.testResponsiveBreakpoints()

		// Verify we have screenshots for all breakpoints
		expect(responsive).toHaveLength(5)
		expect(responsive.map(r => r.breakpoint)).toEqual([
			'mobile',
			'tablet',
			'laptop',
			'desktop',
			'4k'
		])
	})

	test('Design system consistency', async ({ page }) => {
		await page.goto('http://localhost:3005')

		const styles = await helper.checkStyleConsistency()

		// Buttons should have consistent border radius
		expect(styles.buttons.borderRadius.length).toBeLessThanOrEqual(3)

		// Should use limited font families
		expect(styles.fonts.length).toBeLessThanOrEqual(3)
	})

	test('Accessibility compliance', async ({ page }) => {
		await page.goto('http://localhost:3005')

		const audit = await helper.runAccessibilityAudit()

		// All interactive elements should have labels
		expect(audit.keyboard.missingLabels).toBe(0)

		// Should have reasonable number of focusable elements
		expect(audit.keyboard.totalFocusable).toBeGreaterThan(5)
		expect(audit.keyboard.totalFocusable).toBeLessThan(100)
	})

	test('Performance metrics meet targets', async ({ page }) => {
		await page.goto('http://localhost:3005')

		const metrics = await helper.measurePerformance()

		// First Contentful Paint should be fast
		expect(metrics.FCP).toBeLessThan(2000)

		// DOM should load quickly
		expect(metrics.domContentLoaded).toBeLessThan(3000)

		// Reasonable resource count
		expect(metrics.resources).toBeLessThan(50)
	})
})

test.describe('Visual Regression Testing', () => {
	test('Pricing page matches baseline', async ({ page }) => {
		const helper = new UITestHelper(page)
		await page.goto('http://localhost:3005/pricing')

		// Disable animations for consistent screenshots
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

		await helper.captureVisualBaseline('pricing-page-baseline')
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
		await page.goto('http://localhost:3005/auth/login')

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
