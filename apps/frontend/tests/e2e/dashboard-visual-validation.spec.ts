import { test, expect } from '@playwright/test'

/**
 * Dashboard Visual Validation Tests
 * 
 * These tests capture screenshots to validate that our dashboard layout
 * matches the TailAdmin template structure and styling
 */

test.describe('Dashboard Visual Layout Validation', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to dashboard - skip auth for visual testing
		await page.goto('/dashboard')
		
		// Wait for dashboard content to load
		await page.waitForLoadState('networkidle')
		
		// Wait for any animations to complete
		await page.waitForTimeout(1000)
	})

	test('Dashboard overview page layout', async ({ page }) => {
		// Take full page screenshot for layout validation
		await expect(page).toHaveScreenshot('dashboard-overview-full.png', {
			fullPage: true,
			animations: 'disabled'
		})
		
		// Take viewport screenshot for above-fold content
		await expect(page).toHaveScreenshot('dashboard-overview-viewport.png', {
			animations: 'disabled'
		})
	})

	test('Dashboard sidebar and navigation', async ({ page }) => {
		// Focus on sidebar navigation
		const sidebar = page.locator('aside')
		await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png')
		
		// Test sidebar expanded state
		await expect(sidebar).toBeVisible()
		await expect(sidebar).toContainText('Property Management')
		await expect(sidebar).toContainText('Administration')
	})

	test('Dashboard header and user controls', async ({ page }) => {
		// Focus on header area
		const header = page.locator('header, nav').first()
		if (await header.isVisible()) {
			await expect(header).toHaveScreenshot('dashboard-header.png')
		}
	})

	test('Dashboard main content grid', async ({ page }) => {
		// Focus on main dashboard content area
		const mainContent = page.locator('main, [role="main"]').first()
		if (await mainContent.isVisible()) {
			await expect(mainContent).toHaveScreenshot('dashboard-main-content.png')
		} else {
			// Fallback to capturing the main dashboard container
			const dashboardContainer = page.locator('.mx-auto.max-w-\\[--breakpoint-2xl\\]').first()
			await expect(dashboardContainer).toHaveScreenshot('dashboard-main-content.png')
		}
	})

	test('Dashboard cards and metrics layout', async ({ page }) => {
		// Look for dashboard cards/metrics
		const cards = page.locator('[class*="card"], [class*="rounded-2xl"], .bg-white')
		const cardCount = await cards.count()
		
		if (cardCount > 0) {
			// Take screenshot of first few cards
			for (let i = 0; i < Math.min(3, cardCount); i++) {
				await expect(cards.nth(i)).toHaveScreenshot(`dashboard-card-${i + 1}.png`)
			}
		}
	})

	test('Properties page layout', async ({ page }) => {
		await page.goto('/dashboard/properties')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)
		
		await expect(page).toHaveScreenshot('properties-page-full.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('Tenants page layout', async ({ page }) => {
		await page.goto('/dashboard/tenants')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)
		
		await expect(page).toHaveScreenshot('tenants-page-full.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('Mobile responsive layout', async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)
		
		await expect(page).toHaveScreenshot('dashboard-mobile.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('Tablet responsive layout', async ({ page }) => {
		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)
		
		await expect(page).toHaveScreenshot('dashboard-tablet.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})
})

test.describe('Dashboard Component Structure Validation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	test('Validate TailAdmin layout structure', async ({ page }) => {
		// Check for key TailAdmin layout elements
		
		// Sidebar structure
		const sidebar = page.locator('aside')
		await expect(sidebar).toBeVisible()
		await expect(sidebar).toHaveClass(/bg-sidebar/)
		
		// Main content area
		const mainContent = page.locator('.mx-auto.max-w-\\[--breakpoint-2xl\\]')
		await expect(mainContent).toBeVisible()
		
		// Check for TailAdmin-style cards
		const cards = page.locator('.rounded-2xl.border.border-\\[--color-stroke\\]')
		expect(await cards.count()).toBeGreaterThan(0)
		
		// Validate color scheme classes
		const darkModeElements = page.locator('.dark\\:bg-\\[--color-boxdark\\]')
		expect(await darkModeElements.count()).toBeGreaterThan(0)
	})

	test('Validate navigation menu structure', async ({ page }) => {
		const navItems = [
			'Dashboard',
			'Properties', 
			'Tenants',
			'Leases',
			'Payments',
			'Maintenance'
		]
		
		for (const item of navItems) {
			await expect(page.locator('nav').getByText(item)).toBeVisible()
		}
	})
})
