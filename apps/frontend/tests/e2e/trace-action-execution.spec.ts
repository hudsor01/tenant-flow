import { test, expect } from '@playwright/test'

test.describe('Trace Action Execution', () => {
  test('trace what happens when signup form is submitted', async ({ page }) => {
    console.log('🔍 Tracing signup action execution...')
    
    // Listen to all console messages
    page.on('console', msg => {
      console.log(`🖥️  ${msg.type().toUpperCase()}: ${msg.text()}`)
    })
    
    // Listen to all network requests
    page.on('request', request => {
      console.log(`📡 REQUEST: ${request.method()} ${request.url()}`)
    })
    
    page.on('response', response => {
      console.log(`📨 RESPONSE: ${response.status()} ${response.url()}`)
    })
    
    // Go to signup page
    await page.goto('http://localhost:3003/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Fill form
    await page.fill('input[name="fullName"]', 'Trace Test')
    await page.fill('input[name="email"]', `trace-${Date.now()}@test.com`)
    await page.fill('input[name="password"]', 'TracePass123!')
    await page.fill('input[name="confirmPassword"]', 'TracePass123!')
    await page.check('input[name="terms"]')
    
    console.log('🔥 About to click submit...')
    
    // Click submit and wait for response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth/signup') && response.request().method() === 'POST'
    )
    
    await page.click('button[type="submit"]')
    
    const response = await responsePromise
    console.log(`📋 Response Status: ${response.status()}`)
    console.log(`📋 Response Headers:`, await response.allHeaders())
    
    const responseText = await response.text()
    console.log(`📋 Response length: ${responseText.length} characters`)
    console.log(`📋 Response preview: ${responseText.substring(0, 200)}...`)
    
    // Wait a bit more to see if there are delayed console messages
    await page.waitForTimeout(2000)
    
    console.log('🏁 Trace complete')
  })
})