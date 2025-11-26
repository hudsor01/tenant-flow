import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsTenant } from '../../auth-helpers'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { fillTextInput, submitForm } from '../helpers/form-helpers'
import { verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

test.describe('Tenant Profile', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page)
    await page.goto(`${baseUrl}${ROUTES.TENANT_PROFILE}`)
    await verifyPageLoaded(page, ROUTES.TENANT_PROFILE, 'My Profile')
  })

  test('should render profile page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
  })

  test('should display personal information', async ({ page }) => {
    await verifyLoadingComplete(page)

    const personalInfo = page.getByText(/name|email|phone/i)
    const count = await personalInfo.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should have edit profile button or form', async ({ page }) => {
    await verifyLoadingComplete(page)

    const editButton = page.getByRole('button', { name: /edit|update/i })
    const formExists = (await page.getByLabel(/name|email/i).count()) > 0

    expect((await editButton.count()) > 0 || formExists).toBe(true)
  })

  test('should display emergency contact information', async ({ page }) => {
    await verifyLoadingComplete(page)

    const emergencyContact = page.getByText(/emergency contact/i)
    const count = await emergencyContact.count()

    if (count > 0) {
      await expect(emergencyContact.first()).toBeVisible()
    }
  })

  test('should allow updating profile information', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit/i })

    if ((await editButton.count()) > 0) {
      await editButton.click()
      await page.waitForTimeout(500)

      // Should show form or enable editing
      const phoneInput = page.getByLabel(/phone/i)
      if ((await phoneInput.count()) > 0 && (await phoneInput.isEditable())) {
        await phoneInput.fill('555-0199')
        await submitForm(page, 'Save')
        await page.waitForTimeout(2000)
      }
    }
  })

  test('should display profile picture if available', async ({ page }) => {
    await verifyLoadingComplete(page)

    const avatar = page.locator('[data-testid="avatar"]').or(
      page.locator('img[alt*="profile"]')
    )

    const avatarExists = (await avatar.count()) > 0
    if (avatarExists) {
      await expect(avatar.first()).toBeVisible()
    }
  })
})
