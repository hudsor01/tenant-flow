import { test, expect } from '@playwright/test'

test.describe('🚨 EMERGENCY: Signup → Dashboard Redirect', () => {
  test('CRITICAL: signup must redirect to dashboard home - WITH PROOF', async ({ page }) => {
    console.log('🚨 EMERGENCY TEST: Verifying signup redirects to dashboard')
    
    // Navigate to signup page
    await page.goto('/auth/signup')
    
    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 })
    console.log('✅ Signup form loaded')
    
    // Generate unique test data
    const timestamp = Date.now()
    const testEmail = `emergency-test-${timestamp}@example.com`
    const testPassword = 'EmergencyTest123!'
    
    console.log('📝 EMERGENCY SIGNUP DATA:', { 
      email: testEmail,
      timestamp: new Date().toISOString()
    })
    
    // Fill signup form
    await page.fill('input[name="fullName"]', 'Emergency Test User')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    
    // Check terms (critical fix) - with multiple selectors
    console.log('🔍 Attempting to check terms checkbox...')
    
    try {
      // Try multiple ways to check the checkbox
      await page.check('input[name="terms"]')
      console.log('✅ Method 1: input[name="terms"] checked')
    } catch (error) {
      console.log('❌ Method 1 failed, trying input#terms...')
      try {
        await page.check('input#terms')
        console.log('✅ Method 2: input#terms checked')
      } catch (error2) {
        console.log('❌ Method 2 failed, trying click on checkbox...')
        await page.click('input[type="checkbox"]')
        console.log('✅ Method 3: clicked checkbox')
      }
    }
    
    // Verify checkbox is actually checked
    const isChecked = await page.isChecked('input[name="terms"]') || await page.isChecked('input#terms') || await page.isChecked('input[type="checkbox"]')
    console.log('🔍 Checkbox verification:', { isChecked })
    
    if (!isChecked) {
      console.log('🚨 CRITICAL: Checkbox not checked - forcing click...')
      await page.click('label[for="terms"]') // Try clicking the label
      const isNowChecked = await page.isChecked('input[name="terms"]') || await page.isChecked('input#terms')
      console.log('🔍 After label click:', { isNowChecked })
    }
    
    // Take screenshot BEFORE submission
    await page.screenshot({ 
      path: 'EMERGENCY-01-before-signup.png',
      fullPage: true 
    })
    console.log('📸 Screenshot taken: BEFORE signup submission')
    
    // Submit form and track network
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth/signup') || 
      response.url().includes('api.tenantflow.app') 
    )
    
    console.log('🚀 SUBMITTING SIGNUP FORM...')
    await page.click('button[type="submit"]')
    
    // Take screenshot IMMEDIATELY after click
    await page.screenshot({ 
      path: 'EMERGENCY-02-after-submit-click.png',
      fullPage: true 
    })
    console.log('📸 Screenshot taken: AFTER submit button click')
    
    // Wait for either success or error response
    try {
      const response = await responsePromise
      console.log('📡 Network response received:', {
        url: response.url(),
        status: response.status(),
        ok: response.ok()
      })
    } catch (error) {
      console.log('⚠️ No network response detected, continuing...')
    }
    
    // Capture console logs for debugging
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const log = `[${msg.type()}] ${msg.text()}`
      consoleLogs.push(log)
      console.log('🔍 Browser console:', log)
    })
    
    // Wait for potential page changes/redirects
    await page.waitForTimeout(3000)
    
    // Take screenshot after waiting
    await page.screenshot({ 
      path: 'EMERGENCY-03-after-wait.png',
      fullPage: true 
    })
    console.log('📸 Screenshot taken: AFTER waiting 3 seconds')
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL after signup:', currentUrl)
    
    // Look for success indicators
    const hasSuccessToast = await page.locator('text=/Account created|Welcome|Success/i').count() > 0
    const hasErrorMessage = await page.locator('text=/error|Error|failed|Failed/i').count() > 0
    
    // Check what's actually visible on the page
    const pageText = await page.textContent('body')
    console.log('🔍 Full page text contains:', {
      hasAccountCreated: pageText?.includes('Account created'),
      hasRedirecting: pageText?.includes('Redirecting'),
      hasVerifyEmail: pageText?.includes('verify'),
      hasError: pageText?.includes('error') || pageText?.includes('Error'),
    })
    
    console.log('🔍 Page state analysis:', {
      url: currentUrl,
      hasSuccessToast,
      hasErrorMessage,
      isOnDashboard: currentUrl.includes('/dashboard'),
      isOnSignup: currentUrl.includes('/auth/signup'),
      isOnVerifyEmail: currentUrl.includes('/verify-email')
    })
    
    // Wait up to 5 seconds for redirect to dashboard
    console.log('⏳ Waiting for dashboard redirect...')
    try {
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      console.log('✅ SUCCESS: Redirected to dashboard!')
      
      // Take final success screenshot
      await page.screenshot({ 
        path: 'EMERGENCY-04-SUCCESS-dashboard.png',
        fullPage: true 
      })
      console.log('📸 SUCCESS SCREENSHOT: User on dashboard')
      
      // Verify dashboard elements are present
      await expect(page.locator('h1, h2')).toContainText([/Dashboard|Welcome|Properties/i])
      console.log('✅ Dashboard content verified')
      
    } catch (redirectError) {
      console.log('❌ CRITICAL FAILURE: No redirect to dashboard detected')
      
      // Take failure screenshot
      await page.screenshot({ 
        path: 'EMERGENCY-05-FAILURE-no-redirect.png',
        fullPage: true 
      })
      console.log('📸 FAILURE SCREENSHOT: Stuck on current page')
      
      // Check if user got stuck somewhere
      if (currentUrl.includes('/verify-email')) {
        console.log('🚨 PROBLEM: User redirected to email verification instead of dashboard')
      } else if (currentUrl.includes('/auth/signup')) {
        console.log('🚨 PROBLEM: User stuck on signup form')
      } else {
        console.log('🚨 PROBLEM: User on unexpected page:', currentUrl)
      }
      
      // Force navigation to test if dashboard works
      console.log('🔄 Testing direct dashboard access...')
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      
      await page.screenshot({ 
        path: 'EMERGENCY-06-direct-dashboard-test.png',
        fullPage: true 
      })
      console.log('📸 Screenshot: Direct dashboard access test')
      
      const finalUrl = page.url()
      console.log('📍 Final URL after direct navigation:', finalUrl)
      
      throw new Error(`EMERGENCY FAILURE: Signup did not redirect to dashboard. Current URL: ${currentUrl}`)
    }
    
    // Final verification
    console.log('🎯 EMERGENCY TEST COMPLETE')
    console.log('📊 PROOF CAPTURED IN SCREENSHOTS:')
    console.log('   - EMERGENCY-01-before-signup.png')
    console.log('   - EMERGENCY-02-after-submit-click.png') 
    console.log('   - EMERGENCY-03-after-wait.png')
    console.log('   - EMERGENCY-04-SUCCESS-dashboard.png')
    
    expect(page.url()).toContain('/dashboard')
  })
})