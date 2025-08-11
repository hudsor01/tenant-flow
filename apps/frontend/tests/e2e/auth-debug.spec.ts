import { test, expect } from '@playwright/test'

test('Debug signup form structure', async ({ page }) => {
  await page.goto('/auth/signup')
  
  // Take screenshot to see what's actually there
  await page.screenshot({ path: 'test-results/signup-page-debug.png' })
  
  // Log all input elements
  const inputs = await page.locator('input').all()
  console.log('Found inputs:', inputs.length)
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const placeholder = await input.getAttribute('placeholder')
    const type = await input.getAttribute('type')
    const id = await input.getAttribute('id')
    console.log(`Input ${i}: placeholder="${placeholder}", type="${type}", id="${id}"`)
  }
  
  // Check if the page loaded correctly
  const pageTitle = await page.title()
  console.log('Page title:', pageTitle)
  
  // Check for any error messages
  const hasErrors = await page.locator('[data-testid="error"], .error, [role="alert"]').isVisible()
  console.log('Has errors:', hasErrors)
  
  // Check the URL to make sure we're on the right page
  console.log('Current URL:', page.url())
})