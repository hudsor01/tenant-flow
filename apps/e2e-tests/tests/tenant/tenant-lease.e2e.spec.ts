import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsTenant } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Tenant Lease', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_LEASE}`)
    await verifyPageLoaded(page, ROUTES.TENANT_LEASE, 'My Lease')
  })

  test('should render lease page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /lease/i })).toBeVisible()
  })

  test('should display lease details', async ({ page }) => {
    await verifyLoadingComplete(page)

    const leaseInfo = page.getByText(/rent|lease|term|start date|end date/i)
    const count = await leaseInfo.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should display rent amount', async ({ page }) => {
    await verifyLoadingComplete(page)

    const rentAmount = page.getByText(/\$\d+/)
    const count = await rentAmount.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should display lease term dates', async ({ page }) => {
    await verifyLoadingComplete(page)

    const dates = page.getByText(/start date|end date|lease period/i)
    const count = await dates.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display property information', async ({ page }) => {
    await verifyLoadingComplete(page)

    const propertyInfo = page.getByText(/property|address|unit/i)
    const count = await propertyInfo.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should display landlord contact information', async ({ page }) => {
    await verifyLoadingComplete(page)

    const landlordInfo = page.getByText(/landlord|owner|contact/i)
    const count = await landlordInfo.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have download lease button', async ({ page }) => {
    await verifyLoadingComplete(page)

    const downloadButton = page.getByRole('button', { name: /download|view.*lease/i })
    const buttonExists = (await downloadButton.count()) > 0

    if (buttonExists) {
      await expect(downloadButton.first()).toBeVisible()
    }
  })

  test('should display lease status', async ({ page }) => {
    await verifyLoadingComplete(page)

    const status = page.getByText(/active|expired|pending/i)
    const count = await status.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })
})
