import { test as setup, expect } from '@playwright/test'
import { loginAsTenant } from '../auth-helpers'

const authFile = 'playwright/.auth/tenant.json'

setup('authenticate as tenant', async ({ page }) => {
  await loginAsTenant(page)

  // Wait for successful redirect to tenant portal
  await page.waitForURL('**/tenant')

  // Verify logged in state - tenant portal should have content
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  // Save authenticated state
  await page.context().storageState({ path: authFile })
})
