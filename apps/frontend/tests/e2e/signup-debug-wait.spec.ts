import { test, expect } from '@playwright/test'

test.describe('Signup Debug with Wait', () => {
  test('debug signup form with longer wait', async ({ page }) => {
    // Listen to console messages
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()))
    
    // Navigate to signup page
    await page.goto('/auth/signup')
    console.log('1. Navigated to signup page')
    
    // Fill form step by step
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    
    // Check the checkbox
    await page.check('input#terms')
    console.log('2. Form filled and checkbox checked')
    
    // Click submit and wait for network activity
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth/signup') && response.request().method() === 'POST'
    )
    
    await page.click('button[type="submit"]')
    console.log('3. Clicked submit button')
    
    try {
      const response = await responsePromise
      console.log('4. Got response:', response.status(), response.statusText())
      
      // Check if redirect happened
      await page.waitForTimeout(3000)
      const finalUrl = page.url()
      console.log('5. Final URL:', finalUrl)
      
      // Check for any error messages
      const errorElements = await page.locator('.text-red-600, .text-red-800, [role="alert"]').all()
      if (errorElements.length > 0) {
        for (const element of errorElements) {
          const text = await element.textContent()
          if (text && text.trim()) {
            console.log('6. Error found:', text)
          }
        }
      } else {
        console.log('6. No error messages found')
      }
      
      // Check for success indicators
      const successElements = await page.locator('[data-sonner-toast], .text-green-600, .bg-green-50').all()
      if (successElements.length > 0) {
        for (const element of successElements) {
          const text = await element.textContent()
          if (text && text.trim()) {
            console.log('7. Success indicator:', text)
          }
        }
      }
      
    } catch (error) {
      console.log('4. No response received or timeout:', error.message)
      
      // Take screenshot if something went wrong
      await page.screenshot({ path: 'debug-error.png', fullPage: true })
    }
  })
})