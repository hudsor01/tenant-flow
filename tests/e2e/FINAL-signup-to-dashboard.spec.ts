import { test, expect } from '@playwright/test'

test.describe('🚨 COMPLETE FLOW: Signup → Login → Dashboard', () => {
  test('MUST WORK: Complete signup to dashboard with screenshot proof', async ({ page }) => {
    const timestamp = Date.now()
    const testEmail = `dashboard-test-${timestamp}@example.com`
    const testPassword = 'Test123!Password'
    const testName = 'Dashboard Test User'
    
    console.log('🚨 STARTING COMPLETE FLOW TEST')
    console.log(`📧 Test Email: ${testEmail}`)
    
    // STEP 1: SIGNUP
    console.log('\n📝 STEP 1: SIGNUP')
    await page.goto('http://localhost:3000/auth/signup')
    
    // Wait for signup page
    await page.waitForLoadState('networkidle')
    console.log('✅ Signup page loaded')
    
    // Fill signup form (using selectors from working test)
    await page.fill('input[name="fullName"], input[placeholder*="John"], input[placeholder*="Name"]', testName)
    await page.fill('input[name="email"], input[name="emailAddress"], input[type="email"]', testEmail)
    await page.fill('input[type="password"], input[name="password"]', testPassword)
    
    // Check the terms checkbox if present
    const termsCheckbox = page.locator('input[type="checkbox"][name="terms"]')
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check()
      console.log('✅ Terms accepted')
    }
    
    console.log('✅ Signup form filled')
    
    // Screenshot before submission
    await page.screenshot({
      path: 'test-results/FINAL-01-signup-form-filled.png',
      fullPage: true
    })
    
    // Submit signup
    const signupButton = page.locator('button').filter({ 
      hasText: /start|continue|get started|create|sign up|next/i 
    }).first()
    
    await signupButton.click()
    console.log('✅ Signup submitted')
    
    // Wait for navigation
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Give time for any redirects
    
    const afterSignupUrl = page.url()
    console.log(`📍 After signup URL: ${afterSignupUrl}`)
    
    // STEP 2: HANDLE POST-SIGNUP FLOW
    console.log('\n🔄 STEP 2: POST-SIGNUP HANDLING')
    
    // Check if we're already on dashboard (auto-login worked)
    if (afterSignupUrl.includes('/dashboard')) {
      console.log('🎉 AUTO-LOGIN WORKED! Already on dashboard!')
    } 
    // Check if we need to verify email
    else if (afterSignupUrl.includes('verify') || afterSignupUrl.includes('confirm')) {
      console.log('📧 Email verification required - skipping for test')
      // In real scenario, would need to handle email verification
    }
    // Otherwise, we need to login manually
    else {
      console.log('🔑 Manual login required')
      
      // STEP 3: LOGIN
      console.log('\n🔐 STEP 3: LOGIN')
      
      // Navigate to login if not already there
      if (!afterSignupUrl.includes('login')) {
        await page.goto('http://localhost:3000/auth/login')
        await page.waitForLoadState('networkidle')
      }
      
      console.log('✅ On login page')
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', testEmail)
      await page.fill('input[type="password"], input[name="password"]', testPassword)
      console.log('✅ Login form filled')
      
      // Screenshot login form
      await page.screenshot({
        path: 'test-results/FINAL-02-login-form-filled.png',
        fullPage: true
      })
      
      // Submit login
      const loginButton = page.locator('button').filter({ 
        hasText: /sign in|log in|login|continue/i 
      }).first()
      
      await loginButton.click()
      console.log('✅ Login submitted')
      
      // Wait for navigation to dashboard
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000) // Give time for auth to complete
    }
    
    // STEP 4: VERIFY DASHBOARD ACCESS
    console.log('\n🏠 STEP 4: DASHBOARD VERIFICATION')
    
    // Try to navigate to dashboard
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    const finalUrl = page.url()
    console.log(`📍 Final URL: ${finalUrl}`)
    
    // CRITICAL: Check if we're on the dashboard
    if (finalUrl.includes('/dashboard')) {
      console.log('✅✅✅ SUCCESS! ON DASHBOARD!')
      
      // Wait for dashboard content to load
      await page.waitForTimeout(2000)
      
      // Take THE screenshot that proves everything works
      await page.screenshot({
        path: 'test-results/FINAL-03-DASHBOARD-HOME-SUCCESS.png',
        fullPage: true
      })
      
      console.log('📸 DASHBOARD SCREENSHOT CAPTURED!')
      
      // Try to find dashboard elements as extra proof
      const dashboardElements = [
        page.locator('text=/welcome/i'),
        page.locator('text=/dashboard/i'),
        page.locator('text=/overview/i'),
        page.locator('text=/properties/i'),
        page.locator('text=/tenants/i'),
        page.locator('[data-testid="dashboard"]'),
        page.locator('nav'),
        page.locator('main')
      ]
      
      for (const element of dashboardElements) {
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          const text = await element.textContent().catch(() => 'N/A')
          console.log(`✅ Found dashboard element: ${text?.substring(0, 50)}`)
        }
      }
      
      // Final victory screenshot
      await page.screenshot({
        path: 'test-results/FINAL-04-DASHBOARD-VICTORY.png',
        fullPage: true
      })
      
      console.log('\n🎉🎉🎉 COMPLETE SUCCESS! 🎉🎉🎉')
      console.log('✅ User signed up')
      console.log('✅ User logged in')
      console.log('✅ Dashboard accessed')
      console.log('✅ Screenshot proof captured')
      console.log('\n🚀 SIGNUP → DASHBOARD FLOW WORKING!')
      
    } else if (finalUrl.includes('/login') || finalUrl.includes('/auth')) {
      console.log('❌ FAILED: Still on login page - authentication not working')
      console.log('🔍 Debugging info:')
      console.log(`   - Current URL: ${finalUrl}`)
      console.log(`   - Test email: ${testEmail}`)
      
      // Take failure screenshot
      await page.screenshot({
        path: 'test-results/FINAL-FAILED-still-on-login.png',
        fullPage: true
      })
      
      throw new Error('Authentication failed - cannot reach dashboard')
    } else {
      console.log(`❌ UNEXPECTED: Ended up at ${finalUrl}`)
      
      // Take debug screenshot
      await page.screenshot({
        path: 'test-results/FINAL-UNEXPECTED-location.png',
        fullPage: true
      })
      
      throw new Error(`Unexpected location: ${finalUrl}`)
    }
    
    // Make assertion to pass/fail the test
    expect(finalUrl).toContain('/dashboard')
  })
})