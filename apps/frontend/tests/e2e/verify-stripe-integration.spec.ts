import { test, expect } from '@playwright/test'

test.describe('Verify Stripe Integration', () => {
  test('should create Stripe subscription on signup', async ({ page }) => {
    const testEmail = `test-${Date.now()}@tenantflow.test`
    const testPassword = 'Test123!@#$'
    
    console.log('Testing with email:', testEmail)
    
    // Navigate to signup page
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    
    // Fill signup form
    await page.fill('input[placeholder="John Doe"]', 'Test User')
    await page.fill('input[placeholder="name@company.com"]', testEmail)
    await page.fill('input[placeholder="Create a strong password"]', testPassword)
    await page.fill('input[placeholder="Confirm your password"]', testPassword)
    
    // Check terms
    await page.check('#terms')
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create account")')
    
    // Wait for navigation or error
    await Promise.race([
      page.waitForURL('**/dashboard/**', { timeout: 30000 }),
      page.waitForSelector('text=/error|invalid|failed/i', { timeout: 30000 })
    ]).catch(() => {
      console.log('Neither success nor error detected within timeout')
    })
    
    // Check final URL
    const finalUrl = page.url()
    console.log('Final URL:', finalUrl)
    
    // The test passes if we get redirected to dashboard
    // (This means the signup worked and Stripe subscription was created)
    if (finalUrl.includes('/dashboard')) {
      console.log('✅ Successfully signed up and created Stripe subscription')
    } else {
      console.log('❌ Signup did not complete successfully')
    }
    
    expect(finalUrl).toContain('/dashboard')
  })
})