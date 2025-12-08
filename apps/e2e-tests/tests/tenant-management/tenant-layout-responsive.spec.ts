/**
 * E2E Tests: Tenant Layout Responsive Behavior
 *
 * Tests task 4.3: Update tenant layout for mobile
 * Validates actual browser behavior for responsive layout
 *
 * Requirements:
 * - 2.2: Hide sidebar on mobile, show mobile navigation menu
 */

import { test, expect } from '@playwright/test'

test.describe('Tenant Layout Responsive Behavior', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to tenant portal (assumes auth is handled by test setup)
		await page.goto('/tenant')
	})

	test('hides sidebar on mobile viewport and shows mobile navigation', async ({
		page
	}) => {
		// Set mobile viewport (iPhone 12 Pro dimensions)
		await page.setViewportSize({ width: 390, height: 844 })

		// Wait for layout to render
		await page.waitForSelector('[data-testid="tenant-layout-root"]')

		// Sidebar should not be visible on mobile
		const sidebar = page.locator('[data-testid="tenant-layout-sidebar"]')
		await expect(sidebar).not.toBeVisible()

		// Mobile navigation should be visible
		const mobileNav = page.locator('[data-testid="tenant-mobile-nav-wrapper"]')
		await expect(mobileNav).toBeVisible()

		// Verify mobile nav is at the bottom (fixed positioning)
		const mobileNavBox = await mobileNav.boundingBox()
		const viewportHeight = page.viewportSize()?.height || 0
		expect(mobileNavBox).toBeTruthy()
		if (mobileNavBox) {
			// Mobile nav should be near the bottom of the viewport
			expect(mobileNavBox.y + mobileNavBox.height).toBeGreaterThan(
				viewportHeight - 100
			)
		}
	})

	test('shows sidebar on desktop viewport and hides mobile navigation', async ({
		page
	}) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 })

		// Wait for layout to render
		await page.waitForSelector('[data-testid="tenant-layout-root"]')

		// Sidebar should be visible on desktop
		const sidebar = page.locator('[data-testid="tenant-layout-sidebar"]')
		await expect(sidebar).toBeVisible()

		// Mobile navigation should not be visible on desktop
		const mobileNav = page.locator('[data-testid="tenant-mobile-nav-wrapper"]')
		await expect(mobileNav).not.toBeVisible()
	})

	test('maintains proper layout structure on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		// Wait for layout to render
		await page.waitForSelector('[data-testid="tenant-layout-root"]')

		// Main content area should be visible
		const mainColumn = page.locator('[data-testid="tenant-layout-main"]')
		await expect(mainColumn).toBeVisible()

		// Header should be visible
		const header = page.locator('header')
		await expect(header).toBeVisible()

		// Content should not overflow horizontally
		const layoutRoot = page.locator('[data-testid="tenant-layout-root"]')
		const layoutBox = await layoutRoot.boundingBox()
		const viewportWidth = page.viewportSize()?.width || 0

		expect(layoutBox).toBeTruthy()
		if (layoutBox) {
			// Layout width should not exceed viewport width
			expect(layoutBox.width).toBeLessThanOrEqual(viewportWidth)
		}
	})

	test('applies correct padding for mobile navigation clearance', async ({
		page
	}) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 390, height: 844 })

		// Wait for layout to render
		await page.waitForSelector('[data-testid="tenant-layout-root"]')

		// Get the layout root and mobile nav
		const layoutRoot = page.locator('[data-testid="tenant-layout-root"]')
		const mobileNav = page.locator('[data-testid="tenant-mobile-nav-wrapper"]')

		// Get bounding boxes
		const layoutBox = await layoutRoot.boundingBox()
		const mobileNavBox = await mobileNav.boundingBox()

		expect(layoutBox).toBeTruthy()
		expect(mobileNavBox).toBeTruthy()

		if (layoutBox && mobileNavBox) {
			// Layout should have bottom padding to prevent content from being hidden by mobile nav
			// The mobile nav is fixed at the bottom, so content should not extend behind it
			const contentBottom = layoutBox.y + layoutBox.height
			const navTop = mobileNavBox.y

			// Content should end before or at the nav starts (with some tolerance for padding)
			expect(contentBottom).toBeLessThanOrEqual(navTop + 100)
		}
	})

	test('transitions correctly between mobile and desktop viewports', async ({
		page
	}) => {
		// Start with mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })
		await page.waitForSelector('[data-testid="tenant-layout-root"]')

		// Verify mobile state
		let sidebar = page.locator('[data-testid="tenant-layout-sidebar"]')
		let mobileNav = page.locator('[data-testid="tenant-mobile-nav-wrapper"]')
		await expect(sidebar).not.toBeVisible()
		await expect(mobileNav).toBeVisible()

		// Resize to desktop
		await page.setViewportSize({ width: 1280, height: 720 })
		await page.waitForTimeout(100) // Allow for CSS transitions

		// Verify desktop state
		sidebar = page.locator('[data-testid="tenant-layout-sidebar"]')
		mobileNav = page.locator('[data-testid="tenant-mobile-nav-wrapper"]')
		await expect(sidebar).toBeVisible()
		await expect(mobileNav).not.toBeVisible()

		// Resize back to mobile
		await page.setViewportSize({ width: 375, height: 667 })
		await page.waitForTimeout(100) // Allow for CSS transitions

		// Verify mobile state again
		sidebar = page.locator('[data-testid="tenant-layout-sidebar"]')
		mobileNav = page.locator('[data-testid="tenant-mobile-nav-wrapper"]')
		await expect(sidebar).not.toBeVisible()
		await expect(mobileNav).toBeVisible()
	})

	test('mobile navigation items are touch-friendly (44px minimum)', async ({
		page
	}) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 390, height: 844 })

		// Wait for mobile nav to render
		await page.waitForSelector('[data-testid="tenant-mobile-nav-wrapper"]')

		// Get all navigation links
		const navLinks = page.locator(
			'[data-testid="tenant-mobile-nav-wrapper"] a, [data-testid="tenant-mobile-nav-wrapper"] button'
		)
		const count = await navLinks.count()

		expect(count).toBeGreaterThan(0)

		// Check each nav item has minimum 44px touch target
		for (let i = 0; i < count; i++) {
			const link = navLinks.nth(i)
			const box = await link.boundingBox()

			expect(box).toBeTruthy()
			if (box) {
				// Minimum 44px touch target (Tailwind's min-h-11 = 44px)
				expect(box.height).toBeGreaterThanOrEqual(44)
				expect(box.width).toBeGreaterThanOrEqual(44)
			}
		}
	})
})
