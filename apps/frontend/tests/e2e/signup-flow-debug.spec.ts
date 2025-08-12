import { test, expect } from '@playwright/test'

test.describe('Signup Flow Debug', () => {
  test('debug complete signup → dashboard flow', async ({ page }) => {
    console.log('🔍 Starting signup flow debug...')
    
    // Navigate to signup page
    await page.goto('http://localhost:3003/auth/signup')
    console.log('📍 Navigated to signup page')
    
    // Take initial screenshot
    await page.screenshot({ path: 'signup-initial-debug.png', fullPage: true })
    
    // Check if signup form is visible
    const signupForm = page.locator('form')
    await expect(signupForm).toBeVisible()
    console.log('✅ Signup form is visible')
    
    // Fill out the form with debug data
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'SecurePass123!'
    const testName = 'Test User Debug'
    
    console.log('📝 Filling form with:', { email: testEmail, name: testName })
    
    // Fill all required fields
    await page.fill('input[name="fullName"]', testName)
    await page.fill('input[name="email"]', testEmail) 
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    
    // Accept terms
    await page.check('input[name="terms"]')
    
    // Take screenshot before submit
    await page.screenshot({ path: 'signup-filled-debug.png', fullPage: true })
    
    // Debug form state before submission
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form')
      if (!form) return null
      
      const data = new FormData(form)
      return Object.fromEntries(data.entries())
    })
    console.log('📋 Form data before submit:', formData)
    
    // Listen for navigation events
    let navigationOccurred = false
    page.on('framenavigated', () => {
      navigationOccurred = true
      console.log('🧭 Navigation detected to:', page.url())
    })
    
    // Listen for console messages
    page.on('console', msg => {
      console.log(`🖥️  Browser console [${msg.type()}]:`, msg.text())
    })
    
    // Submit the form
    console.log('🔥 Clicking submit button...')
    await page.click('button[type="submit"]')
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000)
    
    // Take screenshot after submit
    await page.screenshot({ path: 'signup-after-submit-debug.png', fullPage: true })
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL after submit:', currentUrl)
    
    // Check if we're on success page or error page
    if (currentUrl.includes('verify-email')) {
      console.log('✅ Redirected to email verification page')
      
      // Try to simulate clicking email verification link
      // For testing, we'll try to navigate directly to dashboard
      console.log('🔗 Attempting to navigate to dashboard...')
      await page.goto('http://localhost:3003/dashboard')
      
      await page.waitForTimeout(1000)
      const dashboardUrl = page.url()
      console.log('📍 Dashboard URL:', dashboardUrl)
      
      if (dashboardUrl.includes('/auth/login')) {
        console.log('❌ Redirected to login - authentication failed')
        await page.screenshot({ path: 'signup-login-redirect-debug.png', fullPage: true })
      } else if (dashboardUrl.includes('/dashboard')) {
        console.log('✅ Successfully reached dashboard!')
        await page.screenshot({ path: 'signup-dashboard-success-debug.png', fullPage: true })
      } else {
        console.log('❓ Unexpected redirect:', dashboardUrl)
        await page.screenshot({ path: 'signup-unexpected-debug.png', fullPage: true })
      }
    } else if (currentUrl.includes('/dashboard')) {
      console.log('✅ Already on dashboard!')
      await page.screenshot({ path: 'signup-dashboard-immediate-debug.png', fullPage: true })
    } else {
      console.log('❌ Unexpected state after signup')
      
      // Check for error messages
      const errorMessages = await page.locator('[role="alert"], .text-red-600, .bg-red-50').allTextContents()
      if (errorMessages.length > 0) {
        console.log('🚨 Error messages found:', errorMessages)
      }
      
      await page.screenshot({ path: 'signup-error-state-debug.png', fullPage: true })
    }
    
    console.log('🏁 Signup flow debug complete')
  })
})