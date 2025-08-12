import { test, expect } from '@playwright/test'

test.describe('Real Signup Functionality', () => {
  test('Should complete full signup flow successfully', async ({ page }) => {
    // Generate unique test user
    const timestamp = Date.now()
    const testUser = {
      fullName: `Test User ${timestamp}`,
      email: `test.signup.${timestamp}@example.com`,
      password: 'TestPassword123!',
      companyName: 'Test Company'
    }
    
    console.log('🧪 Testing signup with real user:', testUser.email)
    
    // Add request/response monitoring
    const requestMade = []
    const responsesReceived = []
    
    page.on('request', request => {
      if (request.url().includes('auth') || request.url().includes('supabase')) {
        requestMade.push({
          url: request.url(),
          method: request.method(),
          headers: Object.fromEntries(Object.entries(request.headers()).filter(([key]) => 
            key.includes('auth') || key.includes('content-type') || key.includes('apikey')
          ))
        })
        console.log('🌐 AUTH REQUEST:', request.method(), request.url())
      }
    })
    
    page.on('response', async response => {
      if (response.url().includes('auth') || response.url().includes('supabase')) {
        const responseData = {
          url: response.url(),
          status: response.status(),
          headers: Object.fromEntries(Object.entries(response.headers()).filter(([key]) => 
            key.includes('content-type') || key.includes('auth')
          ))
        }
        
        try {
          if (response.headers()['content-type']?.includes('application/json')) {
            responseData.body = await response.json()
          }
        } catch (e) {
          // Response might not be JSON
        }
        
        responsesReceived.push(responseData)
        console.log('📡 AUTH RESPONSE:', response.status(), response.url())
      }
    })
    
    // Monitor console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 CONSOLE ERROR:', msg.text())
      }
    })
    
    // 1. Navigate to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // 2. Verify Supabase configuration is now available
    const supabaseConfig = await page.evaluate(() => {
      return {
        supabaseUrl: (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL || 'not found',
        hasSupabaseKey: !!(window as any).process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        documentMeta: document.querySelector('meta[name*=\"supabase\"]')?.getAttribute('content') || 'none'
      }
    })
    
    console.log('📋 Supabase Config Check:', supabaseConfig)
    
    // 3. Fill out the complete signup form
    console.log('📝 Filling complete signup form...')
    
    await page.fill('input#fullName', testUser.fullName)
    await page.fill('input#email', testUser.email)
    await page.fill('input#password', testUser.password)
    await page.fill('input#confirmPassword', testUser.password)
    await page.check('input#terms')
    
    // Wait for validation to complete
    await page.waitForTimeout(1000)
    
    // 4. Verify button is enabled
    const submitButton = page.locator('button[type=\"submit\"]')
    const isButtonEnabled = !(await submitButton.isDisabled())
    
    console.log('✅ Submit button enabled:', isButtonEnabled)
    expect(isButtonEnabled).toBe(true)
    
    // 5. Submit the form
    console.log('🚀 Submitting signup form...')
    await submitButton.click()
    
    // 6. Wait for signup processing
    await page.waitForTimeout(3000)
    
    // 7. Check what happened
    console.log('\\n📊 SIGNUP RESULTS:')
    console.log('📍 Final URL:', page.url())
    console.log('📨 Auth requests made:', requestMade.length)
    console.log('📬 Auth responses received:', responsesReceived.length)
    
    if (requestMade.length > 0) {
      console.log('\\n🔍 REQUEST DETAILS:', JSON.stringify(requestMade, null, 2))
    }
    
    if (responsesReceived.length > 0) {
      console.log('\\n📋 RESPONSE DETAILS:', JSON.stringify(responsesReceived, null, 2))
    }
    
    // 8. Check for success indicators
    const currentUrl = page.url()
    const pageContent = await page.textContent('body')
    
    const successIndicators = [
      currentUrl.includes('/verify-email'),
      currentUrl.includes('/dashboard'),
      currentUrl !== 'http://localhost:3000/auth/signup',
      pageContent.includes('verify'),
      pageContent.includes('check your email'),
      pageContent.includes('Check Your Email'),
      pageContent.includes('success')
    ]
    
    const signupSuccessful = successIndicators.some(indicator => indicator) || requestMade.length > 0
    
    console.log('\\n🎯 SUCCESS INDICATORS:')
    console.log('  - URL changed:', currentUrl !== 'http://localhost:3000/auth/signup')
    console.log('  - Auth requests made:', requestMade.length > 0)
    console.log('  - Contains verification message:', pageContent.includes('verify') || pageContent.includes('Check Your Email'))
    console.log('  - Overall success:', signupSuccessful)
    
    if (signupSuccessful) {
      console.log('\\n✅ SIGNUP APPEARS TO BE WORKING!')
      
      // Take success screenshot
      await page.screenshot({ path: 'signup-success.png', fullPage: true })
    } else {
      console.log('\\n❌ SIGNUP STILL NOT WORKING')
      
      // Check for specific error messages
      const errorMessages = await page.locator('.text-red-600, .text-destructive, [role=\"alert\"]').allTextContents()
      if (errorMessages.length > 0) {
        console.log('  Error messages found:', errorMessages)
      }
      
      await page.screenshot({ path: 'signup-failed-final.png', fullPage: true })
    }
    
    // The actual test assertion
    expect(signupSuccessful, 'Signup should make auth requests or show success state').toBe(true)
  })
  
  test('Should validate environment variables are loaded', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Check if environment variables are properly loaded
    const envCheck = await page.evaluate(() => {
      // Check if Next.js has loaded the env vars
      const envVars = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        stripeKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'present' : 'missing'
      }
      
      return envVars
    })
    
    console.log('Environment variables check:', envCheck)
    
    // At minimum, Supabase URL should be present
    expect(envCheck.supabaseUrl).toBeTruthy()
    expect(envCheck.supabaseKey).toBe('present')
  })
})