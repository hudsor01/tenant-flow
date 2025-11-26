import { test as setup, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'
import { ROUTES } from '../constants/routes'
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
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const tenantEmail = process.env.E2E_TENANT_EMAIL || 'test-tenant@tenantflow.app'

  console.log(`🔧 Setting up E2E tenant invitation for: ${tenantEmail}`)

  // Step 1: Login as owner
  await loginAsOwner(page)
  console.log('✅ Logged in as owner')

  // Step 2: Navigate to tenants page
  await page.goto(`${baseUrl}${ROUTES.TENANTS}`)
  await page.waitForLoadState('networkidle')
  console.log('✅ Navigated to tenants page')

  // Step 3: Click invite tenant button
  const inviteButton = page.getByRole('button', { name: /invite tenant/i }).or(
    page.getByRole('link', { name: /invite tenant/i })
  )

  // Check if button exists
  const buttonExists = (await inviteButton.count()) > 0
  if (!buttonExists) {
    throw new Error('Invite Tenant button not found on page')
  }

  await inviteButton.click()
  await page.waitForTimeout(500)
  console.log('✅ Clicked invite tenant button')

  // Step 4: Verify modal opened
  const modal = page.locator('[role="dialog"]')
  await expect(modal).toBeVisible({ timeout: 5000 })
  console.log('✅ Invitation modal opened')

  // Step 5: Fill invitation form
  await fillTextInput(page, 'Email', tenantEmail)
  console.log(`✅ Filled email: ${tenantEmail}`)

  // Step 6: Select property if required
  const propertyField = modal.getByRole('combobox', { name: /property/i })
  if ((await propertyField.count()) > 0) {
    await propertyField.click()
    await page.waitForTimeout(500)

    // Select first property option
    const firstOption = page.getByRole('option').first()
    if ((await firstOption.count()) > 0) {
      await firstOption.click()
      console.log('✅ Selected property')
    }
  }

  // Step 7: Submit invitation
  await submitModalForm(page, 'Send Invitation')
  console.log('✅ Submitted invitation')

  // Step 8: Wait for success
  await page.waitForTimeout(3000)

  // Step 9: Verify success (modal closed OR success toast)
  const modalClosed = (await modal.count()) === 0
  const hasSuccessToast = (await page.getByText(/success|invited|sent/i).count()) > 0

  if (!modalClosed && !hasSuccessToast) {
    // Check for error messages
    const errorText = await modal.textContent()
    throw new Error(`Invitation failed. Modal content: ${errorText}`)
  }

  console.log('✅ Tenant invitation successful!')
  console.log(`📧 Tenant can now login with: ${tenantEmail}`)
})
