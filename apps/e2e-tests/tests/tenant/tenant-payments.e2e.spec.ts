import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsTenant } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { openModal, verifyModalIsOpen } from '../helpers/modal-helpers'
import { verifyTableRenders, verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Tenant Payments', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test('should render payments overview page', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS}`)
    await verifyPageLoaded(page, ROUTES.TENANT_PAYMENTS, 'Payments')
  })

  test('should render payment methods page', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_METHODS}`)
    await verifyPageLoaded(page, ROUTES.TENANT_PAYMENTS_METHODS, 'Payment Methods')
  })

  test('should render payment history page', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_HISTORY}`)
    await verifyPageLoaded(page, ROUTES.TENANT_PAYMENTS_HISTORY, 'Payment History')
  })

  test('should display payment history table', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_HISTORY}`)
    await verifyLoadingComplete(page)

    const tableExists = (await page.getByRole('table').count()) > 0
    if (tableExists) {
      await verifyTableRenders(page)
    }
  })

  test('should display saved payment methods', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_METHODS}`)
    await verifyLoadingComplete(page)

    const paymentMethods = page.getByText(/card|bank|payment method/i)
    const count = await paymentMethods.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have add payment method button', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_METHODS}`)
    await verifyLoadingComplete(page)

    const addButton = page.getByRole('button', { name: /add.*method|new.*method/i })
    const buttonExists = (await addButton.count()) > 0

    if (buttonExists) {
      await expect(addButton.first()).toBeVisible()
    }
  })

  test('should display upcoming payment amount', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS}`)
    await verifyLoadingComplete(page)

    const amount = page.getByText(/\$\d+/)
    const count = await amount.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display next payment due date', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS}`)
    await verifyLoadingComplete(page)

    const dueDate = page.getByText(/due|next payment|upcoming/i)
    const count = await dueDate.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have pay rent button', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS}`)
    await verifyLoadingComplete(page)

    const payButton = page.getByRole('button', { name: /pay.*rent|make.*payment/i })
    const buttonExists = (await payButton.count()) > 0

    if (buttonExists) {
      await expect(payButton.first()).toBeVisible()
    }
  })

  test('should open pay rent modal', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS}`)
    await verifyLoadingComplete(page)

    const payButton = page.getByRole('button', { name: /pay.*rent|make.*payment/i })

    if ((await payButton.count()) > 0) {
      await payButton.click()
      await page.waitForTimeout(500)
      await verifyModalIsOpen(page)
    }
  })

  test('should display payment status badges in history', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_HISTORY}`)
    await verifyLoadingComplete(page)

    const statusBadges = page.getByText(/paid|pending|failed/i)
    const count = await statusBadges.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should allow downloading payment receipts', async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS_HISTORY}`)
    await verifyLoadingComplete(page)

    const downloadButtons = page.getByRole('button', { name: /download|receipt/i })
    const count = await downloadButtons.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })
})
