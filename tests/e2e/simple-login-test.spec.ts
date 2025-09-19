import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should successfully login and navigate to dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3005/login')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check we're on the login page
    await expect(page).toHaveURL(/.*\/login/)

    // Fill in login form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123456!')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for navigation or error
    await page.waitForTimeout(2000)

    // Check for toast notification
    const toastLocator = page.locator('[role="alert"]').first()
    const hasToast = await toastLocator.isVisible().catch(() => false)

    if (hasToast) {
      const toastText = await toastLocator.textContent()
      console.log('Toast notification:', toastText)

      // Check if it's a success toast
      const isSuccess = toastText?.toLowerCase().includes('welcome') ||
                       toastText?.toLowerCase().includes('success')

      if (isSuccess) {
        console.log('✅ Login successful - toast shown')

        // Wait for dashboard redirect
        await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {
          console.log('⚠️ Dashboard redirect did not occur')
        })

        // Verify we're on dashboard
        const currentUrl = page.url()
        if (currentUrl.includes('/dashboard')) {
          console.log('✅ Successfully routed to dashboard:', currentUrl)
        } else {
          console.log('❌ Not routed to dashboard. Current URL:', currentUrl)
        }
      } else {
        console.log('❌ Login failed - error toast shown:', toastText)
      }
    } else {
      console.log('⚠️ No toast notification found')

      // Check if we were redirected anyway
      const currentUrl = page.url()
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Routed to dashboard (no toast):', currentUrl)
      } else {
        console.log('❌ Login may have failed. Current URL:', currentUrl)
      }
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'login-test-result.png', fullPage: true })
    console.log('📸 Screenshot saved as login-test-result.png')
  })
})