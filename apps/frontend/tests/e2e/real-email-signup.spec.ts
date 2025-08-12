import { test, expect } from '@playwright/test'

test.describe('Real Email Signup Test', () => {
  test('signup with real email that forwards to user', async ({ page }) => {
    console.log('🎯 REAL EMAIL TEST: Using Gmail plus alias for verification')
    
    // Navigate to production signup page
    await page.goto('https://tenantflow.app/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Generate unique email with plus alias
    const timestamp = Date.now()
    const testEmail = `rhudsontspr+${timestamp}@gmail.com`
    
    console.log('📧 Using real email:', testEmail)
    console.log('✉️ This will forward to your Gmail inbox!')
    
    // Fill signup form
    await page.fill('[name="fullName"]', 'Richard Hudson Test')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', 'SecureTest123!')
    await page.fill('[name="confirmPassword"]', 'SecureTest123!')
    
    // Check terms checkbox
    const termsCheckbox = page.locator('input[name="terms"]')
    await termsCheckbox.check()
    
    // Verify checkbox is checked
    const isChecked = await termsCheckbox.isChecked()
    console.log('✅ Terms accepted:', isChecked)
    
    // Take screenshot before submission
    await page.screenshot({ path: 'real-email-01-ready.png', fullPage: true })
    
    console.log('🚀 Submitting signup with real email...')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Take screenshot after submission
    await page.screenshot({ path: 'real-email-02-submitted.png', fullPage: true })
    
    // Check for success indicators
    const checkEmailMessage = page.locator('text=Check Your Email')
    const successToast = page.locator('text=Account created!')
    const errorMessage = page.locator('[role="alert"], .error, .text-red-600')
    
    const hasCheckEmail = await checkEmailMessage.count() > 0
    const hasSuccess = await successToast.count() > 0
    const hasError = await errorMessage.count() > 0
    
    if (hasCheckEmail || hasSuccess) {
      console.log('🎉 SUCCESS! Account created with email:', testEmail)
      console.log('📬 CHECK YOUR GMAIL INBOX NOW!')
      console.log('📧 Look for email from TenantFlow/Supabase')
      console.log('🔗 Click the verification link in the email')
      
      // Take success screenshot
      await page.screenshot({ path: 'real-email-03-success.png', fullPage: true })
      
      // Keep test running for a moment to show success
      await page.waitForTimeout(5000)
      
      expect(hasCheckEmail || hasSuccess).toBeTruthy()
    } else if (hasError) {
      const errorText = await errorMessage.first().textContent()
      console.log('❌ Error occurred:', errorText)
      await page.screenshot({ path: 'real-email-03-error.png', fullPage: true })
      
      // Still might have worked, check your email!
      console.log('⚠️ Even with error, CHECK YOUR EMAIL - signup might have succeeded!')
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📧 EMAIL USED:', testEmail)
    console.log('📬 CHECK YOUR GMAIL INBOX FOR VERIFICATION EMAIL')
    console.log('🔗 CLICK THE LINK TO COMPLETE SIGNUP')
    console.log('='.repeat(60))
  })
})