import { test as setup, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

const authFile = 'playwright/.auth/owner.json'

setup('authenticate as owner', async ({ page }) => {
  await loginAsOwner(page)

  // Wait for successful redirect
  await page.waitForURL('**/dashboard')

  // Verify logged in state
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 })

  // Save authenticated state
  await page.context().storageState({ path: authFile })
})
