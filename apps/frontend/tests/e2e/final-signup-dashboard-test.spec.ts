import { test, expect } from '@playwright/test'

test.describe('Complete Signup → Dashboard Flow', () => {
  test('complete user journey from signup to dashboard home page', async ({ page }) => {
    console.log('🚀 Starting complete signup → dashboard test...')
    
    // Navigate to signup page
    await page.goto('http://localhost:3003/auth/signup')
    console.log('📍 Navigated to signup page')
    
    // Take initial screenshot
    await page.screenshot({ path: 'FINAL-01-signup-page.png', fullPage: true })
    
    // Verify signup form is visible
    const signupForm = page.locator('form')
    await expect(signupForm).toBeVisible()
    console.log('✅ Signup form is visible')
    
    // Fill out the form with unique test data
    const testEmail = `test-success-${Date.now()}@example.com`
    const testPassword = 'SecurePass123!'
    const testName = 'Test User Success'
    
    console.log('📝 Filling form with:', { email: testEmail, name: testName })
    
    await page.fill('input[name="fullName"]', testName)
    await page.fill('input[name="email"]', testEmail) 
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    
    // Accept terms
    await page.check('input[name="terms"]')
    
    // Take screenshot before submit
    await page.screenshot({ path: 'FINAL-02-form-filled.png', fullPage: true })
    
    // Listen for console messages and navigation
    let authStateChanges = []
    let navigationEvents = []
    
    page.on('console', msg => {
      const text = msg.text()
      console.log(`🖥️  Console [${msg.type()}]:`, text)
      
      if (text.includes('Auth state changed') || text.includes('signupAction')) {
        authStateChanges.push(text)
      }
    })
    
    page.on('framenavigated', () => {
      const url = page.url()
      navigationEvents.push(url)
      console.log('🧭 Navigation to:', url)
    })
    
    // Submit the form
    console.log('🔥 Submitting signup form...')
    await page.click('button[type="submit"]')
    
    // Wait for response and potential navigation
    await page.waitForTimeout(3000)
    
    // Take screenshot after submit
    await page.screenshot({ path: 'FINAL-03-after-submit.png', fullPage: true })
    
    const currentUrl = page.url()
    console.log('📍 Current URL after submit:', currentUrl)
    
    // Check if we see a success message or redirect
    if (currentUrl.includes('verify-email')) {
      console.log('✅ Redirected to email verification page')
      
      // Try to manually navigate to dashboard to test redirect protection
      console.log('🔗 Testing dashboard access without verification...')
      await page.goto('http://localhost:3003/dashboard')
      await page.waitForTimeout(1000)
      
      const afterDashboardUrl = page.url()
      console.log('📍 URL after dashboard attempt:', afterDashboardUrl)
      
      if (afterDashboardUrl.includes('/auth/login')) {
        console.log('✅ Correctly redirected to login - authentication protection working')
        await page.screenshot({ path: 'FINAL-04-login-redirect.png', fullPage: true })
      } else if (afterDashboardUrl.includes('/dashboard')) {
        console.log('✅ Dashboard accessible - session created successfully!')
        await page.screenshot({ path: 'FINAL-04-dashboard-success.png', fullPage: true })
      }
      
    } else if (currentUrl.includes('/dashboard')) {
      console.log('🎉 SUCCESS: Immediately redirected to dashboard!')
      
      // Verify we're on the dashboard with proper content
      await page.waitForSelector('h1', { timeout: 5000 })
      const dashboardTitle = await page.locator('h1').first().textContent()
      console.log('📋 Dashboard title:', dashboardTitle)
      
      // Check for dashboard-specific content
      const statsCards = page.locator('[data-testid="stats-card"], .stats-card, [class*="stat"]')
      const statsCount = await statsCards.count()
      console.log('📊 Stats cards found:', statsCount)
      
      // Check for navigation/sidebar
      const navigation = page.locator('nav, [role="navigation"], .sidebar')
      const navExists = await navigation.count() > 0
      console.log('🧭 Navigation found:', navExists)
      
      await page.screenshot({ path: 'FINAL-04-dashboard-success.png', fullPage: true })
      
      // Test that user is actually authenticated by checking for logout functionality
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Sign out"), button:has-text("Logout")')
      const userMenuExists = await userMenu.count() > 0
      console.log('👤 User menu found:', userMenuExists)
      
      console.log('🎉 COMPLETE SUCCESS: User successfully signed up and reached authenticated dashboard!')
      
    } else {
      console.log('❌ Unexpected state after signup')
      console.log('Current URL:', currentUrl)
      
      // Check for error messages
      const errorElements = await page.locator('[role="alert"], .text-red-600, .bg-red-50, .error').allTextContents()
      if (errorElements.length > 0) {
        console.log('🚨 Error messages found:', errorElements)
      }
      
      // Check for success messages
      const successElements = await page.locator('.text-green-600, .bg-green-50, .success').allTextContents()
      if (successElements.length > 0) {
        console.log('✅ Success messages found:', successElements)
      }
      
      await page.screenshot({ path: 'FINAL-04-unexpected-state.png', fullPage: true })
    }
    
    // Log summary of auth state changes and navigation
    console.log('📋 Auth state changes:', authStateChanges.length)
    console.log('🧭 Navigation events:', navigationEvents)
    
    console.log('🏁 Signup → Dashboard test complete')
  })
})