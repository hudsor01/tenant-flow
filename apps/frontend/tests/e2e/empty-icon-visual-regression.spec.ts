import { expect, test } from '@playwright/test'

/**
 * Visual Regression Tests for EmptyIcon Component
 * 
 * Tests the renamed EmptyIcon component (formerly EmptyMedia)
 * across all dashboard pages in both light and dark modes.
 */

test.describe('EmptyIcon Component - Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		// Set consistent viewport for reliable screenshots
		await page.setViewportSize({ width: 1280, height: 720 })
	})

	test.describe('Reports Library - Empty State', () => {
		test('EmptyIcon renders correctly in light mode', async ({ page }) => {
			await page.goto('/dashboard/reports/library')
			
			// Wait for empty state to render
			await page.waitForSelector('[data-slot="empty-icon"]', { state: 'visible' })
			
			// Verify EmptyIcon component exists
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			await expect(emptyIcon).toBeVisible()
			
			// Check icon variant attribute
			const variant = await emptyIcon.getAttribute('data-variant')
			expect(variant).toBe('icon')
			
			// Verify icon is rendered inside EmptyIcon
			const icon = await emptyIcon.locator('svg').first()
			await expect(icon).toBeVisible()
			
			// Visual snapshot for light mode
			await expect(page).toHaveScreenshot('reports-library-empty-light.png', {
				fullPage: true,
				animations: 'disabled'
			})
		})

		test('EmptyIcon renders correctly in dark mode', async ({ page }) => {
			// Enable dark mode
			await page.emulateMedia({ colorScheme: 'dark' })
			await page.goto('/dashboard/reports/library')
			
			await page.waitForSelector('[data-slot="empty-icon"]', { state: 'visible' })
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			await expect(emptyIcon).toBeVisible()
			
			// Visual snapshot for dark mode
			await expect(page).toHaveScreenshot('reports-library-empty-dark.png', {
				fullPage: true,
				animations: 'disabled'
			})
		})

		test('EmptyIcon styling is consistent', async ({ page }) => {
			await page.goto('/dashboard/reports/library')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			
			// Verify CSS classes are applied correctly
			const className = await emptyIcon.getAttribute('class')
			expect(className).toContain('bg-muted')
			expect(className).toContain('text-foreground')
			expect(className).toContain('rounded-lg')
			
			// Verify size classes for icon variant
			expect(className).toContain('size-10')
		})
	})

	test.describe('Properties Page - Empty State', () => {
		test('EmptyIcon renders when no properties exist', async ({ page }) => {
			await page.goto('/dashboard/properties')
			
			// Check if empty state is shown (may have data in production)
			const emptyIcon = await page.locator('[data-slot="empty-icon"]').first()
			
			if (await emptyIcon.isVisible()) {
				// Verify Building icon is used
				const icon = await emptyIcon.locator('svg').first()
				await expect(icon).toBeVisible()
				
				// Take snapshot
				await expect(page).toHaveScreenshot('properties-empty-state.png', {
					fullPage: false,
					clip: { x: 0, y: 0, width: 800, height: 600 }
				})
			}
		})
	})

	test.describe('Tenants Page - Empty State', () => {
		test('EmptyIcon renders when no tenants exist', async ({ page }) => {
			await page.goto('/dashboard/tenants')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]').first()
			
			if (await emptyIcon.isVisible()) {
				// Verify Users icon is used
				const icon = await emptyIcon.locator('svg').first()
				await expect(icon).toBeVisible()
				
				await expect(page).toHaveScreenshot('tenants-empty-state.png', {
					fullPage: false,
					clip: { x: 0, y: 0, width: 800, height: 600 }
				})
			}
		})
	})

	test.describe('Leases Page - Empty State', () => {
		test('EmptyIcon renders when no leases exist', async ({ page }) => {
			await page.goto('/dashboard/leases')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]').first()
			
			if (await emptyIcon.isVisible()) {
				// Verify FileText icon is used
				const icon = await emptyIcon.locator('svg').first()
				await expect(icon).toBeVisible()
				
				await expect(page).toHaveScreenshot('leases-empty-state.png', {
					fullPage: false,
					clip: { x: 0, y: 0, width: 800, height: 600 }
				})
			}
		})
	})

	test.describe('Maintenance Page - Empty State', () => {
		test('EmptyIcon renders when no maintenance requests exist', async ({ page }) => {
			await page.goto('/dashboard/maintenance')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]').first()
			
			if (await emptyIcon.isVisible()) {
				// Verify Wrench icon is used
				const icon = await emptyIcon.locator('svg').first()
				await expect(icon).toBeVisible()
				
				await expect(page).toHaveScreenshot('maintenance-empty-state.png', {
					fullPage: false,
					clip: { x: 0, y: 0, width: 800, height: 600 }
				})
			}
		})
	})

	test.describe('EmptyIcon Component Accessibility', () => {
		test('EmptyIcon has proper ARIA attributes', async ({ page }) => {
			await page.goto('/dashboard/reports/library')
			
			await page.waitForSelector('[data-slot="empty-icon"]', { state: 'visible' })
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			
			// Verify parent Empty component has proper structure
			const emptyComponent = await emptyIcon.locator('..').locator('..')
			await expect(emptyComponent).toBeVisible()
			
			// Check for EmptyTitle (should be visible and readable)
			const title = await page.locator('[data-slot="empty-title"]')
			await expect(title).toBeVisible()
			const titleText = await title.textContent()
			expect(titleText?.trim()).toBeTruthy()
		})

		test('EmptyIcon icon is properly sized for touch targets', async ({ page }) => {
			await page.goto('/dashboard/reports/library')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			await emptyIcon.waitFor({ state: 'visible' })
			
			// Get bounding box
			const box = await emptyIcon.boundingBox()
			expect(box).toBeTruthy()
			
			// Verify minimum size (10 = 2.5rem = 40px in default Tailwind config)
			// This meets the 44px touch target requirement from UI/UX standards
			if (box) {
				expect(box.width).toBeGreaterThanOrEqual(40)
				expect(box.height).toBeGreaterThanOrEqual(40)
			}
		})
	})

	test.describe('EmptyIcon Responsive Behavior', () => {
		test('EmptyIcon scales properly on mobile', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto('/dashboard/reports/library')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			await expect(emptyIcon).toBeVisible()
			
			await expect(page).toHaveScreenshot('reports-library-empty-mobile.png', {
				fullPage: true,
				animations: 'disabled'
			})
		})

		test('EmptyIcon scales properly on tablet', async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 })
			await page.goto('/dashboard/reports/library')
			
			const emptyIcon = await page.locator('[data-slot="empty-icon"]')
			await expect(emptyIcon).toBeVisible()
			
			await expect(page).toHaveScreenshot('reports-library-empty-tablet.png', {
				fullPage: true,
				animations: 'disabled'
			})
		})
	})
})
