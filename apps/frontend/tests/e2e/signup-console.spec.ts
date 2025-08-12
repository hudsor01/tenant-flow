import { test, expect } from '@playwright/test'

test('debug signup form console output', async ({ page }) => {
  // Capture all console messages
  const logs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    logs.push(`[${msg.type()}] ${text}`)
    if (text.includes('signupAction') || text.includes('error') || text.includes('Error')) {
      console.log(`[Browser ${msg.type()}]:`, text)
    }
  })

  // Navigate to signup
  await page.goto('/auth/signup')
  
  // Fill form
  const timestamp = Date.now()
  await page.fill('input[name="fullName"]', 'Test User')
  await page.fill('input[name="email"]', `test${timestamp}@example.com`)
  await page.fill('input[name="password"]', 'TestPassword123!')
  await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
  await page.check('input#terms')
  
  // Try to submit
  await page.click('button[type="submit"]')
  
  // Wait for something to happen
  await page.waitForTimeout(3000)
  
  // Check for any errors
  const errorElement = await page.locator('.text-red-600, .text-red-800, [role="alert"]').first()
  if (await errorElement.isVisible()) {
    const errorText = await errorElement.textContent()
    console.log('ERROR FOUND ON PAGE:', errorText)
  }
  
  // Check URL
  console.log('Final URL:', page.url())
  
  // Print all logs that contain important keywords
  console.log('\n=== IMPORTANT LOGS ===')
  logs.filter(log => 
    log.includes('error') || 
    log.includes('Error') || 
    log.includes('failed') ||
    log.includes('signupAction') ||
    log.includes('FormData')
  ).forEach(log => console.log(log))
})