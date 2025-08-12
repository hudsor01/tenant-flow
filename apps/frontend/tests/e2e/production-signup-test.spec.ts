import { test, expect } from '@playwright/test'

test.describe('Production Signup Test', () => {
  test('should navigate to production signup and check form', async ({ page }) => {
    console.log('🌐 Testing production signup at https://tenantflow.app/auth/signup')
    
    // Navigate to production signup page
    await page.goto('https://tenantflow.app/auth/signup')
    
    // Wait for page to load
    await page.waitForTimeout(3000)
    
    console.log('📍 Current URL:', page.url())
    
    // Check what checkbox elements exist
    const checkboxes = await page.locator('input[type="checkbox"]').all()
    console.log('📋 Found checkboxes:', checkboxes.length)
    
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i]
      const id = await checkbox.getAttribute('id')
      const name = await checkbox.getAttribute('name')
      console.log(`  Checkbox ${i + 1}: id="${id}", name="${name}"`)
    }
    
    // Check for form elements
    const forms = await page.locator('form').all()
    console.log('📝 Found forms:', forms.length)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'production-signup-debug.png', fullPage: true })
    console.log('📸 Screenshot saved as production-signup-debug.png')
    
    // Simple assertion that we're on the right page
    expect(page.url()).toContain('/auth/signup')
  })
})