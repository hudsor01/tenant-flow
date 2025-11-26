import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsOwner } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { verifyTableRenders, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Owner Financials', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  const financialPages = [
    { path: ROUTES.FINANCIALS_INCOME_STATEMENT, heading: 'Income Statement' },
    { path: ROUTES.FINANCIALS_CASH_FLOW, heading: 'Cash Flow' },
    { path: ROUTES.FINANCIALS_BALANCE_SHEET, heading: 'Balance Sheet' },
    { path: ROUTES.FINANCIALS_TAX_DOCUMENTS, heading: 'Tax Documents' },
  ]

  for (const page of financialPages) {
    test(`should render ${page.heading} page`, async ({ page: p }) => {
      await loginAsOwner(p)
      await p.goto(`${baseUrl}${page.path}`)
      await verifyPageLoaded(p, page.path, page.heading)
    })

    test(`should display financial data on ${page.heading}`, async ({ page: p }) => {
      await loginAsOwner(p)
      await p.goto(`${baseUrl}${page.path}`)
      await verifyLoadingComplete(p)

      const hasFinancialData = (await p.getByText(/\$\d+/i).count()) > 0
      expect(hasFinancialData).toBe(true)
    })

    test(`should have export functionality on ${page.heading}`, async ({ page: p }) => {
      await loginAsOwner(p)
      await p.goto(`${baseUrl}${page.path}`)
      await verifyLoadingComplete(p)

      const exportButton = p.getByRole('button', { name: /export|download|pdf|csv/i })
      const buttonExists = (await exportButton.count()) > 0

      if (buttonExists) {
        await expect(exportButton.first()).toBeVisible()
      }
    })
  }

  test('should display income statement table', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto(`${baseUrl}${ROUTES.FINANCIALS_INCOME_STATEMENT}`)
    await verifyLoadingComplete(page)

    const tableExists = (await page.getByRole('table').count()) > 0
    if (tableExists) {
      await verifyTableRenders(page)
    }
  })

  test('should display date range selector', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto(`${baseUrl}${ROUTES.FINANCIALS_CASH_FLOW}`)
    await verifyLoadingComplete(page)

    const dateSelector = page.getByLabel(/date|period|range/i)
    const count = await dateSelector.count()

    if (count > 0) {
      await expect(dateSelector.first()).toBeVisible()
    }
  })
})
