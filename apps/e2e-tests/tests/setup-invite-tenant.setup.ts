import { test as setup, expect } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { loginAsOwner } from '../auth-helpers'
import { ROUTES } from './constants/routes'
import { fillTextInput } from './helpers/form-helpers'
import { submitModalForm } from './helpers/modal-helpers'

/**
 * Setup: Invite E2E Test Tenant
 *
 * CRITICAL: This must run BEFORE tenant tests
 *
 * Flow:
 * 1. Login as owner
 * 2. Navigate to tenants page
 * 3. Click "Invite Tenant" button
 * 4. Fill invitation form with E2E_TENANT_EMAIL
 * 5. Submit invitation
 * 6. Backend creates tenant user with user_type = 'TENANT'
 * 7. Tenant can now login in subsequent tests
 *
 * Business Logic:
 * - Tenants are ONLY created via owner invitation
 * - Default signup user_type is 'OWNER'
 * - Invitation flow sets user_type = 'TENANT' correctly
 */

setup('invite e2e test tenant', async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
  const tenantEmail = process.env.E2E_TENANT_EMAIL || 'test-tenant@tenantflow.app'
	const logger = createLogger({ component: 'SetupInviteTenant' })

	logger.info(`🔧 Setting up E2E tenant invitation for: ${tenantEmail}`)

  // Step 1: Login as owner
  await loginAsOwner(page)
	logger.info('✅ Logged in as owner')

  // Step 2: Navigate to tenants page
  await page.goto(`${baseUrl}${ROUTES.TENANTS}`)
  await page.waitForLoadState('networkidle')
	logger.info('✅ Navigated to tenants page')

  // Step 3: Wait for content to load (skeleton to disappear)
  // The page shows "Tenants" heading only after loading completes
  await expect(page.getByRole('heading', { name: 'Tenants', level: 1 })).toBeVisible({ timeout: 15000 })
	logger.info('✅ Page content loaded')

  // Step 4: Click invite tenant button (wait for it to be visible)
  const inviteButton = page.getByRole('link', { name: /invite tenant/i })
  await expect(inviteButton).toBeVisible({ timeout: 10000 })
  await inviteButton.click()

  // Step 5: Wait for modal to open (deterministic wait per Playwright docs)
  const modal = page.locator('[role="dialog"]')
  await expect(modal).toBeVisible({ timeout: 5000 })
	logger.info('✅ Invitation modal opened')

  // Step 6: Fill invitation form with all required fields
  // First Name (required)
  await fillTextInput(page, 'First Name', 'Test')
	logger.info('✅ Filled first name')

  // Last Name (required)
  await fillTextInput(page, 'Last Name', 'Tenant')
	logger.info('✅ Filled last name')

  // Email (required)
  await fillTextInput(page, 'Email', tenantEmail)
	logger.info(`✅ Filled email: ${tenantEmail}`)

  // Step 7: Select property (required)
  const propertyTrigger = modal.locator('#property_id').or(
    modal.getByRole('combobox', { name: /property/i })
  )
	if ((await propertyTrigger.count()) > 0) {
		await propertyTrigger.click()
		// Wait for dropdown options to appear (deterministic)
		const firstOption = page.getByRole('option').first()
		await expect(firstOption).toBeVisible({ timeout: 5000 })
		await firstOption.click()
		logger.info('✅ Selected property')
	} else {
		throw new Error('Property field not found - cannot complete tenant invitation')
	}

  // Step 8: Submit invitation
  await submitModalForm(page, 'Send Invitation')
	logger.info('✅ Submitted invitation')

  // Step 9: Wait for success (deterministic - wait for modal to close OR success message)
  // Use Promise.race to wait for either condition
  await expect(async () => {
    const modalVisible = await modal.isVisible()
    const hasSuccessToast = (await page.getByText(/success|invited|sent/i).count()) > 0
    expect(modalVisible === false || hasSuccessToast).toBeTruthy()
  }).toPass({ timeout: 10000 })

  // Step 10: Verify success
  const modalClosed = !(await modal.isVisible())
  const hasSuccessToast = (await page.getByText(/success|invited|sent/i).count()) > 0

  if (!modalClosed && !hasSuccessToast) {
    // Check for error messages
    const errorText = await modal.textContent()
    throw new Error(`Invitation failed. Modal content: ${errorText}`)
  }

	logger.info('✅ Tenant invitation successful!')
	logger.info(`📧 Tenant can now login with: ${tenantEmail}`)
})
