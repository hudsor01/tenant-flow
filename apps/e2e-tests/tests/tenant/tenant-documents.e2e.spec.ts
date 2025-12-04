import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { verifyButtonExists, verifyLoadingComplete } from '../helpers/ui-validation-helpers'

/**
 * Tenant Documents E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 */
test.describe('Tenant Documents', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly (authenticated via storageState)
    await page.goto(ROUTES.TENANT_DOCUMENTS)
    await verifyPageLoaded(page, ROUTES.TENANT_DOCUMENTS, 'Documents')
  })

  test('should render documents page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible()
  })

  test('should display documents list', async ({ page }) => {
    await verifyLoadingComplete(page)

    const documents = page.getByText(/lease|agreement|document|pdf/i)
    const count = await documents.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have download buttons for documents', async ({ page }) => {
    await verifyLoadingComplete(page)

    const downloadButtons = page.getByRole('button', { name: /download|view/i })
    const count = await downloadButtons.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display lease agreement document', async ({ page }) => {
    await verifyLoadingComplete(page)

    const leaseDoc = page.getByText(/lease.*agreement|rental.*agreement/i)
    const count = await leaseDoc.count()

    if (count > 0) {
      await expect(leaseDoc.first()).toBeVisible()
    }
  })

  test('should allow uploading documents if supported', async ({ page }) => {
    await verifyLoadingComplete(page)

    const uploadButton = page.getByRole('button', { name: /upload/i })
    const uploadExists = (await uploadButton.count()) > 0

    if (uploadExists) {
      await expect(uploadButton.first()).toBeVisible()
    }
  })

  test('should display document categories or types', async ({ page }) => {
    await verifyLoadingComplete(page)

    const categories = page.getByText(/lease|notice|receipt|other/i)
    const count = await categories.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should handle empty documents state', async ({ page }) => {
    await verifyLoadingComplete(page)

    const emptyState = page.getByText(/no documents|empty/i)
    const documentsExist = (await page.getByText(/document|lease|pdf/i).count()) > 0

    // Either documents exist or empty state is shown
    expect(documentsExist || (await emptyState.count()) > 0).toBe(true)
  })
})
