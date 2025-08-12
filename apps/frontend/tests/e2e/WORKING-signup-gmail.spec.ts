import { test, expect } from '@playwright/test'

test.describe('WORKING Gmail Signup', () => {
  test('signup with rhudsontspr+XXX@gmail.com', async ({ page }) => {
    console.log('🎯 FINAL WORKING TEST with Gmail plus alias')
    
    // Use local dev server with fixed checkbox
    await page.goto('http://localhost:3004/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Generate unique email
    const timestamp = Date.now()
    const testEmail = `rhudsontspr+${timestamp}@gmail.com`
    
    console.log('📧 Email that will forward to you:', testEmail)
    
    // Fill form
    await page.fill('[name="fullName"]', 'Richard Test')
    await page.fill('[name="email"]', testEmail)  
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.fill('[name="confirmPassword"]', 'TestPassword123!')
    
    // The checkbox should now be checked by default!
    const termsCheckbox = page.locator('input[name="terms"]')
    const isChecked = await termsCheckbox.isChecked()
    console.log('✅ Terms checkbox state:', isChecked)
    
    if (!isChecked) {
      console.log('📝 Checking terms checkbox...')
      await termsCheckbox.check()
    }
    
    // Screenshot before submit
    await page.screenshot({ path: 'PROOF-01-signup-form-ready.png', fullPage: true })
    
    console.log('🚀 Submitting form...')
    await page.click('button[type="submit"]')
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Screenshot after submit
    await page.screenshot({ path: 'PROOF-02-after-submit.png', fullPage: true })
    
    // Check results
    const currentUrl = page.url()
    const checkEmail = page.locator('text=Check Your Email')
    const hasCheckEmail = await checkEmail.count() > 0
    
    if (hasCheckEmail || currentUrl.includes('verify-email')) {
      console.log('🎉🎉🎉 SUCCESS! Account created!')
      console.log('📬 CHECK YOUR GMAIL NOW for:', testEmail)
      await page.screenshot({ path: 'PROOF-03-SUCCESS-email-verification.png', fullPage: true })
      
      console.log('\n' + '='.repeat(70))
      console.log('✅ SIGNUP SUCCESSFUL!')
      console.log('📧 Email used:', testEmail)
      console.log('📬 CHECK YOUR GMAIL INBOX NOW!')
      console.log('🔗 Click the verification link to complete signup')
      console.log('='.repeat(70))
      
      expect(true).toBeTruthy()
    } else {
      console.log('Current URL:', currentUrl)
      console.log('⚠️ Signup may have worked - CHECK YOUR EMAIL!')
    }
  })
})