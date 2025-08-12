import { test, expect } from '@playwright/test'

test.describe('Real Signup Test', () => {
  test('should complete signup and redirect to verify email page', async ({ page }) => {
    // Generate unique email
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    
    // Navigate to signup page
    await page.goto('/auth/signup')
    
    // Fill form
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    
    // Check terms
    await page.check('input#terms')
    
    // Click submit
    await page.click('button[type="submit"]')
    
    // Wait a bit for the form to process
    await page.waitForTimeout(2000)
    
    // Check for error messages first
    const errorAlert = await page.locator('[role="alert"], .text-red-600, .text-red-800, .bg-red-50').first().textContent().catch(() => null)
    if (errorAlert) {
      console.log('Error found:', errorAlert)
    }
    
    // Wait for redirect or success message
    await page.waitForURL('**/verify-email**', { timeout: 5000 }).catch(() => {
      console.log('No redirect, checking for success message...')
    })
    
    // Check if we see success message or are on verify email page
    const currentUrl = page.url()
    const hasVerifyEmail = currentUrl.includes('verify-email')
    const hasSuccessToast = await page.locator('text=/Account created/i').isVisible().catch(() => false)
    
    console.log('Final URL:', currentUrl)
    console.log('Has verify-email in URL:', hasVerifyEmail)
    console.log('Has success toast:', hasSuccessToast)
    
    // Should either redirect or show success
    expect(hasVerifyEmail || hasSuccessToast).toBeTruthy()
  })
})