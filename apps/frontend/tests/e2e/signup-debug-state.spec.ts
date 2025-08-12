import { test, expect } from '@playwright/test'

test.describe('Signup State Debug', () => {
  test('debug signup state and redirect', async ({ page }) => {
    // Listen to console messages to see state changes
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('SUCCESS:') || text.includes('redirect') || text.includes('toast') || text.includes('state.success')) {
        console.log('BROWSER:', text)
      }
    })
    
    // Navigate and fill form
    await page.goto('/auth/signup')
    
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    await page.check('input#terms')
    
    console.log('Form filled, clicking submit...')
    
    // Click submit and wait for possible toast/success messages
    await page.click('button[type="submit"]')
    
    // Wait for any toast notifications to appear
    try {
      await page.waitForSelector('[data-sonner-toast]', { timeout: 3000 })
      const toastText = await page.locator('[data-sonner-toast]').textContent()
      console.log('Toast appeared:', toastText)
    } catch {
      console.log('No toast appeared within 3 seconds')
    }
    
    // Wait for redirect (up to 5 seconds)
    let redirectHappened = false
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500)
      const currentUrl = page.url()
      if (currentUrl.includes('/auth/verify-email')) {
        console.log('SUCCESS: Redirected to verify-email page!')
        redirectHappened = true
        break
      }
      if (i === 0) console.log('Waiting for redirect...')
    }
    
    if (!redirectHappened) {
      console.log('ERROR: No redirect happened after 5 seconds')
      console.log('Final URL:', page.url())
      
      // Check if there are any error messages
      const errorElements = await page.locator('.text-red-600, .text-red-800, [role="alert"]').all()
      for (const element of errorElements) {
        const text = await element.textContent()
        if (text && text.trim()) {
          console.log('Error message found:', text)
        }
      }
    }
  })
})