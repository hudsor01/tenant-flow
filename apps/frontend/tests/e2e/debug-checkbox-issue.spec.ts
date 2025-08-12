import { test, expect } from '@playwright/test'

test.describe('Debug Checkbox Issue', () => {
  test('debug form submission with console logs', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ BROWSER ERROR:', msg.text())
      } else {
        console.log('📝 BROWSER LOG:', msg.text())
      }
    })
    
    page.on('pageerror', err => {
      console.log('🔥 PAGE ERROR:', err.message)
    })
    
    // Navigate to signup
    await page.goto('http://localhost:3004/auth/signup')
    await page.waitForLoadState('networkidle')
    
    const timestamp = Date.now()
    const testEmail = `rhudsontspr+${timestamp}@gmail.com`
    
    console.log('📧 Testing with email:', testEmail)
    
    // Fill form fields
    await page.fill('[name="fullName"]', 'Richard Test')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.fill('[name="confirmPassword"]', 'TestPassword123!')
    
    // Check the checkbox status
    const termsCheckbox = page.locator('input[name="terms"]')
    const isCheckedBefore = await termsCheckbox.isChecked()
    console.log('✅ Checkbox before interaction:', isCheckedBefore)
    
    // If not checked, check it
    if (!isCheckedBefore) {
      await termsCheckbox.check()
      console.log('📝 Checked the checkbox')
    }
    
    // Verify it's checked
    const isCheckedAfter = await termsCheckbox.isChecked()
    console.log('✅ Checkbox after interaction:', isCheckedAfter)
    
    // Get form data before submission
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form')
      if (!form) return null
      const fd = new FormData(form)
      const data: Record<string, any> = {}
      fd.forEach((value, key) => {
        data[key] = value
      })
      return data
    })
    console.log('📋 Form data before submit:', formData)
    
    // Check if button is disabled
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()
    console.log('🔘 Submit button disabled?', isDisabled)
    
    // Click submit
    console.log('🚀 Clicking submit button...')
    await submitButton.click()
    
    // Wait for navigation or error
    await page.waitForTimeout(3000)
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL after submit:', currentUrl)
    
    // Check for any error messages
    const errorMessages = await page.locator('[role="alert"], .text-red-600, .bg-red-50').allTextContents()
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:', errorMessages)
    }
    
    // Get form data after submission attempt
    const formDataAfter = await page.evaluate(() => {
      const form = document.querySelector('form')
      if (!form) return null
      const fd = new FormData(form)
      const data: Record<string, any> = {}
      fd.forEach((value, key) => {
        data[key] = value
      })
      return data
    })
    console.log('📋 Form data after submit attempt:', formDataAfter)
    
    // Screenshot
    await page.screenshot({ path: 'DEBUG-checkbox-issue.png', fullPage: true })
    
    // Check if we're on verification page
    if (currentUrl.includes('verify-email') || currentUrl.includes('dashboard')) {
      console.log('✅ SUCCESS! Form submitted successfully')
    } else {
      console.log('⚠️ Form did not submit - still on signup page')
    }
  })
})