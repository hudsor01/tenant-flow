import { test, expect } from '@playwright/test'

test.describe('Debug Action Submission', () => {
  test('debug if server action is being called', async ({ page }) => {
    console.log('🔍 Testing server action submission...')
    
    // Navigate to signup page
    await page.goto('http://localhost:3003/auth/signup')
    
    // Fill form quickly
    await page.fill('input[name="fullName"]', 'Debug User')
    await page.fill('input[name="email"]', `debug-${Date.now()}@test.com`)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.fill('input[name="confirmPassword"]', 'TestPass123!')
    await page.check('input[name="terms"]')
    
    // Log network requests
    const requests = []
    page.on('request', request => {
      if (request.url().includes('signup') || request.method() === 'POST') {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        })
        console.log('📡 Request:', request.method(), request.url())
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('signup') || response.status() !== 200) {
        console.log('📨 Response:', response.status(), response.url())
      }
    })
    
    // Submit and wait
    console.log('🔥 Clicking submit...')
    await page.click('button[type="submit"]')
    
    // Wait and check
    await page.waitForTimeout(5000)
    
    console.log('📊 Total requests captured:', requests.length)
    requests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`)
    })
    
    // Check if action was called
    const actionCalled = requests.some(req => 
      req.url().includes('signup') && req.method === 'POST'
    )
    
    console.log('⚡ Server action called:', actionCalled)
    
    if (!actionCalled) {
      console.log('❌ Server action was NOT called - investigating form issues')
      
      // Check if form is valid
      const isValid = await page.evaluate(() => {
        const form = document.querySelector('form')
        return form ? form.checkValidity() : false
      })
      
      console.log('📋 Form validity:', isValid)
      
      // Check if button is disabled
      const isDisabled = await page.locator('button[type="submit"]').isDisabled()
      console.log('🔘 Submit button disabled:', isDisabled)
      
      // Check for any JavaScript errors
      const jsErrors = []
      page.on('pageerror', error => {
        jsErrors.push(error.message)
      })
      
      console.log('🚨 JavaScript errors:', jsErrors)
    }
  })
})