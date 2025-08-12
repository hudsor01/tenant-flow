import { test, expect } from '@playwright/test'

test.describe('Simple Signup Debug', () => {
  test('debug signup form behavior', async ({ page }) => {
    console.log('🔧 Debug: Testing signup form behavior')
    
    await page.goto('http://localhost:3004/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Wait for form to be interactive
    await page.waitForSelector('[name="fullName"]', { state: 'visible' })
    
    console.log('📝 Filling form fields...')
    await page.fill('[name="fullName"]', 'Test User')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.fill('[name="confirmPassword"]', 'TestPassword123!')
    await page.check('[name="terms"]')
    
    // Wait a moment for validation
    await page.waitForTimeout(1000)
    
    // Check if submit button is enabled
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()
    console.log('🔘 Submit button disabled:', isDisabled)
    
    if (isDisabled) {
      console.log('❌ Submit button is disabled, cannot proceed')
      await page.screenshot({ path: 'debug-button-disabled.png', fullPage: true })
      return
    }
    
    console.log('🚀 Submitting form...')
    
    // Listen for console logs from the page
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('📄 Page console:', msg.text())
      }
    })
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('signup') || request.url().includes('auth')) {
        console.log('🌐 Network request:', request.method(), request.url())
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('signup') || response.url().includes('auth')) {
        console.log('📡 Network response:', response.status(), response.url())
      }
    })
    
    await page.click('button[type="submit"]')
    
    // Wait for some response
    await page.waitForTimeout(3000)
    
    // Check current URL
    console.log('🔗 Current URL after submit:', page.url())
    
    // Check for any success/error messages
    const successMessage = page.locator('text=Account created!')
    const errorMessage = page.locator('[role="alert"], .error, .text-red-600')
    
    const hasSuccess = await successMessage.count() > 0
    const hasError = await errorMessage.count() > 0
    
    console.log('✅ Success message visible:', hasSuccess)
    console.log('❌ Error message visible:', hasError)
    
    if (hasError) {
      const errorText = await errorMessage.first().textContent()
      console.log('❌ Error text:', errorText)
    }
    
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true })
  })
})