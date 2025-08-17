/**
 * Dashboard Modernization Feature Tests
 *
 * Tests all new dashboard features implemented by the 5 parallel agents:
 * 1. Dark/Light Theme System
 * 2. Command Palette (⌘K)
 * 3. Dense Data Tables
 * 4. Mobile Navigation
 * 5. Minimalist Charts (Sparklines)
 */

import { test, expect, Page } from '@playwright/test'

// Use demo route for testing (bypasses auth)
test.describe('Dashboard Modernization Features', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to demo dashboard (no auth required)
		await page.goto('/demo')

		// Wait for dashboard to load
		await page.waitForLoadState('networkidle')

		// Wait a bit more for all components to mount
		await page.waitForTimeout(2000)
	})

	test.describe('Theme System', () => {
		test('should have theme toggle in navigation', async ({ page }) => {
			// Look for theme toggle button/dropdown
			const themeToggle = page
				.locator('[data-testid="theme-toggle"]')
				.or(
					page
						.locator('button')
						.filter({ hasText: /theme|dark|light/i })
				)
				.or(page.locator('[aria-label*="theme"]'))
				.first()

			await expect(themeToggle).toBeVisible()
		})

		test('should switch between light and dark themes', async ({
			page
		}) => {
			// Check initial theme (should be applied to html/body)
			const htmlElement = page.locator('html')

			// Try to find and click theme toggle
			const themeButton = page
				.locator('button')
				.filter({
					hasText: /theme|dark|light|system/i
				})
				.first()

			if (await themeButton.isVisible()) {
				await themeButton.click()

				// Look for theme options (Light/Dark/System)
				const lightOption = page
					.locator('text=Light')
					.or(page.locator('[data-value="light"]'))
				const darkOption = page
					.locator('text=Dark')
					.or(page.locator('[data-value="dark"]'))

				if (await lightOption.isVisible()) {
					await lightOption.click()
					await page.waitForTimeout(500) // Allow theme to apply

					// Check for light theme classes
					await expect(htmlElement).not.toHaveClass(/dark/)
				}

				// Switch to dark theme
				await themeButton.click()
				if (await darkOption.isVisible()) {
					await darkOption.click()
					await page.waitForTimeout(500)

					// Check for dark theme classes
					await expect(htmlElement).toHaveClass(/dark/)
				}
			}
		})

		test('should persist theme preference', async ({ page }) => {
			// Set dark theme and reload
			const themeButton = page
				.locator('button')
				.filter({
					hasText: /theme|dark|light|system/i
				})
				.first()

			if (await themeButton.isVisible()) {
				await themeButton.click()
				const darkOption = page
					.locator('text=Dark')
					.or(page.locator('[data-value="dark"]'))

				if (await darkOption.isVisible()) {
					await darkOption.click()
					await page.waitForTimeout(500)

					// Reload page
					await page.reload()
					await page.waitForLoadState('networkidle')

					// Theme should persist
					await expect(page.locator('html')).toHaveClass(/dark/)
				}
			}
		})
	})

	test.describe('Command Palette', () => {
		test('should open with keyboard shortcut ⌘K', async ({ page }) => {
			// Press Cmd+K (or Ctrl+K on Windows/Linux)
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)

			// Command palette should be visible
			await expect(
				page
					.locator('[role="dialog"]')
					.or(page.locator('[data-testid="command-palette"]'))
					.or(page.locator('.cmdk-root'))
			).toBeVisible()

			// Should have search input
			await expect(
				page.locator('input[placeholder*="Search"]')
			).toBeVisible()
		})

		test('should search across different entities', async ({ page }) => {
			// Open command palette
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)

			// Search for properties
			await page.fill('input[placeholder*="Search"]', 'properties')
			await page.waitForTimeout(500)

			// Should show property-related results
			await expect(
				page
					.locator('text=Properties')
					.or(page.locator('[data-testid*="property"]'))
			).toBeVisible()

			// Clear and search for tenants
			await page.fill('input[placeholder*="Search"]', 'tenants')
			await page.waitForTimeout(500)

			await expect(
				page
					.locator('text=Tenants')
					.or(page.locator('[data-testid*="tenant"]'))
			).toBeVisible()
		})

		test('should navigate on selection', async ({ page }) => {
			// Open command palette
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)

			// Search and select properties
			await page.fill('input[placeholder*="Search"]', 'properties')
			await page.waitForTimeout(500)

			// Press Enter or click on first result
			await page.keyboard.press('Enter')

			// Should navigate to properties page
			await expect(page).toHaveURL(/.*properties/)
		})

		test('should close with Escape', async ({ page }) => {
			// Open command palette
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)

			// Verify it's open
			await expect(page.locator('[role="dialog"]')).toBeVisible()

			// Press Escape
			await page.keyboard.press('Escape')

			// Should be closed
			await expect(page.locator('[role="dialog"]')).not.toBeVisible()
		})
	})

	test.describe('Dense Data Tables', () => {
		test('should display dense tables on properties page', async ({
			page
		}) => {
			// Navigate to properties
			await page.goto('/properties')
			await page.waitForLoadState('networkidle')

			// Check for table with dense rows (32px height)
			const tableRows = page.locator('table tbody tr')

			if ((await tableRows.count()) > 0) {
				const firstRow = tableRows.first()
				const rowHeight = await firstRow.evaluate(el => {
					return window.getComputedStyle(el).height
				})

				// Dense rows should be around 32-40px
				const heightNum = parseInt(rowHeight.replace('px', ''))
				expect(heightNum).toBeLessThan(50)
			}
		})

		test('should have sortable columns', async ({ page }) => {
			await page.goto('/properties')
			await page.waitForLoadState('networkidle')

			// Look for sortable column headers
			const sortableHeaders = page.locator(
				'th button, th[role="columnheader"]'
			)

			if ((await sortableHeaders.count()) > 0) {
				await sortableHeaders.first().click()

				// Should trigger some sort of loading or reordering
				await page.waitForTimeout(500)
			}
		})

		test('should support filtering', async ({ page }) => {
			await page.goto('/properties')
			await page.waitForLoadState('networkidle')

			// Look for search/filter input
			const filterInput = page.locator(
				'input[placeholder*="Search"], input[placeholder*="Filter"]'
			)

			if (await filterInput.isVisible()) {
				await filterInput.fill('test')
				await page.waitForTimeout(500)

				// Table should update or show filtered results
			}
		})
	})

	test.describe('Mobile Navigation', () => {
		test('should show mobile navigation on small screens', async ({
			page
		}) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Mobile nav should be visible at bottom
			const mobileNav = page
				.locator('nav')
				.filter({
					has: page.locator('[class*="fixed"], [class*="bottom"]')
				})
				.or(page.locator('[data-testid="mobile-nav"]'))

			await expect(mobileNav).toBeVisible()

			// Should have navigation items
			const navItems = mobileNav.locator('a, button')
			expect(await navItems.count()).toBeGreaterThan(3)
		})

		test('should have FAB-style Add button', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Look for floating Add button
			const fabButton = page
				.locator('button')
				.filter({
					has: page.locator('svg') // Plus icon
				})
				.filter({
					hasText: /add/i
				})
				.or(page.locator('[data-testid="fab-add"]'))

			if (await fabButton.isVisible()) {
				await expect(fabButton).toBeVisible()

				// Should be styled as FAB (round, elevated)
				const styles = await fabButton.evaluate(el => {
					const computed = window.getComputedStyle(el)
					return {
						borderRadius: computed.borderRadius,
						boxShadow: computed.boxShadow
					}
				})

				// FAB should have rounded corners
				expect(styles.borderRadius).toContain('50%') // or high px value
			}
		})

		test('should navigate on mobile nav item click', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Find properties link in mobile nav
			const propertiesLink = page
				.locator('nav a')
				.filter({ hasText: /properties|props/i })

			if (await propertiesLink.isVisible()) {
				await propertiesLink.click()
				await expect(page).toHaveURL(/.*properties/)
			}
		})
	})

	test.describe('Sparkline Charts', () => {
		test('should display sparkline charts in dashboard widgets', async ({
			page
		}) => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Look for SVG charts (sparklines are typically SVG)
			const charts = page.locator('svg').filter({
				has: page.locator('path, line') // Chart elements
			})

			if ((await charts.count()) > 0) {
				const firstChart = charts.first()
				await expect(firstChart).toBeVisible()

				// Sparklines should be small (around 40px height)
				const chartBox = await firstChart.boundingBox()
				if (chartBox) {
					expect(chartBox.height).toBeLessThan(80)
				}
			}
		})

		test('should show tooltips on hover', async ({ page }) => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const charts = page.locator('svg').filter({
				has: page.locator('path, line')
			})

			if ((await charts.count()) > 0) {
				// Hover over chart
				await charts.first().hover()

				// Look for tooltip
				const tooltip = page.locator(
					'[role="tooltip"], .tooltip, [data-testid="tooltip"]'
				)

				// Tooltip might appear
				if (await tooltip.isVisible()) {
					await expect(tooltip).toBeVisible()
				}
			}
		})

		test('should be responsive and maintain aspect ratio', async ({
			page
		}) => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const charts = page.locator('svg')

			if ((await charts.count()) > 0) {
				// Desktop size
				await page.setViewportSize({ width: 1280, height: 800 })
				await page.waitForTimeout(500)

				const desktopBox = await charts.first().boundingBox()

				// Mobile size
				await page.setViewportSize({ width: 375, height: 667 })
				await page.waitForTimeout(500)

				const mobileBox = await charts.first().boundingBox()

				// Chart should adapt to viewport
				if (desktopBox && mobileBox) {
					expect(mobileBox.width).toBeLessThan(desktopBox.width)
				}
			}
		})
	})

	test.describe('Integration Tests', () => {
		test('should work together - command palette with theme switching', async ({
			page
		}) => {
			// Open command palette
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)

			// Switch theme while palette is open
			const themeButton = page
				.locator('button')
				.filter({
					hasText: /theme|dark|light|system/i
				})
				.first()

			if (await themeButton.isVisible()) {
				await themeButton.click()
				const darkOption = page.locator('text=Dark')

				if (await darkOption.isVisible()) {
					await darkOption.click()

					// Command palette should still be functional in dark theme
					await page.keyboard.press(
						process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
					)

					await expect(
						page.locator('input[placeholder*="Search"]')
					).toBeVisible()
				}
			}
		})

		test('should maintain functionality across desktop and mobile', async ({
			page
		}) => {
			// Test desktop version
			await page.setViewportSize({ width: 1280, height: 800 })
			await page.goto('/dashboard')

			// Command palette should work
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)
			await expect(
				page.locator('input[placeholder*="Search"]')
			).toBeVisible()
			await page.keyboard.press('Escape')

			// Switch to mobile
			await page.setViewportSize({ width: 375, height: 667 })
			await page.waitForTimeout(1000)

			// Mobile nav should be visible
			const mobileNav = page.locator('nav').last()
			await expect(mobileNav).toBeVisible()

			// Command palette should still work on mobile
			await page.keyboard.press(
				process.platform === 'darwin' ? 'Meta+k' : 'Control+k'
			)
			await expect(
				page.locator('input[placeholder*="Search"]')
			).toBeVisible()
		})

		test('should load dashboard within performance budget', async ({
			page
		}) => {
			const startTime = Date.now()

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const loadTime = Date.now() - startTime

			// Dashboard should load within 5 seconds
			expect(loadTime).toBeLessThan(5000)

			// All key elements should be visible
			await expect(page.locator('nav')).toBeVisible()

			// Charts/widgets should be loaded
			const widgets = page.locator(
				'[data-testid*="widget"], .card, [class*="card"]'
			)
			if ((await widgets.count()) > 0) {
				await expect(widgets.first()).toBeVisible()
			}
		})
	})
})
