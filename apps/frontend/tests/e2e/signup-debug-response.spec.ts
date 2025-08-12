import { test, expect } from '@playwright/test'

test.describe('Signup Debug Response', () => {
  test('debug signup response body', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')
    
    // Fill form
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    await page.check('input#terms')
    
    // Listen for the POST request and capture response
    const responsePromise = page.waitForResponse(async response => {
      if (response.url().includes('/auth/signup') && response.request().method() === 'POST') {
        const responseText = await response.text()
        console.log('Response Status:', response.status())
        console.log('Response Headers:', JSON.stringify(Object.fromEntries(response.headers()), null, 2))
        console.log('Response Body (first 1000 chars):', responseText.substring(0, 1000))
        return true
      }
      return false
    })
    
    await page.click('button[type="submit"]')
    
    await responsePromise
    
    // Wait to see if any redirect happens
    await page.waitForTimeout(5000)
    
    console.log('Final URL after 5s:', page.url())
  })
})