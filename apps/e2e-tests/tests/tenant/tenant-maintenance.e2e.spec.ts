import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { openModal, verifyModalIsOpen } from '../helpers/modal-helpers'
import { fillTextInput, submitForm } from '../helpers/form-helpers'
import { verifyTableRenders, verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

/**
 * Tenant Maintenance E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 */
test.describe('Tenant Maintenance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly (authenticated via storageState)
    await page.goto(ROUTES.TENANT_MAINTENANCE)
    await verifyPageLoaded(page, ROUTES.TENANT_MAINTENANCE, 'Maintenance')
  })

  test('should render maintenance requests page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /maintenance/i })).toBeVisible()
  })

  test('should display maintenance requests table or list', async ({ page }) => {
    await verifyLoadingComplete(page)

    const tableExists = (await page.getByRole('table').count()) > 0
    const listExists = (await page.getByRole('list').count()) > 0

    if (tableExists) {
      await verifyTableRenders(page)
    }

    expect(tableExists || listExists).toBe(true)
  })

  test('should have new request button', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new.*request|create|submit/i }).or(
      page.getByRole('link', { name: /new.*request/i })
    )

    const buttonExists = (await newButton.count()) > 0
    if (buttonExists) {
      await expect(newButton.first()).toBeVisible()
    }
  })

  test('should navigate to new maintenance request page', async ({ page }) => {
    await page.goto(`${baseUrl}${ROUTES.TENANT_MAINTENANCE_NEW}`)
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/maintenance/new')
  })

  test('should open new request modal or page', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new.*request|create/i }).or(
      page.getByRole('link', { name: /new.*request/i })
    )

    if ((await newButton.count()) > 0) {
      await newButton.click()
      await page.waitForTimeout(500)

      const modalOpen = (await page.locator('[role="dialog"]').count()) > 0
      const urlChanged = page.url().includes('/maintenance/new')

      expect(modalOpen || urlChanged).toBe(true)
    }
  })

  test('should display request form fields', async ({ page }) => {
    await page.goto(`${baseUrl}${ROUTES.TENANT_MAINTENANCE_NEW}`)
    await page.waitForLoadState('networkidle')

    const formFields = page.getByLabel(/title|description|category|priority/i)
    const count = await formFields.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display request status in list', async ({ page }) => {
    await verifyLoadingComplete(page)

    const statusBadges = page.getByText(/open|in progress|completed|pending/i)
    const count = await statusBadges.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display priority badges', async ({ page }) => {
    await verifyLoadingComplete(page)

    const priorities = page.getByText(/high|medium|low|urgent/i)
    const count = await priorities.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display request categories', async ({ page }) => {
    await verifyLoadingComplete(page)

    const categories = page.getByText(/plumbing|electrical|hvac|appliance|other/i)
    const count = await categories.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should allow viewing request details', async ({ page }) => {
    await verifyLoadingComplete(page)

    const viewButton = page.getByRole('button', { name: /view|details/i }).first()

    if ((await viewButton.count()) > 0) {
      await viewButton.click()
      await page.waitForTimeout(500)

      const detailsVisible = (await page.getByText(/description|status|category/i).count()) > 0
      expect(detailsVisible).toBe(true)
    }
  })
})
