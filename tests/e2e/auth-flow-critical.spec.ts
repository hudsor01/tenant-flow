import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_BASE_URL = 'http://localhost:3000'
const TEST_API_URL = 'http://localhost:3002/api/v1'

// Test user data
const TEST_USER = {
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User'
}

test.describe('Critical Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set test context
    await page.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
  })

  test('Complete signup → email confirmation → dashboard access flow', async ({ page }) => {
    console.log('Starting authentication flow test...')
    
    // Step 1: Navigate to homepage
    console.log('Step 1: Navigate to homepage')
    await page.goto(TEST_BASE_URL)
    await expect(page).toHaveTitle(/TenantFlow/)
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'test-results/auth-flow-01-homepage.png', fullPage: true })
    
    // Step 2: Navigate to signup page
    console.log('Step 2: Navigate to signup page')
    
    // Look for signup button/link with various selectors
    const signupSelectors = [
      '[data-testid="signup-button"]',
      'a[href="/auth/signup"]',
      'text="Sign up"',
      'text="Get Started"',
      'text="Create Account"'
    ]
    
    let signupFound = false
    for (const selector of signupSelectors) {
      try {
        if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
          console.log(`Found signup element with selector: ${selector}`)
          await page.locator(selector).first().click()
          signupFound = true
          break
        }
      } catch (error) {
        console.log(`Selector ${selector} not found or not visible`)
      }
    }
    
    if (!signupFound) {
      // Try navigating directly
      console.log('No signup button found, navigating directly to /auth/signup')
      await page.goto(`${TEST_BASE_URL}/auth/signup`)
    }
    
    // Verify we're on signup page
    await expect(page).toHaveURL(/\/auth\/signup/)
    await page.screenshot({ path: 'test-results/auth-flow-02-signup-page.png', fullPage: true })
    
    // Step 3: Fill out signup form
    console.log('Step 3: Fill out signup form')
    
    // Wait for form to be visible
    await page.waitForSelector('form, [data-testid="signup-form"]', { timeout: 10000 })
    
    // Find and fill email field
    const emailSelectors = [
      '[data-testid="signup-email"]',
      'input[type="email"]',
      'input[name="email"]',
      '#email'
    ]
    
    for (const selector of emailSelectors) {
      try {
        const emailInput = page.locator(selector).first()
        if (await emailInput.isVisible({ timeout: 2000 })) {
          console.log(`Filling email with selector: ${selector}`)
          await emailInput.fill(TEST_USER.email)
          break
        }
      } catch (error) {
        console.log(`Email selector ${selector} not found`)
      }
    }
    
    // Find and fill password field
    const passwordSelectors = [
      '[data-testid="signup-password"]',
      'input[type="password"]',
      'input[name="password"]',
      '#password'
    ]
    
    for (const selector of passwordSelectors) {
      try {
        const passwordInput = page.locator(selector).first()
        if (await passwordInput.isVisible({ timeout: 2000 })) {
          console.log(`Filling password with selector: ${selector}`)
          await passwordInput.fill(TEST_USER.password)
          break
        }
      } catch (error) {
        console.log(`Password selector ${selector} not found`)
      }
    }
    
    // Find and fill name field
    const nameSelectors = [
      '[data-testid="signup-name"]',
      'input[name="name"]',
      'input[name="fullName"]',
      '#name',
      '#fullName'
    ]
    
    for (const selector of nameSelectors) {
      try {
        const nameInput = page.locator(selector).first()
        if (await nameInput.isVisible({ timeout: 2000 })) {
          console.log(`Filling name with selector: ${selector}`)
          await nameInput.fill(TEST_USER.name)
          break
        }
      } catch (error) {
        console.log(`Name selector ${selector} not found`)
      }
    }
    
    // Accept terms if checkbox exists
    const termsSelectors = [
      '[data-testid="accept-terms"]',
      'input[type="checkbox"]',
      'input[name="acceptTerms"]'
    ]
    
    for (const selector of termsSelectors) {
      try {
        const termsCheckbox = page.locator(selector).first()
        if (await termsCheckbox.isVisible({ timeout: 2000 })) {
          console.log(`Checking terms with selector: ${selector}`)
          await termsCheckbox.check()
          break
        }
      } catch (error) {
        console.log(`Terms selector ${selector} not found`)
      }
    }
    
    // Take screenshot of filled form
    await page.screenshot({ path: 'test-results/auth-flow-03-filled-form.png', fullPage: true })
    
    // Step 4: Submit signup form
    console.log('Step 4: Submit signup form')
    
    const submitSelectors = [
      '[data-testid="signup-submit"]',
      'button[type="submit"]',
      'text="Sign up"',
      'text="Create Account"',
      'text="Get Started"'
    ]
    
    let submitFound = false
    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector).first()
        if (await submitButton.isVisible({ timeout: 2000 })) {
          console.log(`Submitting with selector: ${selector}`)
          await submitButton.click()
          submitFound = true
          break
        }
      } catch (error) {
        console.log(`Submit selector ${selector} not found`)
      }
    }
    
    if (!submitFound) {
      // Try pressing Enter on the form
      console.log('No submit button found, trying Enter key')
      await page.keyboard.press('Enter')
    }
    
    // Step 5: Check for success message or error
    console.log('Step 5: Check for signup response')
    
    // Wait for either success message, error message, or redirect
    await page.waitForTimeout(3000) // Give time for submission
    
    // Take screenshot of response
    await page.screenshot({ path: 'test-results/auth-flow-04-after-submit.png', fullPage: true })
    
    // Check for various success/error indicators
    const successSelectors = [
      'text*="email"',
      'text*="confirm"',
      'text*="check your email"',
      'text*="verification"',
      '[data-testid="signup-success"]'
    ]
    
    const errorSelectors = [
      'text*="error"',
      'text*="failed"',
      '[role="alert"]',
      '.error',
      '[data-testid="signup-error"]'
    ]
    
    let hasSuccess = false
    let hasError = false
    
    // Check for success indicators
    for (const selector of successSelectors) {
      try {
        if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
          console.log(`Success indicator found: ${selector}`)
          hasSuccess = true
          break
        }
      } catch (error) {
        // Continue checking
      }
    }
    
    // Check for error indicators
    for (const selector of errorSelectors) {
      try {
        if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
          console.log(`Error indicator found: ${selector}`)
          hasError = true
          const errorText = await page.locator(selector).first().textContent()
          console.log(`Error text: ${errorText}`)
          break
        }
      } catch (error) {
        // Continue checking
      }
    }
    
    // Step 6: Check current URL and page state
    console.log('Step 6: Check current URL and page state')
    const currentUrl = page.url()
    console.log(`Current URL after signup: ${currentUrl}`)
    
    // Step 7: Test dashboard access
    console.log('Step 7: Test dashboard access')
    
    // If we're not already redirected to dashboard, try to navigate there
    if (!currentUrl.includes('/dashboard')) {
      console.log('Not on dashboard, trying to navigate...')
      await page.goto(`${TEST_BASE_URL}/dashboard`)
    }
    
    await page.waitForTimeout(2000)
    const dashboardUrl = page.url()
    console.log(`Dashboard URL: ${dashboardUrl}`)
    
    // Take screenshot of dashboard attempt
    await page.screenshot({ path: 'test-results/auth-flow-05-dashboard-attempt.png', fullPage: true })
    
    // Step 8: Check if redirected to login (authentication failed)
    if (dashboardUrl.includes('/auth/login') || dashboardUrl.includes('/login')) {
      console.log('❌ ISSUE FOUND: Redirected to login page - user not authenticated')
      
      // Try to login with the same credentials
      console.log('Step 8a: Attempting login with same credentials')
      
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      const loginUrl = page.url()
      console.log(`After login attempt: ${loginUrl}`)
      
      await page.screenshot({ path: 'test-results/auth-flow-06-after-login.png', fullPage: true })
    }
    
    // Step 9: Final verification
    console.log('Step 9: Final verification')
    const finalUrl = page.url()
    console.log(`Final URL: ${finalUrl}`)
    
    // Log test results
    console.log('\n=== TEST RESULTS ===')
    console.log(`Test User Email: ${TEST_USER.email}`)
    console.log(`Success Message Found: ${hasSuccess}`)
    console.log(`Error Message Found: ${hasError}`)
    console.log(`Final URL: ${finalUrl}`)
    console.log(`Dashboard Access: ${finalUrl.includes('/dashboard') ? '✅ SUCCESS' : '❌ FAILED'}`)
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/auth-flow-07-final-state.png', fullPage: true })
    
    // Check API connectivity as well
    console.log('\n=== API CONNECTIVITY CHECK ===')
    try {
      const response = await page.request.get(`${TEST_API_URL}/health`)
      console.log(`Backend API Status: ${response.status()}`)
      const healthData = await response.json()
      console.log(`Health Check Response:`, healthData)
    } catch (error) {
      console.log(`Backend API Error:`, error)
    }
    
    // The test will fail if we can't access dashboard
    // This is intentional to identify the exact failure point
    if (!finalUrl.includes('/dashboard')) {
      throw new Error(`Authentication flow failed - unable to access dashboard. Final URL: ${finalUrl}`)
    }
  })

  test('Direct login test with existing user', async ({ page }) => {
    console.log('Testing direct login...')
    
    await page.goto(`${TEST_BASE_URL}/auth/login`)
    await page.screenshot({ path: 'test-results/direct-login-01-page.png', fullPage: true })
    
    // Test with a potentially existing user or create mock data
    const testEmail = 'test@example.com'
    const testPassword = 'password123'
    
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/direct-login-02-after-submit.png', fullPage: true })
    
    console.log(`Login URL after submit: ${page.url()}`)
  })

  test('Protected route access without authentication', async ({ page }) => {
    console.log('Testing protected route access...')
    
    // Clear any existing auth
    await page.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    
    // Try to access dashboard directly
    await page.goto(`${TEST_BASE_URL}/dashboard`)
    await page.waitForTimeout(2000)
    
    await page.screenshot({ path: 'test-results/protected-route-test.png', fullPage: true })
    
    const currentUrl = page.url()
    console.log(`Protected route access result: ${currentUrl}`)
    
    // Should be redirected to login
    const isRedirectedToAuth = currentUrl.includes('/auth/login') || currentUrl.includes('/login')
    console.log(`Properly redirected to auth: ${isRedirectedToAuth ? '✅' : '❌'}`)
  })
})