import { test, expect } from '@playwright/test'

test.describe('Signup Debug Simple', () => {
  test('debug signup form step by step', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')
    console.log('1. Navigated to signup page')
    
    // Fill form step by step
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    
    await page.fill('input[name="fullName"]', 'Test User')
    console.log('2. Filled fullName')
    
    await page.fill('input[name="email"]', email)
    console.log('3. Filled email')
    
    await page.fill('input[name="password"]', 'TestPassword123!')
    console.log('4. Filled password')
    
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    console.log('5. Filled confirmPassword')
    
    // Check if checkbox exists and is visible
    const checkbox = page.locator('input#terms')
    await expect(checkbox).toBeVisible()
    console.log('6. Checkbox is visible')
    
    // Check the checkbox
    await checkbox.check()
    console.log('7. Checked the checkbox')
    
    // Verify checkbox is checked
    await expect(checkbox).toBeChecked()
    console.log('8. Checkbox is confirmed checked')
    
    // Check submit button state
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()
    console.log('9. Submit button disabled:', isDisabled)
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-before-submit.png', fullPage: true })
    console.log('10. Took screenshot')
    
    // Click submit
    await submitButton.click()
    console.log('11. Clicked submit button')
    
    // Wait a moment and check what happens
    await page.waitForTimeout(2000)
    
    // Take another screenshot
    await page.screenshot({ path: 'debug-after-submit.png', fullPage: true })
    console.log('12. Took second screenshot')
    
    // Check current URL
    const currentUrl = page.url()
    console.log('13. Current URL:', currentUrl)
  })
})