import { test, expect } from '@playwright/test'

test('Debug: Check signup page structure', async ({ page }) => {
  // Navigate to signup page
  await page.goto('/auth/signup')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'signup-page-debug.png', fullPage: true })
  
  // Log the page title
  const title = await page.title()
  console.log('Page title:', title)
  
  // Check if we're on the right page
  const url = page.url()
  console.log('Current URL:', url)
  expect(url).toContain('/auth/signup')
  
  // Check for any forms on the page
  const formCount = await page.locator('form').count()
  console.log('Number of forms found:', formCount)
  
  // Check for any inputs on the page
  const inputCount = await page.locator('input').count()
  console.log('Number of inputs found:', inputCount)
  
  // Try different selectors for the name field
  const selectors = [
    'input#name',
    'input[id="name"]',
    'input[name="name"]',
    'input[name="fullName"]',
    '#name',
    '[id="name"]',
    'input[placeholder*="name" i]',
  ]
  
  for (const selector of selectors) {
    const count = await page.locator(selector).count()
    if (count > 0) {
      console.log(`✅ Found element with selector: ${selector}`)
      const isVisible = await page.locator(selector).first().isVisible()
      console.log(`   Visible: ${isVisible}`)
    }
  }
  
  // Check what's actually on the page
  const bodyText = await page.locator('body').innerText()
  console.log('Page contains text:', bodyText.substring(0, 500))
  
  // Check for error messages
  const errors = await page.locator('[role="alert"], .error, .text-destructive').allTextContents()
  if (errors.length > 0) {
    console.log('Errors found:', errors)
  }
  
  // Check if there's a loading state
  const loadingElements = await page.locator('[data-testid*="loading"], .loading, .spinner').count()
  console.log('Loading elements:', loadingElements)
  
  // Wait a bit and check again
  await page.waitForTimeout(3000)
  
  const inputCountAfterWait = await page.locator('input').count()
  console.log('Number of inputs after waiting:', inputCountAfterWait)
  
  // List all input IDs
  const inputs = await page.locator('input').all()
  for (let i = 0; i < inputs.length; i++) {
    const id = await inputs[i].getAttribute('id')
    const name = await inputs[i].getAttribute('name')
    const type = await inputs[i].getAttribute('type')
    const placeholder = await inputs[i].getAttribute('placeholder')
    console.log(`Input ${i}: id="${id}", name="${name}", type="${type}", placeholder="${placeholder}"`)
  }
})