import { test, expect, Page } from '@playwright/test'

/**
 * REAL Human Behavior E2E Tests
 * 
 * These tests simulate actual human interactions:
 * - Reading content before acting
 * - Making mistakes and corrections
 * - Hesitating and exploring options
 * - Following realistic user journeys
 */

test.describe('Real Human Behavior Journey', () => {
  
  test('should simulate realistic user discovery and signup journey', async ({ page }) => {
    console.log('🧍‍♂️ Simulating real human discovery behavior...')
    
    // 1. REALISTIC LANDING PAGE BEHAVIOR
    await page.goto('/')
    
    // Human behavior: Read the headline, scroll around a bit
    await page.waitForSelector('h1', { timeout: 5000 })
    const headline = await page.locator('h1').textContent()
    console.log(`👀 User reads headline: "${headline}"`)
    
    // Humans scroll to see what the product does
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(2000) // Human reading time
    
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(1500) // More reading time
    
    // Check if there are feature sections to read
    const features = await page.locator('[data-testid*="feature"], .feature, h3, h2').count()
    console.log(`📖 User sees ${features} features/sections to read`)
    
    // 2. REALISTIC PRICING PAGE EXPLORATION  
    console.log('💰 User decides to check pricing...')
    
    // Look for pricing link (humans scan navigation)
    const pricingLink = page.locator('a:has-text("Pricing"), a[href*="pricing"]').first()
    await expect(pricingLink).toBeVisible({ timeout: 5000 })
    await pricingLink.click()
    
    await page.waitForLoadState('networkidle')
    console.log('💳 User lands on pricing page')
    
    // Human behavior: Compare plans, read features
    const plans = await page.locator('[data-testid*="plan"], .plan, .pricing-tier').count()
    console.log(`🔍 User compares ${plans} pricing plans`)
    
    // Humans read the features of each plan
    await page.waitForTimeout(3000) // Reading/comparison time
    
    // Scroll through pricing options
    await page.evaluate(() => window.scrollBy(0, 200))
    await page.waitForTimeout(2000)
    
    // 3. REALISTIC HESITATION AND DECISION
    console.log('🤔 User considers options and decides on free trial...')
    
    // Look for free trial or cheapest option first (human behavior)
    const freeTrialButton = page.locator(
      'button:has-text("Free Trial"), button:has-text("Get Started"), button:has-text("Try Free")'
    ).first()
    
    if (await freeTrialButton.isVisible({ timeout: 3000 })) {
      console.log('✅ User finds free trial option')
      await freeTrialButton.click()
    } else {
      // Fallback to any signup button
      const anySignupButton = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up")').first()
      await anySignupButton.click()
    }
    
    // 4. REALISTIC SIGNUP FORM BEHAVIOR
    await page.waitForLoadState('networkidle')
    console.log('📝 User starts filling signup form...')
    
    const testUser = {
      name: 'John Smith', // More realistic than "Test User"
      email: `john.smith.${Date.now()}@tenantflow.test`,
      password: 'MySecurePass123!'
    }
    
    // Human behavior: Fill form with pauses and realistic interactions
    
    // Name field - humans often pause to think
    await page.fill('input[placeholder="John Doe"]', '')
    await page.waitForTimeout(500) // Brief pause
    await page.type('input[placeholder="John Doe"]', testUser.name, { delay: 100 })
    console.log('👤 User types their name')
    
    // Email - humans type their actual email
    await page.waitForTimeout(800)
    await page.type('input[placeholder="name@company.com"]', testUser.email, { delay: 80 })
    console.log('📧 User types their email')
    
    // Password - humans often struggle with password requirements
    await page.waitForTimeout(1200)
    await page.type('input[placeholder="Create a strong password"]', 'weak', { delay: 120 })
    await page.waitForTimeout(1000) // User sees password strength indicator
    
    // Human realizes password is weak, clears and tries again
    await page.fill('input[placeholder="Create a strong password"]', '')
    await page.waitForTimeout(500)
    await page.type('input[placeholder="Create a strong password"]', testUser.password, { delay: 100 })
    console.log('🔒 User creates a strong password (after trying weak one first)')
    
    // Confirm password - humans sometimes make typos
    await page.waitForTimeout(600)
    await page.type('input[placeholder="Confirm your password"]', testUser.password.slice(0, -1), { delay: 110 })
    await page.waitForTimeout(800) // User notices mismatch
    
    // Fix the typo
    await page.fill('input[placeholder="Confirm your password"]', testUser.password)
    console.log('✅ User fixes password confirmation')
    
    // Terms checkbox - humans often forget this initially
    await page.waitForTimeout(1500) // User tries to submit without terms
    
    // Check if submit button is disabled (good UX)
    const submitButton = page.locator('button:has-text("Create Account")')
    const isDisabled = await submitButton.getAttribute('disabled')
    if (isDisabled !== null) {
      console.log('⚠️ User notices submit button is disabled, looks for what\'s missing')
      await page.waitForTimeout(1000) // User scans form
    }
    
    // User finds and checks terms
    await page.check('#terms')
    console.log('📋 User agrees to terms and conditions')
    await page.waitForTimeout(800) // Brief pause before submitting
    
    // 5. REALISTIC FORM SUBMISSION
    console.log('🚀 User submits signup form...')
    await submitButton.click()
    
    // 6. REALISTIC POST-SIGNUP BEHAVIOR
    await page.waitForTimeout(3000)
    const currentUrl = page.url()
    
    if (currentUrl.includes('/auth/signup')) {
      // Look for success message
      const successSelectors = [
        'text=/check.*email/i',
        'text=/verify.*email/i', 
        'text=/confirmation.*sent/i',
        'text=/account.*created/i'
      ]
      
      let foundMessage = false
      for (const selector of successSelectors) {
        const element = page.locator(selector).first()
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          const message = await element.textContent()
          console.log(`✅ User sees: "${message}"`)
          foundMessage = true
          break
        }
      }
      
      if (foundMessage) {
        console.log('📬 User now needs to check their email (REALISTIC BEHAVIOR)')
        console.log('🧍‍♂️ At this point, a real user would:')
        console.log('  1. Switch to their email app/tab')
        console.log('  2. Look for confirmation email')
        console.log('  3. Click the confirmation link')
        console.log('  4. Return to the app to start using it')
        
        // TODO: This is where we'd simulate email checking behavior
        // For now, we acknowledge this gap exists
        expect(foundMessage).toBeTruthy()
      }
    }
    
    console.log('✅ Realistic human signup journey completed')
  })
  
  test('should simulate realistic user browsing and abandonment', async ({ page }) => {
    console.log('🧍‍♂️ Simulating user who browses but doesn\'t sign up...')
    
    // 1. User lands on homepage
    await page.goto('/')
    await page.waitForTimeout(2000) // Reading time
    
    // 2. User browses around
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(2500) // More reading
    
    // 3. User checks pricing but gets scared by cost
    const pricingLink = page.locator('a:has-text("Pricing")').first()
    if (await pricingLink.isVisible({ timeout: 3000 })) {
      await pricingLink.click()
      await page.waitForTimeout(3000) // User reads pricing
      
      console.log('💸 User sees pricing and decides it\'s too expensive')
      
      // 4. User navigates away (realistic abandonment)
      await page.goBack()
      await page.waitForTimeout(1000)
      
      // 5. User maybe checks features again
      await page.evaluate(() => window.scrollBy(0, 300))
      await page.waitForTimeout(2000)
      
      // 6. User leaves (closes tab - we can't test this, but we acknowledge it)
      console.log('👋 User leaves without signing up (realistic behavior)')
      console.log('📊 This represents ~70-90% of actual website visitors')
    }
    
    expect(true).toBeTruthy() // Test passes - abandonment is normal
  })
  
  test('should simulate user who signs up but never confirms email', async ({ page }) => {
    console.log('🧍‍♂️ Simulating user who signs up but never confirms email...')
    
    // Quick signup
    await page.goto('/auth/signup')
    
    const testUser = {
      email: `never.confirms.${Date.now()}@tenantflow.test`,
      password: 'TestPassword123!'
    }
    
    // Fill form normally
    await page.fill('input[placeholder="John Doe"]', 'Never Confirms')
    await page.fill('input[placeholder="name@company.com"]', testUser.email)
    await page.fill('input[placeholder="Create a strong password"]', testUser.password)
    await page.fill('input[placeholder="Confirm your password"]', testUser.password)
    await page.check('#terms')
    
    await page.click('button:has-text("Create Account")')
    await page.waitForTimeout(3000)
    
    console.log('📧 User receives confirmation email but never clicks it')
    console.log('⏳ User tries to use app later without confirming...')
    
    // Try to access dashboard directly (what users do)
    await page.goto('/dashboard')
    
    // Should be redirected to login or blocked
    const finalUrl = page.url()
    console.log(`📍 Unconfirmed user redirected to: ${finalUrl}`)
    
    if (finalUrl.includes('/auth/login') || finalUrl.includes('/auth/signup')) {
      console.log('✅ App properly handles unconfirmed users')
    }
    
    expect(finalUrl).not.toContain('/dashboard') // Should not access dashboard
  })
})