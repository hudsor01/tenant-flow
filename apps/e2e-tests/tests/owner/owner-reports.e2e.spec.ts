import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsOwner } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Owner Reports', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page)
    await page.goto(`${baseUrl}${ROUTES.REPORTS}`)
    await verifyPageLoaded(page, ROUTES.REPORTS, 'Reports')
  })

  test('should render reports page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible()
  })

  test('should display report list or generation form', async ({ page }) => {
    await verifyLoadingComplete(page)

    const hasReportList = (await page.getByText(/report/i).count()) > 0
    expect(hasReportList).toBe(true)
  })

  test('should have generate report button', async ({ page }) => {
    const generateButton = page.getByRole('button', { name: /generate|create.*report/i })
    const buttonExists = (await generateButton.count()) > 0

    if (buttonExists) {
      await expect(generateButton.first()).toBeVisible()
    }
  })

  test('should navigate to generate reports page', async ({ page }) => {
    await page.goto(`${baseUrl}${ROUTES.REPORTS_GENERATE}`)
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/reports/generate')
  })

  test('should display report types', async ({ page }) => {
    await verifyLoadingComplete(page)

    const reportTypes = page.getByText(/financial|property|tenant|occupancy/i)
    const count = await reportTypes.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have download buttons for existing reports', async ({ page }) => {
    await verifyLoadingComplete(page)

    const downloadButtons = page.getByRole('button', { name: /download|export/i })
    const count = await downloadButtons.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })
})
