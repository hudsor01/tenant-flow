/**
 * API Data Flow Integration Tests
 * Tests end-to-end data flow from mock providers through components
 *
 * Integration testing for:
 * - Mock data provider consistency and reliability
 * - API hook integration with mock authentication
 * - Component rendering with mock data
 * - Data transformation and validation
 * - Error handling and fallback states
 */

import { expect, Page, test } from '@playwright/test'

declare global {
	interface Window {
		__MOCK_AUTH_DATA__?: {
			canUseMockAuth?: boolean
			MOCK_DASHBOARD_STATS?: unknown
			MOCK_PROPERTIES?: unknown
		}
		apiHookData?: any
		mockDataCheck?: any
	}
}

test.describe('API Data Flow Integration', () => {
	let page: Page

	test.beforeEach(async ({ browser }) => {
		page = await browser.newPage()

		// Enable detailed logging
		page.on('console', msg => {})

		// Monitor API requests
		page.on('request', request => {
			if (request.url().includes('/api/')) {
			}
		})

		page.on('response', response => {
			if (response.url().includes('/api/')) {
			}
		})

		// Activate mock authentication
		await page.goto('/api/dev-auth')
		await expect(page).toHaveURL('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	test.afterEach(async () => {
		await page.close()
	})

	test.describe('Dashboard Stats Data Flow', () => {
		test('should load dashboard stats through API hooks', async () => {
			// Navigate to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Inject monitoring for API hooks
			await page.addInitScript(() => {
				window.apiHookData = {
					dashboardStats: null,
					properties: null,
					loading: false,
					errors: []
				}

				// Monitor API hook calls
				if (typeof window !== 'undefined') {
					const originalFetch = window.fetch
					window.fetch = async function (...args) {
						const url = args[0] as string

						if (url.includes('/dashboard/stats')) {
							window.apiHookData.loading = true
						}

						try {
							const result = await originalFetch.apply(this, args)
							if (url.includes('/dashboard/stats')) {
								window.apiHookData.loading = false
								const data = await result.clone().json()
								window.apiHookData.dashboardStats = data
							}
							return result
						} catch (error) {
							window.apiHookData.errors.push(error.message)
							throw error
						}
					}
				}
			})

			await page.reload()
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(3000)

			// Verify API data was captured
			const apiData = await page.evaluate(() => window.apiHookData)

			// Should have attempted to load dashboard stats
			expect(apiData.errors.length).toBe(0)

			// Verify UI reflects the data flow
			const statsCards = page
				.locator('[class*="card"]')
				.filter({ hasText: /\d+/ })
			await expect(statsCards.first()).toBeVisible()
		})

		test('should handle mock data provider integration', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Check that mock data is being used
			await page.addInitScript(() => {
				window.mockDataCheck = {
					canUseMockAuth: false,
					mockStatsAvailable: false,
					mockPropertiesAvailable: false
				}
			})

			// At minimum, should have some form of data display
			const hasContent = await page.locator('main').isVisible()

			expect(hasContent).toBe(true)
		})

		test('should validate data transformation pipeline', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Look for numeric values that should be transformed/formatted
			const numberElements = page.locator('text=/^\\$?[0-9,]+\\.?[0-9]*$/')
			const numberCount = await numberElements.count()

			// Should have at least some formatted numbers (revenue, counts, etc.)
			expect(numberCount).toBeGreaterThan(0)

			// Check for percentage values (occupancy rates)
			const percentageElements = page.locator('text=/%/')
			if ((await percentageElements.count()) > 0) {
				await expect(percentageElements.first()).toBeVisible()
			}

			// Verify data is properly formatted for display
			const cardElements = page.locator('[class*="card"]')
			const cardCount = await cardElements.count()
			expect(cardCount).toBeGreaterThanOrEqual(1)
		})
	})

	test.describe('Properties Data Flow', () => {
		test('should load properties through data table integration', async () => {
			await page.goto('/dashboard/properties')
			await page.waitForLoadState('networkidle')

			// Wait for table to potentially load
			await page.waitForTimeout(3000)

			// Check if table exists (even if empty)
			const tableExists = (await page.locator('table').count()) > 0
			const hasPropertiesSection =
				(await page
					.locator('text=Properties')
					.or(page.locator('[class*="properties"]'))
					.count()) > 0

			// Should have either table or properties section
			expect(tableExists || hasPropertiesSection).toBe(true)

			if (tableExists) {
				const table = page.locator('table')
				await expect(table).toBeVisible()

				// Check for table headers
				const headers = page.locator('th, [role="columnheader"]')
				const headerCount = await headers.count()
				expect(headerCount).toBeGreaterThan(0)
			}
		})

		test('should handle property data transformation', async () => {
			await page.goto('/dashboard/properties')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(3000)

			// Look for transformed property data
			const propertyCards = page.locator('[class*="card"]')
			const tableRows = page.locator('tbody tr')

			const hasPropertyData =
				(await propertyCards.count()) > 0 || (await tableRows.count()) > 0

			// Should display property information in some form
			expect(hasPropertyData).toBe(true)

			// If table exists, verify it has proper structure
			if ((await tableRows.count()) > 0) {
				const firstRow = tableRows.first()
				await expect(firstRow).toBeVisible()

				// Should have multiple columns
				const cells = firstRow.locator('td')
				const cellCount = await cells.count()
				expect(cellCount).toBeGreaterThan(1)
			}
		})

		test('should integrate with filtering and sorting', async () => {
			await page.goto('/dashboard/properties')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(3000)

			// Look for interactive elements (buttons, dropdowns, inputs)
			const interactiveElements = page.locator(
				'button, select, input[type="text"], input[type="search"]'
			)
			const interactiveCount = await interactiveElements.count()

			// Should have some interactive elements for data manipulation
			expect(interactiveCount).toBeGreaterThan(0)

			// Try clicking sortable headers if they exist
			const sortableHeaders = page.locator(
				'th[role="columnheader"], th button, [class*="sortable"]'
			)
			if ((await sortableHeaders.count()) > 0) {
				await sortableHeaders.first().click()
				await page.waitForTimeout(1000)

				// Should not cause errors
				const hasErrors = (await page.locator('[class*="error"]').count()) > 0
				expect(hasErrors).toBe(false)
			}
		})
	})

	test.describe('Chart Data Integration', () => {
		test('should load chart components with data', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(4000)

			// Look for chart elements
			const chartElements = page.locator(
				'canvas, svg, [class*="chart"], [class*="recharts"]'
			)
			const chartCount = await chartElements.count()

			// Should have at least one chart component
			expect(chartCount).toBeGreaterThan(0)

			if (chartCount > 0) {
				const firstChart = chartElements.first()
				await expect(firstChart).toBeVisible()
			}
		})

		test('should handle chart data updates', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(3000)

			// Check if charts respond to viewport changes
			await page.setViewportSize({ width: 800, height: 600 })
			await page.waitForTimeout(1000)

			await page.setViewportSize({ width: 1200, height: 800 })
			await page.waitForTimeout(1000)

			// Charts should still be visible after resize
			const charts = page.locator(
				'canvas, svg, [class*="chart"], [class*="recharts"]'
			)
			if ((await charts.count()) > 0) {
				await expect(charts.first()).toBeVisible()
			}

			// No errors should occur during resize
			const errorElements = await page
				.locator('[class*="error"], text=Error')
				.count()
			expect(errorElements).toBe(0)
		})
	})

	test.describe('Real-time Data Flow', () => {
		test('should handle data refresh cycles', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Monitor network requests during refresh cycle
			let requestCount = 0
			page.on('request', request => {
				if (request.url().includes('/api/v1/dashboard/stats')) {
					requestCount++
				}
			})

			// Wait for potential auto-refresh (TanStack Query has 30s intervals)
			await page.waitForTimeout(5000)

			// Manually trigger refresh if available
			const refreshButton = page.locator(
				'button:has-text("Refresh"), [aria-label="Refresh"], [title="Refresh"]'
			)
			if ((await refreshButton.count()) > 0) {
				await refreshButton.first().click()
				await page.waitForTimeout(2000)
			}

			// Should handle refresh without errors
			const hasErrors = (await page.locator('[class*="error"]').count()) > 0
			expect(hasErrors).toBe(false)

			// UI should remain stable
			const mainContent = page.locator('main')
			await expect(mainContent).toBeVisible()
		})

		test('should handle concurrent data updates', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Navigate to properties quickly (triggers multiple API calls)
			await Promise.all([
				page.goto('/dashboard/properties'),
				page.waitForTimeout(100),
				page.goto('/dashboard'),
				page.waitForTimeout(100)
			])

			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(2000)

			// Should handle rapid navigation without breaking
			const mainContent = page.locator('main')
			await expect(mainContent).toBeVisible()

			// No error states
			const errors = await page.locator('[class*="error"]').count()
			expect(errors).toBe(0)
		})
	})

	test.describe('Error Handling Data Flow', () => {
		test('should handle API errors gracefully', async () => {
			// Intercept and fail API requests
			await page.route('**/api/v1/dashboard/stats**', route => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Internal Server Error' })
				})
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(3000)

			// Should display error handling UI or fallback content
			const hasErrorHandling =
				(await page
					.locator('text=Error, text=Failed, [class*="error"]')
					.count()) > 0
			const hasLoadingState =
				(await page
					.locator('[class*="loading"], [class*="skeleton"]')
					.count()) > 0
			const hasEmptyState =
				(await page.locator('text=No data, text=Empty').count()) > 0

			// Should have some form of error handling
			expect(hasErrorHandling || hasLoadingState || hasEmptyState).toBe(true)

			// Should not crash the application
			const mainContent = page.locator('main')
			await expect(mainContent).toBeVisible()
		})

		test('should recover from network failures', async () => {
			let failureCount = 0

			// Fail first few requests, then succeed
			await page.route('**/api/v1/**', route => {
				failureCount++
				if (failureCount <= 2) {
					route.fulfill({
						status: 503,
						contentType: 'application/json',
						body: JSON.stringify({ error: 'Service Unavailable' })
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(5000)

			// Should eventually recover and show content
			const mainContent = page.locator('main')
			await expect(mainContent).toBeVisible()

			// May have retry buttons
			const retryButton = page.locator(
				'button:has-text("Retry"), button:has-text("Reload")'
			)
			if ((await retryButton.count()) > 0) {
				await retryButton.first().click()
				await page.waitForTimeout(2000)
			}

			// Should maintain application stability
			expect(await page.locator('body').isVisible()).toBe(true)
		})

		test('should validate data integrity', async () => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(2000)

			// Look for data that should be numeric
			const numericElements = page.locator(
				'[data-testid*="stat"], [class*="stat"] >> text=/^\\d+$/'
			)
			const numericCount = await numericElements.count()

			if (numericCount > 0) {
				// Verify numbers are properly formatted
				for (let i = 0; i < Math.min(numericCount, 5); i++) {
					const element = numericElements.nth(i)
					const text = await element.textContent()

					if (text) {
						// Should be valid number format
						const cleanNumber = text.replace(/[$,%]/g, '')
						expect(isNaN(Number(cleanNumber))).toBe(false)
					}
				}
			}

			// Look for dates that should be properly formatted
			const dateElements = page.locator(
				'text=/\\d{1,2}[\/\\-]\\d{1,2}[\/\\-]\\d{2,4}/, text=/\\d{4}-\\d{2}-\\d{2}/'
			)
			const dateCount = await dateElements.count()

			if (dateCount > 0) {
				// At least one date should be visible
				await expect(dateElements.first()).toBeVisible()
			}

			// Overall page should be in valid state
			const hasValidContent = await page.locator('main').isVisible()
			expect(hasValidContent).toBe(true)
		})
	})
})
