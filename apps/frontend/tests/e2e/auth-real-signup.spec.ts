import { test, expect } from '@playwright/test'

test.describe('REAL SIGNUP TEST - Does signup actually work?', () => {
  test('Can a real user actually sign up?', async ({ page }) => {
    // Generate unique test user
    const timestamp = Date.now()
    const testUser = {
      fullName: `Test User ${timestamp}`,
      email: `test.user.${timestamp}@example.com`,
      password: 'TestPassword123!@#'
    }
    
    console.log('🧪 Testing signup with:', testUser.email)
    
    // 1. Go to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // 2. Take screenshot of initial state
    await page.screenshot({ path: 'signup-initial.png', fullPage: true })
    
    // 3. Check what's actually on the page
    const pageContent = await page.textContent('body')
    console.log('Page contains "Sign Up"?', pageContent.includes('Sign Up') || pageContent.includes('Create Account'))
    
    // 4. Fill in the form
    console.log('📝 Filling form...')
    await page.fill('input#fullName', testUser.fullName)
    await page.fill('input#email', testUser.email)
    await page.fill('input#password', testUser.password)
    
    // 5. Check the terms checkbox
    const termsCheckbox = page.locator('input#terms')
    await termsCheckbox.check()
    
    // 6. Take screenshot after filling
    await page.screenshot({ path: 'signup-filled.png', fullPage: true })
    
    // 7. Check submit button state
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()
    console.log('Submit button disabled?', isDisabled)
    
    if (isDisabled) {
      // Try to understand why it's disabled
      console.log('❌ BUTTON IS DISABLED - Checking why...')
      
      // Check for any error messages
      const errors = await page.locator('.text-destructive, [role="alert"], .error').allTextContents()
      if (errors.length > 0) {
        console.log('Found errors:', errors)
      }
      
      // Check form field values
      console.log('Form values:')
      console.log('  Name:', await page.inputValue('input#fullName'))
      console.log('  Email:', await page.inputValue('input#email'))
      console.log('  Password length:', (await page.inputValue('input#password')).length)
      console.log('  Terms checked?', await termsCheckbox.isChecked())
      
      // Try clicking anyway
      console.log('Trying to force click...')
      await submitButton.click({ force: true }).catch(e => console.log('Force click failed:', e.message))
    } else {
      console.log('✅ Button is enabled, clicking...')
      await submitButton.click()
    }
    
    // 8. Wait and see what happens
    console.log('⏳ Waiting for response...')
    
    // Monitor network activity
    const authRequests = []
    page.on('request', request => {
      if (request.url().includes('auth') || request.url().includes('supabase')) {
        authRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        })
        console.log('🌐 Auth request:', request.method(), request.url())
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('auth') || response.url().includes('supabase')) {
        console.log('📡 Auth response:', response.status(), response.url())
      }
    })
    
    // Wait for navigation or error
    await page.waitForTimeout(5000)
    
    // 9. Check final state
    const finalUrl = page.url()
    const finalContent = await page.textContent('body')
    
    console.log('\n📊 FINAL RESULTS:')
    console.log('Final URL:', finalUrl)
    console.log('Still on signup page?', finalUrl.includes('/auth/signup'))
    console.log('Auth requests made:', authRequests.length)
    
    // Check for success indicators
    const successIndicators = [
      finalUrl !== 'http://localhost:3000/auth/signup',
      finalContent.includes('verify'),
      finalContent.includes('check your email'),
      finalContent.includes('success'),
      finalContent.includes('dashboard'),
      finalContent.includes('Welcome')
    ]
    
    const success = successIndicators.some(indicator => indicator)
    
    if (success) {
      console.log('✅ SIGNUP APPEARS SUCCESSFUL')
    } else {
      console.log('❌ SIGNUP FAILED')
      
      // Check for error messages
      if (finalContent.includes('error') || finalContent.includes('Error')) {
        console.log('Error found in page:', finalContent.match(/.*error.*/gi)?.[0])
      }
      
      // Take final screenshot
      await page.screenshot({ path: 'signup-failed.png', fullPage: true })
    }
    
    // The actual test assertion
    expect(success).toBe(true)
  })
  
  test('Check if Supabase is configured', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Check if Supabase client is available in browser
    const supabaseCheck = await page.evaluate(() => {
      // Check for Supabase in window or any global
      const hasSupabase = typeof (window as any).supabase !== 'undefined'
      
      // Check for environment variables
      const envCheck = {
        hasSupabaseUrl: !!(window as any).NEXT_PUBLIC_SUPABASE_URL || 
                        document.querySelector('meta[name*="supabase"]'),
        hasSupabaseKey: !!(window as any).NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
      
      return {
        hasSupabase,
        ...envCheck
      }
    })
    
    console.log('Supabase configuration:', supabaseCheck)
    
    // Check network for Supabase calls
    let supabaseCallMade = false
    page.on('request', request => {
      if (request.url().includes('supabase')) {
        supabaseCallMade = true
        console.log('Supabase request detected:', request.url())
      }
    })
    
    // Try to submit form
    await page.fill('input#fullName', 'Test User')
    await page.fill('input#email', 'test@example.com')
    await page.fill('input#password', 'TestPassword123!')
    await page.check('input#terms')
    
    const submitButton = page.locator('button[type="submit"]')
    if (!await submitButton.isDisabled()) {
      await submitButton.click()
      await page.waitForTimeout(3000)
    }
    
    console.log('Supabase call made during signup?', supabaseCallMade)
  })
  
  test('Debug: What happens when we click submit?', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Fill form
    await page.fill('input#fullName', 'Test User')
    await page.fill('input#email', `test${Date.now()}@example.com`)
    await page.fill('input#password', 'TestPassword123!')
    await page.check('input#terms')
    
    // Add console listener
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 Console error:', msg.text())
      }
    })
    
    page.on('pageerror', error => {
      console.log('🚨 Page error:', error.message)
    })
    
    // Check button
    const submitButton = page.locator('button[type="submit"]')
    const buttonText = await submitButton.textContent()
    const isDisabled = await submitButton.isDisabled()
    
    console.log('Button text:', buttonText)
    console.log('Button disabled?', isDisabled)
    
    // Try different ways to submit
    console.log('\n1️⃣ Trying normal click...')
    await submitButton.click().catch(e => console.log('Normal click failed:', e.message))
    
    await page.waitForTimeout(2000)
    
    if (page.url().includes('/auth/signup')) {
      console.log('\n2️⃣ Trying Enter key...')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }
    
    if (page.url().includes('/auth/signup')) {
      console.log('\n3️⃣ Trying form submit via JavaScript...')
      await page.evaluate(() => {
        const form = document.querySelector('form')
        if (form) {
          console.log('Form found, submitting...')
          form.submit()
        } else {
          console.log('No form found!')
        }
      })
      await page.waitForTimeout(2000)
    }
    
    console.log('\nFinal URL:', page.url())
    
    // Check if anything happened
    const finalUrl = page.url()
    const didNavigate = !finalUrl.includes('/auth/signup')
    
    expect(didNavigate).toBe(true)
  })
})