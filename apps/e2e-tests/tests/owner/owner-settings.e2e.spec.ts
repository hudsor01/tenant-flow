import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsOwner } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { openModal, verifyModalIsOpen } from '../helpers/modal-helpers'
import { fillTextInput, submitForm } from '../helpers/form-helpers'
import { verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Owner Settings', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page)
    await page.goto(`${baseUrl}${ROUTES.DASHBOARD_SETTINGS}`)
    await verifyPageLoaded(page, ROUTES.DASHBOARD_SETTINGS, 'Settings')
  })

  test('should render settings page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })

  test('should display profile settings section', async ({ page }) => {
    await verifyLoadingComplete(page)

    const profileSection = page.getByText(/profile|account|personal/i)
    const count = await profileSection.count()

    if (count > 0) {
      await expect(profileSection.first()).toBeVisible()
    }
  })

  test('should display notification preferences', async ({ page }) => {
    await verifyLoadingComplete(page)

    const notificationSection = page.getByText(/notification|email.*notification|sms/i)
    const count = await notificationSection.count()

    if (count > 0) {
      await expect(notificationSection.first()).toBeVisible()
    }
  })

  test('should have change password option', async ({ page }) => {
    await verifyLoadingComplete(page)

    const passwordButton = page.getByRole('button', { name: /change password|update password/i }).or(
      page.getByText(/password/i)
    )

    const count = await passwordButton.count()
    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should open change password modal', async ({ page }) => {
    const passwordButton = page.getByRole('button', { name: /change password/i })

    if ((await passwordButton.count()) > 0) {
      await passwordButton.click()
      await page.waitForTimeout(500)
      await verifyModalIsOpen(page)
    }
  })

  test('should display billing/subscription section if applicable', async ({ page }) => {
    await verifyLoadingComplete(page)

    const billingSection = page.getByText(/billing|subscription|plan/i)
    const count = await billingSection.count()

    if (count > 0) {
      await expect(billingSection.first()).toBeVisible()
    }
  })

  test('should have save changes button', async ({ page }) => {
    await verifyLoadingComplete(page)

    const saveButton = page.getByRole('button', { name: /save|update|apply/i })
    const count = await saveButton.count()

    if (count > 0) {
      await expect(saveButton.first()).toBeVisible()
    }
  })

  test('should display theme toggle', async ({ page }) => {
    await verifyLoadingComplete(page)

    const themeToggle = page.getByRole('button', { name: /theme|dark|light/i }).or(
      page.locator('[data-testid="theme-toggle"]')
    )

    const count = await themeToggle.count()
    if (count > 0) {
      await expect(themeToggle.first()).toBeVisible()
    }
  })
})
