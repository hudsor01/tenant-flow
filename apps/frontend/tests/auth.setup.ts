/**
 * Authentication setup for Playwright tests
 * Sets up authenticated state for protected routes
 */

import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to the login page
  await page.goto('/auth/login')
  
  // Check if we're already logged in (might have session)
  const url = page.url()
  if (url.includes('/dashboard')) {
    // Already logged in, save the state
    await page.context().storageState({ path: authFile })
    return
  }
  
  // Fill in login credentials (use test account or environment variables)
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com'
  const testPassword = process.env.TEST_USER_PASSWORD || 'Test123!'
  
  // Wait for login form to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  
  // Fill login form
  await page.fill('input[type="email"]', testEmail)
  await page.fill('input[type="password"]', testPassword)
  
  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click()
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  
  // Verify we're logged in
  await expect(page).toHaveURL(/.*dashboard/)
  
  // Save authenticated state
  await page.context().storageState({ path: authFile })
})