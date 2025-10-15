/**
 * Mock Authentication Dashboard Integration Tests
 * Tests complete data flow from mock authentication through dashboard components
 *
 * Critical integration testing for:
 * - Mock authentication system activation and validation
 * - Dashboard data loading with mock data
 * - Component rendering with realistic test data
 * - Navigation flow and state persistence
 * - API integration with mock data providers
 */

import { expect, Page, test } from '@playwright/test'
import {
	MOCK_DASHBOARD_STATS,
	MOCK_PROPERTIES
} from '../../src/lib/mock-auth-data'

test.describe('Mock Auth Dashboard Integration', () => {
	let page: Page

	test.beforeEach(async ({ browser }) => {
		page = await browser.newPage()

		// Add console monitoring
		page.on('console', msg => {
			if (msg.type() === 'error') {
			}
		})

		// Monitor network requests
		page.on('request', request => {
			if (
				request.url().includes('/api/dev-auth') ||
				request.url().includes('/dashboard')
			) {
			}
		})
	})

	test.afterEach(async () => {
		await page.close()
	})

	test.describe('Mock Authentication System', () => {
		test('should activate mock authentication successfully', async () => {
			// Navigate to mock auth endpoint
			await page.goto('/api/dev-auth')

			// Should redirect to dashboard
			await expect(page).toHaveURL('/dashboard')

			// Verify auth cookies are set
			const cookies = await page.context().cookies()
			const authCookies = cookies.filter(
				cookie =>
					cookie.name.includes('sb-access-token') ||
					cookie.name.includes('supabase-auth-token') ||
					cookie.name.includes('mock-user-id')
			)

			expect(authCookies.length).toBeGreaterThanOrEqual(2)
		})

		test('should bypass authentication middleware with mock auth enabled', async () => {
			// First, activate mock auth
			await page.goto('/api/dev-auth')
			await expect(page).toHaveURL('/dashboard')

			// Verify dashboard is accessible without real authentication
			const dashboardTitle = page.locator('h1, h2').first()
			await expect(dashboardTitle).toBeVisible()

			// Verify no redirect to login page
			await expect(page).not.toHaveURL('/login')
		})

		test('should provide mock authentication status via API', async () => {
			// Check auth status endpoint
			const response = await page.request.get('/api/dev-auth/status')
			expect(response.status()).toBe(200)

			const data = await response.json()
			expect(data).toHaveProperty('available', true)
			expect(data).toHaveProperty('mockAuthEnabled', true)
			expect(data).toHaveProperty('environment', 'development')
		})

		test('should clear authentication cookies on logout', async () => {
			// First activate mock auth
			await page.goto('/api/dev-auth')
			await expect(page).toHaveURL('/dashboard')

			// Clear auth via POST endpoint
			const response = await page.request.post('/api/dev-auth')
			expect(response.status()).toBe(200)

			const data = await response.json()
			expect(data.success).toBe(true)
			expect(data.message).toContain('cleared')

			// Verify cookies are cleared by attempting dashboard access
			await page.goto('/dashboard')
			await expect(page).toHaveURL('/login')
		})
	})

	test.describe('Dashboard Data Integration', () => {
		test('should load dashboard with mock data', async () => {
			// Activate mock auth
			await page.goto('/api/dev-auth')
			await expect(page).toHaveURL('/dashboard')

			// Wait for dashboard components to load
			await page.waitForLoadState('networkidle')

			// Verify dashboard statistics cards are displayed
			const statCards = page
				.locator('[class*="card"]')
				.filter({ hasText: /\d+/ })
			await expect(statCards.first()).toBeVisible()

			// Verify statistics match mock data structure
			const totalPropertiesText = await page
				.locator('text=' + MOCK_DASHBOARD_STATS.totalProperties.toString())
				.first()
			await expect(totalPropertiesText).toBeVisible()
		})

		test('should render properties data table with mock data', async () => {
			// Activate mock auth and navigate to properties
			await page.goto('/api/dev-auth')
			await page.goto('/dashboard/properties')
			await page.waitForLoadState('networkidle')

			// Wait for data table to load
			const dataTable = page.locator('table')
			await expect(dataTable).toBeVisible()

			// Verify table contains mock property data
			const rows = page.locator('tbody tr')
			await expect(rows.first()).toBeVisible()

			// Check for property names from mock data
			for (let i = 0; i < Math.min(3, MOCK_PROPERTIES.length); i++) {
				const propertyName = MOCK_PROPERTIES[i].name
				await expect(page.locator(`text=${propertyName}`)).toBeVisible()
			}
		})

		test('should integrate with TanStack Query for data management', async () => {
			await page.goto('/api/dev-auth')
			await page.waitForLoadState('networkidle')

			// Inject query client monitoring
			await page.addInitScript(() => {
				window.queryClientData = {
					queries: [],
					mutations: [],
					errors: []
				}

				// Monitor when query client becomes available
				const checkQueryClient = () => {
					if (window.useQuery || (window as any).__QUERY_CLIENT__) {
						window.queryClientData.available = true
					} else {
						setTimeout(checkQueryClient, 100)
					}
				}
				checkQueryClient()
			})

			await page.waitForTimeout(2000)

			// Verify TanStack Query integration
			const queryClientAvailable = await page.evaluate(() => {
				return !!(window as any).queryClientData?.available
			})

			expect(queryClientAvailable).toBe(true)
		})

		test('should handle component error states gracefully', async () => {
			await page.goto('/api/dev-auth')
			await page.waitForLoadState('networkidle')

			// Simulate API error by intercepting requests
			await page.route('**/api/v1/dashboard/stats**', route => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Server error' })
				})
			})

			// Reload to trigger error
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Should display error handling UI
			const errorElement = page
				.locator('text=Error')
				.or(page.locator('text=Failed').or(page.locator('[class*="error"]')))

			// Either error UI or fallback loading/empty state
			const hasErrorHandling = (await errorElement.count()) > 0
			const hasLoadingState =
				(await page.locator('[class*="loading"]').count()) > 0

			expect(hasErrorHandling || hasLoadingState).toBe(true)
		})
	})

	test.describe('Component Integration', () => {
		test('should integrate SectionCards with mock dashboard stats', async () => {
			await page.goto('/api/dev-auth')
			await page.waitForLoadState('networkidle')

			// Verify section cards component renders
			const sectionCards = page.locator(
				'[class*="section-cards"], [class*="dashboard-section"]'
			)
			await expect(sectionCards.first()).toBeVisible()

			// Check for expected stat values from mock data
			await expect(
				page.locator(`text=${MOCK_DASHBOARD_STATS.totalProperties}`)
			).toBeVisible()
			await expect(
				page.locator(`text=${MOCK_DASHBOARD_STATS.totalUnits}`)
			).toBeVisible()
		})

		test('should integrate DataTable with mock properties', async () => {
			await page.goto('/api/dev-auth')
			await page.goto('/dashboard/properties')
			await page.waitForLoadState('networkidle')

			// Wait for table to render
			await page.waitForSelector('table', { timeout: 10000 })

			const table = page.locator('table')
			await expect(table).toBeVisible()

			// Verify table headers
			const headers = ['Name', 'Type', 'Status', 'Units', 'Revenue']
			for (const header of headers) {
				await expect(
					page
						.locator(`th:has-text("${header}")`)
						.or(page.locator(`text="${header}"`))
				).toBeVisible()
			}

			// Verify at least one data row
			const dataRows = page.locator('tbody tr')
			await expect(dataRows.first()).toBeVisible()
		})

		test('should integrate ChartAreaInteractive with dashboard', async () => {
			await page.goto('/api/dev-auth')
			await page.waitForLoadState('networkidle')

			// Wait for chart container
			await page.waitForTimeout(3000)

			// Look for chart elements (canvas, svg, or recharts containers)
			const chartElements = page
				.locator('canvas')
				.or(
					page
						.locator('svg')
						.or(
							page
								.locator('[class*="chart"]')
								.or(page.locator('[class*="recharts"]'))
						)
				)

			const chartCount = await chartElements.count()
			expect(chartCount).toBeGreaterThan(0)
		})
	})
})
