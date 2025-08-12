import { test, expect } from '@playwright/test'

test.describe('EMERGENCY: Signup Dashboard Redirect Test', () => {
  test('should redirect to dashboard after successful signup', async ({ page }) => {
    console.log('🚨 EMERGENCY TEST: Testing signup to dashboard redirect')
    
    // Navigate to signup page
    await page.goto('http://localhost:3004/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of signup page
    await page.screenshot({ path: 'test-results/01-signup-page.png', fullPage: true })
    
    // Fill signup form with unique test data
    const timestamp = Date.now()
    const testEmail = `test-${timestamp}@example.com`
    
    console.log('📝 Filling signup form with:', testEmail)
    
    // Fill form fields
    await page.fill('[name="fullName"]', 'Test User')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.fill('[name="confirmPassword"]', 'TestPassword123!')
    
    // Accept terms
    await page.check('[name="terms"]')
    
    // Take screenshot before submission
    await page.screenshot({ path: 'test-results/02-form-filled.png', fullPage: true })
    
    // Wait for form validation
    await page.waitForTimeout(1000)
    
    // Submit form
    console.log('🚀 Submitting signup form')
    await page.click('button[type="submit"]')
    
    // Wait for either success message or error
    await page.waitForTimeout(2000)
    
    // Take screenshot after submission
    await page.screenshot({ path: 'test-results/03-after-submit.png', fullPage: true })
    
    // Check for success message
    const successToast = page.locator('text=Account created!')
    if (await successToast.isVisible()) {
      console.log('✅ Success toast appeared')
      await page.screenshot({ path: 'test-results/04-success-toast.png', fullPage: true })
    }
    
    // Wait for redirect to dashboard (max 5 seconds)
    console.log('⏳ Waiting for redirect to dashboard...')
    
    try {
      // Wait for URL to change to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 8000 })
      console.log('🎉 SUCCESS: Redirected to dashboard!')
      
      // Take final screenshot
      await page.screenshot({ path: 'test-results/05-FINAL-dashboard.png', fullPage: true })
      
      // Verify we're on dashboard
      expect(page.url()).toContain('/dashboard')
      
    } catch (error) {
      console.log('❌ FAILED: Did not redirect to dashboard')
      console.log('Current URL:', page.url())
      
      // Take failure screenshot
      await page.screenshot({ path: 'test-results/05-FAILED-no-redirect.png', fullPage: true })
      
      throw error
    }
  })
})