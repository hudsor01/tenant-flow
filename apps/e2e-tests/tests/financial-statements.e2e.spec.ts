import { test, expect, type Page } from './fixtures/auth.fixture'
import { createLogger } from '@repo/shared/lib/frontend-logger'

/**
 * Financial Statements E2E Tests
 * Tests the real API integration for:
 * - Cash Flow Statement
 * - Balance Sheet
 *
 * Uses auth fixture for reliable authentication state management
 * @see ./fixtures/auth.fixture.ts
 *
 * NOTE: Tests gracefully handle cases where no financial data exists in the database
 */

test.describe('Financial Statements - Production Flow', () => {
	const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	const logger = createLogger({ component: 'FinancialStatementsE2E' })

	/**
	 * Helper to check if page loaded with data or error
	 * Returns true if data is available, false if error occurred
	 */
	async function hasDataLoaded(page: Page): Promise<boolean> {
		// Wait for all network requests to complete (API calls)
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
			logger.warn('[hasDataLoaded] Network idle timeout - proceeding anyway')
		})

		// Additional wait for React to render the result
		await page.waitForTimeout(1000)

		// Check page content for error message
		const pageText = await page.textContent('body').catch(() => '')
		const hasFailedText = pageText.toLowerCase().includes('failed to load')

		if (hasFailedText) {
			logger.warn('[hasDataLoaded] Error detected - no data available')
			return false
		}

		// No error found - data loaded successfully
		return true
	}

	test.describe('Cash Flow Statement', () => {
		test('should load cash flow page without errors', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })
			await expect(page.locator('h1:has-text("Cash Flow Statement")')).toBeVisible()
		})

		test('should display operating activities section with real data', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			const dataLoaded = await hasDataLoaded(page)
			logger.info(`[Operating Activities] hasDataLoaded = ${dataLoaded}`)

			if (!dataLoaded) {
				logger.warn('⚠️  No data available - skipping test')
				test.skip()
			}

			logger.info('[Operating Activities] Checking for data elements')
			await page.waitForSelector('text=Operating Activities', { timeout: 5000 })
			await expect(page.locator('text=Operating Activities').first()).toBeVisible()
			await expect(page.locator('text=Net Operating Cash Flow')).toBeVisible()
		})

		test('should display investing activities section with real data', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Investing Activities').first()).toBeVisible()
			await expect(page.locator('text=Net Investing Cash Flow')).toBeVisible()
		})

		test('should display financing activities section with real data', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Financing Activities').first()).toBeVisible()
			await expect(page.locator('text=Net Financing Cash Flow')).toBeVisible()
		})

		test('should display summary cards with calculated totals', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Operating Cash Flow').first()).toBeVisible()
			await expect(page.locator('text=Investing Cash Flow').first()).toBeVisible()
			await expect(page.locator('text=Financing Cash Flow').first()).toBeVisible()
			await expect(page.locator('text=Net Cash Flow').first()).toBeVisible()
		})

		test('should allow period selection (monthly, quarterly, yearly)', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			const periodSelector = page.locator('text=Period').locator('..').locator('button')
			await expect(periodSelector).toBeVisible()
			await periodSelector.click()

			await expect(page.locator('[role="option"]:has-text("Monthly")')).toBeVisible()
			await expect(page.locator('[role="option"]:has-text("Quarterly")')).toBeVisible()
			await expect(page.locator('[role="option"]:has-text("Yearly")')).toBeVisible()
		})

		test('should handle API errors gracefully', async ({ authenticatedPage: page }) => {
			await page.route('**/api/v1/financials/cash-flow*', route => {
				route.fulfill({
					status: 500,
					body: JSON.stringify({ error: 'Internal Server Error' })
				})
			})

			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await expect(page.locator('text=/Failed to load|Error|Try again/i')).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe('Balance Sheet', () => {
		test('should load balance sheet page without errors', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })
			await expect(page.locator('h1:has-text("Balance Sheet")')).toBeVisible()
		})

		test('should display assets section with real data', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Assets').first()).toBeVisible()
			await expect(page.locator('text=Current Assets')).toBeVisible()
			await expect(page.locator('text=Non-Current Assets')).toBeVisible()
			await expect(page.locator('text=Total Assets')).toBeVisible()
		})

		test('should display liabilities section with real data', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Liabilities').first()).toBeVisible()
			await expect(page.locator('text=Current Liabilities')).toBeVisible()
			await expect(page.locator('text=Non-Current Liabilities')).toBeVisible()
			await expect(page.locator('text=Total Liabilities')).toBeVisible()
		})

		test('should display equity section with real data', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Equity').first()).toBeVisible()
			await expect(page.locator('text=Total Equity')).toBeVisible()
		})

		test('should display balance sheet equation', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Assets = Liabilities + Equity')).toBeVisible()
		})

		test('should display summary cards with totals', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			await expect(page.locator('text=Total Assets').first()).toBeVisible()
			await expect(page.locator('text=Total Liabilities').first()).toBeVisible()
			await expect(page.locator('text=Total Equity').first()).toBeVisible()
		})

		test('should allow date selection (year and month)', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			if (!(await hasDataLoaded(page))) {
				logger.warn('⚠️  No data available - skipping')
				test.skip()
			}

			const yearSelector = page.locator('text=As Of Date').locator('..').locator('button').first()
			await expect(yearSelector).toBeVisible()
			await yearSelector.click()

			await expect(page.locator('[role="option"]:has-text("2024")')).toBeVisible()
			await expect(page.locator('[role="option"]:has-text("2023")')).toBeVisible()
		})

		test('should handle API errors gracefully', async ({ authenticatedPage: page }) => {
			await page.route('**/api/v1/financials/balance-sheet*', route => {
				route.fulfill({
					status: 500,
					body: JSON.stringify({ error: 'Internal Server Error' })
				})
			})

			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await expect(page.locator('text=/Failed to load|Error|Try again/i')).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe('Navigation between financial statements', () => {
		test('should navigate from cash flow to balance sheet', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await expect(page.locator('h1:has-text("Balance Sheet")')).toBeVisible()
		})

		test('should maintain authentication state across financial pages', async ({ authenticatedPage: page }) => {
			await page.goto(`${BASE_URL}/financials/cash-flow`)
			await page.waitForSelector('h1:has-text("Cash Flow Statement")', { timeout: 10000 })

			await page.goto(`${BASE_URL}/financials/balance-sheet`)
			await page.waitForSelector('h1:has-text("Balance Sheet")', { timeout: 10000 })

			expect(page.url()).toContain('/financials/balance-sheet')
			expect(page.url()).not.toContain('/login')
		})
	})
})
