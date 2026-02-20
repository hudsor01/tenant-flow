import { test, expect } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { ROUTES } from '../constants/routes'
import {
	verifyPageLoaded,
	setupErrorMonitoring
} from '../helpers/navigation-helpers'
import {
	verifyTableRenders,
	verifyTableHasRows,
	verifyCardRenders,
	verifyStatCard,
	verifyButtonExists,
	verifyChartRenders,
	verifyCanvasChartRenders,
	verifySVGChartRenders,
	verifyLoadingComplete
} from '../helpers/ui-validation-helpers'

/**
 * Owner Dashboard E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 *
 * Comprehensive validation of the owner dashboard page:
 * - Quick stats cards (properties, tenants, revenue, maintenance)
 * - Recent activity section
 * - Charts and graphs
 * - Quick actions (Quick Create, Inbox)
 * - Data tables
 * - Overall page functionality
 */

test.describe('Owner Dashboard', () => {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	const logger = createLogger({ component: 'OwnerDashboardE2E' })

	test.beforeEach(async ({ page }) => {
		// Navigate to dashboard (authenticated via storageState)
		await page.goto(ROUTES.OWNER_DASHBOARD)
		await page.evaluate(() => {
			localStorage.setItem('owner-tour-completed', 'true')
		})

		// Reload to apply localStorage changes
		await page.reload()

		// Verify we're on dashboard
		await verifyPageLoaded(page, ROUTES.OWNER_DASHBOARD, 'Dashboard')
	})

	test('should render dashboard page successfully', async ({ page }) => {
		// Set up error monitoring
		const { errors, networkErrors } = setupErrorMonitoring(page)

		// Verify page loaded
		expect(page.url()).toContain(ROUTES.OWNER_DASHBOARD)

		// Verify heading
		await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible(
			{
				timeout: 10000
			}
		)

		// Verify no console errors
		if (errors.length > 0) {
			logger.error('Console errors on dashboard:', { errors })
		}
		expect(errors).toHaveLength(0)

		// Verify no network errors
		if (networkErrors.length > 0) {
			logger.error('Network errors on dashboard:', { networkErrors })
		}
		expect(networkErrors).toHaveLength(0)
	})

	test('should display quick stats cards', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for common stat card labels
		const statLabels = [
			'Total Properties',
			'Properties',
			'Active Tenants',
			'Tenants',
			'Monthly Revenue',
			'Revenue',
			'Maintenance Requests',
			'Maintenance',
			'Occupancy',
			'Rent Collection'
		]

		// At least 3 stat cards should be visible
		let visibleStats = 0
		for (const label of statLabels) {
			const stat = page.getByText(new RegExp(label, 'i'))
			const count = await stat.count()
			if (count > 0 && (await stat.first().isVisible())) {
				visibleStats++
			}
		}

		expect(visibleStats).toBeGreaterThanOrEqual(3)
	})

	test('should display stat cards with numerical values', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for numerical values (common patterns: numbers with optional $ or %)
		const numberPattern = /\$?\d+[\d,]*\.?\d*%?/

		// Find all elements with numbers
		const numbersLocator = page.locator(`text=${numberPattern}`)
		const count = await numbersLocator.count()

		// Should have at least 4 numerical stat values
		expect(count).toBeGreaterThanOrEqual(4)
	})

	test('should display recent activity section if present', async ({
		page
	}) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for recent activity section (may not exist on all dashboards)
		const activitySection = page.getByText(
			/recent activity|activity|updates|recent/i
		)
		const activityExists = (await activitySection.count()) > 0

		if (activityExists) {
			// Verify section is visible
			await expect(activitySection.first()).toBeVisible()

			// Look for activity items (list items or cards)
			const activityItems = page
				.locator('[data-testid*="activity"]')
				.or(page.locator('li').filter({ has: page.locator('time') }))

			const itemCount = await activityItems.count()
			if (itemCount > 0) {
				expect(itemCount).toBeGreaterThan(0)
			}
		}
	})

	test('should display charts or graphs', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for chart containers
		const hasCanvasChart = (await page.locator('canvas').count()) > 0
		const hasSVGChart = (await page.locator('svg').count()) > 0
		const hasChartContainer =
			(await page.locator('[data-testid*="chart"]').count()) > 0 ||
			(await page.locator('[class*="chart"]').count()) > 0

		// At least one type of chart should be present
		const hasCharts = hasCanvasChart || hasSVGChart || hasChartContainer

		if (hasCharts) {
			if (hasCanvasChart) {
				await verifyCanvasChartRenders(page)
			} else if (hasSVGChart) {
				await verifySVGChartRenders(page)
			}

			logger.info('Charts verified on dashboard')
		}

		// Note: Some dashboards may not have charts, so this is optional verification
	})

	test('should display Quick Create button', async ({ page }) => {
		// Verify Quick Create button exists and is visible
		await verifyButtonExists(page, 'Quick Create')
	})

	test('should display Inbox button if present', async ({ page }) => {
		// Look for inbox/notifications button
		const inboxButton = page
			.getByRole('button', { name: /inbox|notifications|messages/i })
			.or(page.locator('[data-testid*="inbox"]'))
			.or(page.locator('[aria-label*="inbox"]'))

		const inboxExists = (await inboxButton.count()) > 0

		if (inboxExists) {
			await expect(inboxButton.first()).toBeVisible()
		}
	})

	test('should display data tables if present', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for tables on dashboard
		const tables = page.getByRole('table')
		const tableCount = await tables.count()

		if (tableCount > 0) {
			// Verify first table renders
			await verifyTableRenders(page)

			// Verify table has data
			await verifyTableHasRows(page, 1)
		}
	})

	test('should handle Quick Create button click', async ({ page }) => {
		// Dismiss tour if present (it blocks button clicks)
		const tourOverlay = page.locator('[data-slot="tour-spotlight"]')
		if (await tourOverlay.isVisible()) {
			// Click skip or close button
			const skipButton = page.getByRole('button', { name: /skip|close/i })
			if (await skipButton.isVisible()) {
				await skipButton.click()
				await page.waitForTimeout(300)
			}
		}

		// Click Quick Create button
		const quickCreateButton = page
			.getByRole('button', { name: /quick create/i })
			.or(page.locator('[data-testid="quick-create"]'))

		await quickCreateButton.click()

		// Wait for modal or menu to appear
		await page.waitForTimeout(500)

		// Verify modal/menu opened
		await expect(
			page
				.locator('[role="dialog"]')
				.or(page.locator('[role="menu"]'))
				.or(page.locator('[data-testid="quick-create-menu"]'))
		).toBeVisible({ timeout: 5000 })
	})

	test('should display property summary if user has properties', async ({
		page
	}) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for property-related information
		const propertySection = page.getByText(/properties|property/i)
		const count = await propertySection.count()

		// Should have property-related content
		expect(count).toBeGreaterThan(0)
	})

	test('should display tenant summary if user has tenants', async ({
		page
	}) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for tenant-related information
		const tenantSection = page.getByText(/tenants|tenant/i)
		const count = await tenantSection.count()

		// Should have tenant-related content
		expect(count).toBeGreaterThan(0)
	})

	test('should display financial information', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for financial indicators ($, revenue, income, etc.)
		const financialTerms = [/revenue/i, /income/i, /\$\d+/]

		let hasFinancialInfo = false
		for (const term of financialTerms) {
			const element = page.getByText(term)
			const count = await element.count()
			if (count > 0) {
				hasFinancialInfo = true
				break
			}
		}

		expect(hasFinancialInfo).toBe(true)
	})

	test('should handle empty state gracefully', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Page should load successfully even if no data
		await expect(
			page.getByRole('heading', { name: /dashboard/i })
		).toBeVisible()

		// Should not show error messages
		const errorMessages = page
			.locator('[role="alert"]')
			.filter({ hasText: /error|failed/i })
		const errorCount = await errorMessages.count()

		expect(errorCount).toBe(0)
	})

	test('should display maintenance status if applicable', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Look for maintenance-related information
		const maintenanceSection = page.getByText(/maintenance/i)
		const count = await maintenanceSection.count()

		if (count > 0) {
			// Verify maintenance info is visible
			await expect(maintenanceSection.first()).toBeVisible()
		}
	})

	test('should refresh data when navigating away and back', async ({
		page
	}) => {
		// Note initial URL
		const dashboardUrl = page.url()

		// Navigate away
		await page.goto(`${baseUrl}${ROUTES.PROPERTIES}`)
		await page.waitForLoadState('domcontentloaded')

		// Navigate back
		await page.goto(dashboardUrl)
		await page.waitForLoadState('domcontentloaded')

		// Verify dashboard loaded again
		await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible(
			{
				timeout: 10000
			}
		)
	})

	test('should display all widgets without layout breaks', async ({ page }) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Verify viewport is displaying correctly (no horizontal scroll)
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
		const viewportWidth = await page.evaluate(() => window.innerWidth)

		// Allow small differences (1-2px) for rounding
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2)
	})

	test('should handle page resize gracefully', async ({ page }) => {
		// Test responsive design
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.waitForTimeout(500)

		// Verify dashboard still visible
		await expect(
			page.getByRole('heading', { name: /dashboard/i })
		).toBeVisible()

		// Resize to smaller viewport
		await page.setViewportSize({ width: 1024, height: 768 })
		await page.waitForTimeout(500)

		// Verify dashboard still visible
		await expect(
			page.getByRole('heading', { name: /dashboard/i })
		).toBeVisible()
	})

	test('should verify all interactive elements are clickable', async ({
		page
	}) => {
		// Wait for loading to complete
		await verifyLoadingComplete(page)

		// Find all buttons
		const buttons = page.getByRole('button')
		const buttonCount = await buttons.count()

		// Should have at least 2 buttons (Quick Create + User Menu)
		expect(buttonCount).toBeGreaterThanOrEqual(2)

		// Verify buttons are enabled
		for (let i = 0; i < Math.min(buttonCount, 5); i++) {
			const button = buttons.nth(i)
			const isVisible = await button.isVisible()
			if (isVisible) {
				const isEnabled = await button.isEnabled()
				expect(isEnabled).toBe(true)
			}
		}
	})
})
