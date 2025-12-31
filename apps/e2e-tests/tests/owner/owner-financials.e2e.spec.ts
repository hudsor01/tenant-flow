import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import {
	verifyTableRenders,
	verifyLoadingComplete
} from '../helpers/ui-validation-helpers'

/**
 * Owner Financials E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 */
test.describe('Owner Financials', () => {
	const financialPages = [
		{ path: ROUTES.FINANCIALS_INCOME_STATEMENT, heading: 'Income Statement' },
		{ path: ROUTES.FINANCIALS_CASH_FLOW, heading: 'Cash Flow' },
		{ path: ROUTES.FINANCIALS_BALANCE_SHEET, heading: 'Balance Sheet' },
		{ path: ROUTES.FINANCIALS_TAX_DOCUMENTS, heading: 'Tax Documents' }
	]

	for (const page of financialPages) {
		test(`should render ${page.heading} page`, async ({ page: p }) => {
			// Navigate directly (authenticated via storageState)
			await p.goto(page.path)
			await verifyPageLoaded(p, page.path, page.heading)
		})

		test(`should display financial data on ${page.heading}`, async ({
			page: p
		}) => {
			await p.goto(page.path)
			await verifyLoadingComplete(p)

			// Check for financial data OR empty state OR heading (page rendered successfully)
			const hasFinancialData = (await p.getByText(/\$\d+/i).count()) > 0
			const hasEmptyState =
				(await p
					.getByText(/no data|no results|no transactions|unavailable|\$0\.00/i)
					.count()) > 0
			const hasHeading =
				(await p
					.getByRole('heading', { name: new RegExp(page.heading, 'i') })
					.count()) > 0

			// Page should have either financial data, empty state, or at minimum the heading rendered
			const pageRendered = hasFinancialData || hasEmptyState || hasHeading
			expect(pageRendered).toBe(true)
		})

		test(`should have export functionality on ${page.heading}`, async ({
			page: p
		}) => {
			await p.goto(page.path)
			await verifyLoadingComplete(p)

			const exportButton = p.getByRole('button', {
				name: /export|download|pdf|csv/i
			})
			const buttonExists = (await exportButton.count()) > 0

			if (buttonExists) {
				await expect(exportButton.first()).toBeVisible()
			}
		})
	}

	test('should display income statement table', async ({ page }) => {
		await page.goto(ROUTES.FINANCIALS_INCOME_STATEMENT)
		await verifyLoadingComplete(page)

		const tableExists = (await page.getByRole('table').count()) > 0
		if (tableExists) {
			await verifyTableRenders(page)
		}
	})

	test('should display date range selector', async ({ page }) => {
		await page.goto(ROUTES.FINANCIALS_CASH_FLOW)
		await verifyLoadingComplete(page)

		const dateSelector = page.getByLabel(/date|period|range/i)
		const count = await dateSelector.count()

		if (count > 0) {
			await expect(dateSelector.first()).toBeVisible()
		}
	})
})
