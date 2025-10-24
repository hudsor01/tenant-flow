import { expect, test } from '@playwright/test'

/**
 * Visual Regression Tests for Layout Changes
 * 
 * Purpose: Verify that layout changes don't introduce visual regressions
 * across different pages and components.
 * 
 * Test Strategy:
 * - Full page screenshots for major layout changes
 * - Component-level screenshots for specific UI elements
 * - Responsive design verification (desktop, tablet, mobile)
 * - Dark/light theme consistency (if applicable)
 * 
 * Visual Test Best Practices (2025):
 * - Use maxDiffPixels to allow small rendering differences (fonts, anti-aliasing)
 * - Disable animations for consistent screenshots
 * - Test at multiple viewport sizes
 * - Use descriptive screenshot names (page-component-state.png)
 */

test.describe('Protected Pages - Layout Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		// Wait for authentication to load
		await page.waitForLoadState('networkidle')
	})

	test.describe('Dashboard Layout', () => {
		test('should render manage dashboard layout correctly', async ({ page }) => {
			await page.goto('/manage')
			await page.waitForLoadState('networkidle')
			
			// Wait for sidebar to be fully loaded
			await page.waitForSelector('text=TenantFlow', { timeout: 10000 })
			
			// Verify key elements are visible before screenshot
			await expect(page.locator('text=Dashboard')).toBeVisible()
			await expect(page.locator('text=Properties')).toBeVisible()
			await expect(page.locator('text=Tenants')).toBeVisible()
			
			// Full page screenshot
			await expect(page).toHaveScreenshot('manage-dashboard-layout.png', {
				fullPage: true,
				maxDiffPixels: 150
			})
		})

		test('should render dashboard header correctly', async ({ page }) => {
			await page.goto('/manage')
			await page.waitForLoadState('networkidle')
			
			const header = page.locator('header')
			await expect(header).toBeVisible()
			
			await expect(header).toHaveScreenshot('dashboard-header.png', {
				maxDiffPixels: 50
			})
		})

		test('should render sidebar navigation correctly', async ({ page }) => {
			await page.goto('/manage')
			await page.waitForLoadState('networkidle')
			
			// Get sidebar container
			const sidebar = page.locator('[data-testid="sidebar"]').or(
				page.locator('nav').first()
			)
			
			await expect(sidebar).toHaveScreenshot('sidebar-navigation.png', {
				maxDiffPixels: 75
			})
		})
	})

	test.describe('Properties Page Layout', () => {
		test('should render properties list layout correctly', async ({ page }) => {
			await page.goto('/manage/properties')
			await page.waitForLoadState('networkidle')
			
			// Wait for page content to load
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('properties-page-layout.png', {
				fullPage: true,
				maxDiffPixels: 150
			})
		})

		test('should render properties table/card view correctly', async ({ page }) => {
			await page.goto('/manage/properties')
			await page.waitForLoadState('networkidle')
			
			// Wait for table or cards to render
			const contentArea = page.locator('main, [role="main"]')
			await expect(contentArea).toBeVisible()
			
			await expect(contentArea).toHaveScreenshot('properties-content.png', {
				maxDiffPixels: 100
			})
		})
	})

	test.describe('Tenants Page Layout', () => {
		test('should render tenants list layout correctly', async ({ page }) => {
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')
			
			// Wait for page to fully render
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('tenants-page-layout.png', {
				fullPage: true,
				maxDiffPixels: 150
			})
		})

		test('should render tenants table correctly', async ({ page }) => {
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')
			
			// Wait for table to render
			const tableArea = page.locator('table, [role="table"]').or(
				page.locator('main')
			)
			await expect(tableArea).toBeVisible()
			
			await expect(tableArea).toHaveScreenshot('tenants-table.png', {
				maxDiffPixels: 100
			})
		})
	})

	test.describe('Maintenance Page Layout', () => {
		test('should render maintenance list layout correctly', async ({ page }) => {
			await page.goto('/manage/maintenance')
			await page.waitForLoadState('networkidle')
			
			// Wait for content to load
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('maintenance-page-layout.png', {
				fullPage: true,
				maxDiffPixels: 150
			})
		})
	})

	test.describe('Leases Page Layout', () => {
		test('should render leases list layout correctly', async ({ page }) => {
			await page.goto('/manage/leases')
			await page.waitForLoadState('networkidle')
			
			// Wait for page to render
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('leases-page-layout.png', {
				fullPage: true,
				maxDiffPixels: 150
			})
		})
	})

	test.describe('Units Page Layout', () => {
		test('should render units list layout correctly', async ({ page }) => {
			await page.goto('/manage/properties/units')
			await page.waitForLoadState('networkidle')
			
			// Wait for content to load
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('units-page-layout.png', {
				fullPage: true,
				maxDiffPixels: 150
			})
		})
	})

	test.describe('Analytics Pages Layout', () => {
		test('should render financial analytics layout correctly', async ({ page }) => {
			await page.goto('/manage/analytics/financial')
			await page.waitForLoadState('networkidle')
			
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('analytics-financial-layout.png', {
				fullPage: true,
				maxDiffPixels: 200 // Charts may have slight rendering differences
			})
		})

		test('should render maintenance analytics layout correctly', async ({ page }) => {
			await page.goto('/manage/analytics/maintenance')
			await page.waitForLoadState('networkidle')
			
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('analytics-maintenance-layout.png', {
				fullPage: true,
				maxDiffPixels: 200
			})
		})

		test('should render occupancy analytics layout correctly', async ({ page }) => {
			await page.goto('/manage/analytics/occupancy')
			await page.waitForLoadState('networkidle')
			
			await page.waitForSelector('h1, h2', { timeout: 10000 })
			
			await expect(page).toHaveScreenshot('analytics-occupancy-layout.png', {
				fullPage: true,
				maxDiffPixels: 200
			})
		})
	})
})

test.describe('Responsive Design - Visual Regression', () => {
	const viewports = [
		{ name: 'mobile', width: 375, height: 667 }, // iPhone SE
		{ name: 'tablet', width: 768, height: 1024 }, // iPad
		{ name: 'desktop', width: 1280, height: 720 } // Standard desktop
	]

	for (const viewport of viewports) {
		test.describe(`${viewport.name} viewport`, () => {
			test.use({ viewport: { width: viewport.width, height: viewport.height } })

			test(`should render manage dashboard correctly on ${viewport.name}`, async ({ page }) => {
				await page.goto('/manage')
				await page.waitForLoadState('networkidle')
				
				// Wait for content to load
				await page.waitForSelector('text=TenantFlow', { timeout: 10000 })
				
				await expect(page).toHaveScreenshot(`manage-dashboard-${viewport.name}.png`, {
					fullPage: true,
					maxDiffPixels: 150
				})
			})

			test(`should render properties page correctly on ${viewport.name}`, async ({ page }) => {
				await page.goto('/manage/properties')
				await page.waitForLoadState('networkidle')
				
				await page.waitForSelector('h1, h2', { timeout: 10000 })
				
				await expect(page).toHaveScreenshot(`properties-page-${viewport.name}.png`, {
					fullPage: true,
					maxDiffPixels: 150
				})
			})

			test(`should render tenants page correctly on ${viewport.name}`, async ({ page }) => {
				await page.goto('/manage/tenants')
				await page.waitForLoadState('networkidle')
				
				await page.waitForSelector('h1, h2', { timeout: 10000 })
				
				await expect(page).toHaveScreenshot(`tenants-page-${viewport.name}.png`, {
					fullPage: true,
					maxDiffPixels: 150
				})
			})
		})
	}
})

test.describe('Component-Level Visual Regression', () => {
	test('should render card components consistently', async ({ page }) => {
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')
		
		// Find any card component
		const card = page.locator('[class*="card"]').or(
			page.locator('[class*="Card"]')
		).first()
		
		if (await card.isVisible()) {
			await expect(card).toHaveScreenshot('card-component.png', {
				maxDiffPixels: 50
			})
		}
	})

	test('should render button styles consistently', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		
		// Find primary action button
		const primaryButton = page.locator('button[class*="primary"]').or(
			page.locator('button').first()
		)
		
		if (await primaryButton.isVisible()) {
			await expect(primaryButton).toHaveScreenshot('button-primary.png', {
				maxDiffPixels: 30
			})
		}
	})

	test('should render form inputs consistently', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		
		// Find search or filter input
		const input = page.locator('input[type="text"]').first()
		
		if (await input.isVisible()) {
			await expect(input).toHaveScreenshot('input-field.png', {
				maxDiffPixels: 30
			})
		}
	})

	test('should render table headers consistently', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		
		// Find table header
		const tableHeader = page.locator('thead, [role="rowgroup"]').first()
		
		if (await tableHeader.isVisible()) {
			await expect(tableHeader).toHaveScreenshot('table-header.png', {
				maxDiffPixels: 50
			})
		}
	})
})

test.describe('Empty States - Visual Regression', () => {
	test('should render empty state correctly when no data exists', async ({ page }) => {
		// Note: This assumes you have empty state handling
		// You may need to mock the API to return empty data
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		
		// Wait for page to render
		await page.waitForTimeout(2000)
		
		// Check if empty state is visible
		const emptyState = page.locator('text=/no.*properties/i').or(
			page.locator('[data-testid="empty-state"]')
		)
		
		if (await emptyState.isVisible()) {
			await expect(page).toHaveScreenshot('properties-empty-state.png', {
				fullPage: true,
				maxDiffPixels: 100
			})
		}
	})
})

test.describe('Loading States - Visual Regression', () => {
	test('should render loading skeleton consistently', async ({ page }) => {
		// Intercept API calls to delay response and capture loading state
		await page.route('**/api/**', route => {
			// Delay response by 1 second
			setTimeout(() => route.continue(), 1000)
		})
		
		const navigationPromise = page.goto('/manage/properties')
		
		// Wait a bit for loading state to appear
		await page.waitForTimeout(500)
		
		// Try to capture loading state
		const loadingIndicator = page.locator('[data-testid="loading"]').or(
			page.locator('[class*="skeleton"]')
		).first()
		
		if (await loadingIndicator.isVisible()) {
			await expect(page).toHaveScreenshot('loading-state.png', {
				maxDiffPixels: 100
			})
		}
		
		// Wait for navigation to complete
		await navigationPromise
	})
})
