import { expect, test } from '@playwright/test'

test.describe('Dashboard Layout - Card-Based Design', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to manage dashboard
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')
	})

	test('should display manage dashboard with card-based layout', async ({
		page
	}) => {
		// Wait for the layout to be fully rendered
		await page.waitForSelector('text=TenantFlow', { timeout: 10000 })

		// Verify sidebar cards are visible
		const brandCard = page.locator('text=TenantFlow').first()
		await expect(brandCard).toBeVisible()

		// Verify search card
		const searchInput = page.locator('input[placeholder*="Search"]')
		await expect(searchInput).toBeVisible()

		// Verify navigation is visible
		await expect(page.locator('text=Dashboard')).toBeVisible()
		await expect(page.locator('text=Properties')).toBeVisible()
		await expect(page.locator('text=Tenants')).toBeVisible()

		// Verify settings is visible at bottom
		await expect(page.locator('text=Settings')).toBeVisible()

		// Verify header with user profile
		const header = page.locator('header')
		await expect(header).toBeVisible()

		// Take full page screenshot
		await expect(page).toHaveScreenshot('manage-dashboard-full.png', {
			fullPage: true,
			maxDiffPixels: 100
		})
	})

	test('should display sidebar cards with proper spacing', async ({ page }) => {
		// Verify light blue background is visible
		const body = page.locator('body')
		await expect(body).toHaveCSS('background-color', 'rgb(240, 244, 251)') // #f0f4fb

		// Take screenshot of sidebar area
		const sidebar = page
			.locator('div')
			.filter({ hasText: 'TenantFlow' })
			.first()
		await expect(sidebar).toHaveScreenshot('sidebar-cards.png', {
			maxDiffPixels: 50
		})
	})

	test('should display header card with user profile', async ({ page }) => {
		// Verify header structure
		const header = page.locator('header')
		await expect(header).toBeVisible()

		// Verify user profile is on the right side
		const userMenu = page.getByTestId('user-menu')
		await expect(userMenu).toBeVisible()

		// Take screenshot of header
		await expect(header).toHaveScreenshot('header-with-profile.png', {
			maxDiffPixels: 50
		})
	})

	test('should display navigation without scrollbar', async ({ page }) => {
		// Get the navigation container
		const navContainer = page
			.locator('div')
			.filter({ hasText: 'Dashboard' })
			.filter({ hasText: 'Properties' })
			.first()

		// Verify no scrollbar is needed (overflow should be visible)
		const overflow = await navContainer.evaluate(
			el => window.getComputedStyle(el).overflow
		)
		expect(overflow).not.toBe('scroll')
		expect(overflow).not.toBe('auto')

		// Take screenshot showing all nav items visible
		await expect(navContainer).toHaveScreenshot('navigation-no-scroll.png', {
			maxDiffPixels: 50
		})
	})

	test('should maintain card borders and rounded corners', async ({ page }) => {
		// Verify brand card has proper styling
		const brandCard = page.locator('text=TenantFlow').locator('..')
		const borderRadius = await brandCard.evaluate(
			el => window.getComputedStyle(el).borderRadius
		)
		const border = await brandCard.evaluate(
			el => window.getComputedStyle(el).border
		)

		// Rounded corners should be 12px (0.75rem)
		expect(borderRadius).toContain('12px')

		// Border should be visible
		expect(border).toContain('1px')

		// Take close-up screenshot of a card
		await expect(brandCard).toHaveScreenshot('card-styling.png', {
			maxDiffPixels: 20
		})
	})
})

test.describe('Tenant Dashboard Layout', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to tenant dashboard
		await page.goto('/tenant')
		await page.waitForLoadState('networkidle')
	})

	test('should display tenant dashboard with card-based layout', async ({
		page
	}) => {
		// Wait for the layout to be fully rendered
		await page.waitForSelector('text=TenantFlow', { timeout: 10000 })

		// Verify tenant-specific navigation
		await expect(page.locator('text=My Profile')).toBeVisible()
		await expect(page.locator('text=My Lease')).toBeVisible()
		await expect(page.locator('text=Payments')).toBeVisible()

		// Take full page screenshot
		await expect(page).toHaveScreenshot('tenant-dashboard-full.png', {
			fullPage: true,
			maxDiffPixels: 100
		})
	})
})
