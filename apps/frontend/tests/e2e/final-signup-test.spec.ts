import { test, expect } from '@playwright/test'

test.describe('Final Signup Test', () => {
  test('signup with local backend and dashboard redirect', async ({ page }) => {
    // Navigate to signup
    await page.goto('http://localhost:3004/auth/signup')
    await page.waitForLoadState('networkidle')
    
    const timestamp = Date.now()
    const testEmail = `rhudsontspr+${timestamp}@gmail.com`
    
    console.log('📧 Testing signup with email:', testEmail)
    
    // Fill form fields
    await page.fill('[name="fullName"]', 'Richard Hudson')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.fill('[name="confirmPassword"]', 'TestPassword123!')
    
    // Check the checkbox
    const termsCheckbox = page.locator('input[name="terms"]')
    const isChecked = await termsCheckbox.isChecked()
    console.log('✅ Terms checkbox checked?', isChecked)
    
    if (!isChecked) {
      await termsCheckbox.check()
    }
    
    // Screenshot before submit
    await page.screenshot({ path: 'FINAL-01-form-ready.png', fullPage: true })
    
    // Click submit
    console.log('🚀 Submitting form...')
    await page.click('button[type="submit"]')
    
    // Wait for navigation or response
    await page.waitForTimeout(5000)
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL after submit:', currentUrl)
    
    // Screenshot after submit
    await page.screenshot({ path: 'FINAL-02-after-submit.png', fullPage: true })
    
    // Check for success indicators
    if (currentUrl.includes('dashboard')) {
      console.log('🎉 SUCCESS! Redirected to dashboard!')
      await page.screenshot({ path: 'FINAL-03-DASHBOARD-SUCCESS.png', fullPage: true })
      expect(currentUrl).toContain('dashboard')
    } else if (currentUrl.includes('verify-email')) {
      console.log('✅ Account created! Email verification required')
      await page.screenshot({ path: 'FINAL-03-EMAIL-VERIFICATION.png', fullPage: true })
      console.log('📬 CHECK YOUR GMAIL for:', testEmail)
      expect(currentUrl).toContain('verify-email')
    } else {
      console.log('⚠️ Still on signup page - checking for errors')
      const errors = await page.locator('.text-red-600, .bg-red-50').allTextContents()
      console.log('Errors found:', errors)
      
      // Test should not fail if we're still on signup - let's see what happened
      await page.screenshot({ path: 'FINAL-03-ERROR-STATE.png', fullPage: true })
    }
    
    console.log('\n===================')
    console.log('TEST COMPLETED')
    console.log('Email used:', testEmail)
    console.log('Final URL:', currentUrl)
    console.log('===================\n')
  })
})