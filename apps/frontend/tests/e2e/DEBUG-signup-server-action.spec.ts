import { test, expect } from '@playwright/test'

test.describe('🔍 DEBUG: Signup Server Action', () => {
  test('debug signup server action response', async ({ page }) => {
    console.log('🔍 DEBUG: Testing signup server action response')
    
    // Navigate to signup page
    await page.goto('/auth/signup')
    await page.waitForSelector('form', { timeout: 10000 })
    
    // Generate test data
    const timestamp = Date.now()
    const testEmail = `debug-${timestamp}@example.com`
    
    // Fill form
    await page.fill('input[name="fullName"]', 'Debug User')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', 'DebugTest123!')
    await page.fill('input[name="confirmPassword"]', 'DebugTest123!')
    await page.check('input[name="terms"]')
    
    // Capture all server action logs
    const serverLogs: string[] = []
    page.on('console', msg => {
      const log = `[${msg.type()}] ${msg.text()}`
      serverLogs.push(log)
      if (log.includes('[signupAction]') || log.includes('Auth state') || log.includes('error') || log.includes('Error')) {
        console.log('🔍 SERVER:', log)
      }
    })
    
    // Listen for network requests
    page.on('request', request => {
      if (request.method() === 'POST') {
        console.log('📡 POST REQUEST:', request.url())
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('/auth/signup')) {
        console.log('📡 SIGNUP RESPONSE:', {
          url: response.url(),
          status: response.status(),
          ok: response.ok()
        })
      }
    })
    
    // Submit form
    console.log('🚀 Submitting form...')
    await page.click('button[type="submit"]')
    
    // Wait and capture state
    await page.waitForTimeout(5000)
    
    // Check what happened
    const pageText = await page.textContent('body')
    const currentUrl = page.url()
    
    console.log('📊 FINAL STATE:', {
      url: currentUrl,
      hasError: pageText?.includes('error') || pageText?.includes('Error'),
      hasSuccess: pageText?.includes('Account created') || pageText?.includes('Success'),
      hasEmailVerify: pageText?.includes('verify') || pageText?.includes('check your email'),
      serverLogCount: serverLogs.length
    })
    
    // Check for any visible error messages
    const errorElements = await page.locator('[role="alert"], .error, .text-red-500, .text-red-600, .bg-red-50').all()
    for (const element of errorElements) {
      const text = await element.textContent()
      if (text?.trim()) {
        console.log('❌ ERROR ELEMENT:', text.trim())
      }
    }
    
    // Check for success messages
    const successElements = await page.locator('.bg-green-50, .text-green-600, .text-green-800, [data-state="open"]').all()
    for (const element of successElements) {
      const text = await element.textContent()
      if (text?.trim()) {
        console.log('✅ SUCCESS ELEMENT:', text.trim())
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'DEBUG-signup-final-state.png',
      fullPage: true 
    })
    
    console.log('🔍 DEBUG TEST COMPLETE - Check screenshot and logs above')
  })
})