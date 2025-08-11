import { test, expect, Page } from '@playwright/test'

/**
 * CONVERSION MONITORING TESTS
 * 
 * These tests focus on BUSINESS OUTCOMES, not just technical functionality.
 * They help identify where users drop off and why.
 * 
 * Run: Weekly or when making UX changes
 */

test.describe('Conversion Funnel Monitoring', () => {

  test('should track complete signup conversion funnel with metrics', async ({ page }) => {
    console.log('📊 CONVERSION FUNNEL ANALYSIS STARTING...')
    
    const metrics = {
      landingPageLoad: 0,
      pricingPageReached: 0,
      signupPageReached: 0,
      formStarted: 0,
      formCompleted: 0,
      emailConfirmationSent: 0,
      timeSpent: {
        onLanding: 0,
        onPricing: 0,
        onSignup: 0
      },
      errors: [],
      abandonment_points: []
    }
    
    const journeyStart = Date.now()
    
    // STAGE 1: Landing Page Engagement
    console.log('🚪 Stage 1: Landing Page')
    const landingStart = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    metrics.landingPageLoad = Date.now()
    
    // Check if key conversion elements are visible
    const ctaButtons = await page.locator('button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Try Free"), a:has-text("Try Free")').count()
    const valueProps = await page.locator('h1, h2, .hero, .value-prop').count()
    
    console.log(`✅ Landing loaded - CTAs: ${ctaButtons}, Value props: ${valueProps}`)
    
    if (ctaButtons === 0) {
      metrics.errors.push('No clear CTA buttons on landing page')
    }
    
    // Simulate human reading time
    await page.waitForTimeout(3000)
    metrics.timeSpent.onLanding = Date.now() - landingStart
    
    // STAGE 2: Pricing Page Interest
    console.log('💰 Stage 2: Pricing Interest')
    const pricingStart = Date.now()
    
    const pricingLink = page.locator('a:has-text("Pricing"), a[href*="pricing"]').first()
    if (await pricingLink.isVisible({ timeout: 3000 })) {
      await pricingLink.click()
      await page.waitForLoadState('networkidle')
      metrics.pricingPageReached = Date.now()
      
      // Check pricing page conversion elements
      const plans = await page.locator('[class*="plan"], [class*="pricing"], [class*="tier"]').count()
      const freeTrialOptions = await page.locator('text=/free/i, text=/trial/i').count()
      
      console.log(`💳 Pricing loaded - Plans: ${plans}, Free trial mentions: ${freeTrialOptions}`)
      
      if (freeTrialOptions === 0) {
        metrics.errors.push('No free trial mentioned on pricing page')
      }
      
      // Human comparison time
      await page.waitForTimeout(5000)
      metrics.timeSpent.onPricing = Date.now() - pricingStart
    } else {
      metrics.abandonment_points.push('No pricing link found on landing page')
      metrics.errors.push('Cannot find pricing navigation')
    }
    
    // STAGE 3: Signup Intention
    console.log('📝 Stage 3: Signup Attempt')
    const signupStart = Date.now()
    
    // Look for signup trigger
    const signupTriggers = [
      page.locator('button:has-text("Free Trial")'),
      page.locator('button:has-text("Get Started")'),
      page.locator('button:has-text("Sign Up")'),
      page.locator('a[href*="signup"]')
    ]
    
    let foundSignupTrigger = false
    for (const trigger of signupTriggers) {
      if (await trigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trigger.click()
        foundSignupTrigger = true
        console.log('🎯 User clicks signup trigger')
        break
      }
    }
    
    if (!foundSignupTrigger) {
      metrics.abandonment_points.push('No clear signup trigger found')
      metrics.errors.push('Cannot find way to start signup')
    } else {
      await page.waitForLoadState('networkidle')
      metrics.signupPageReached = Date.now()
      
      // STAGE 4: Form Interaction
      console.log('📋 Stage 4: Form Engagement')
      
      const requiredFields = [
        'input[placeholder*="name"], input[name="name"], input[id="name"]',
        'input[type="email"], input[placeholder*="email"]',
        'input[type="password"], input[placeholder*="password"]',
        'input[type="checkbox"], input[name*="terms"]'
      ]
      
      let visibleFields = 0
      for (const fieldSelector of requiredFields) {
        if (await page.locator(fieldSelector).isVisible({ timeout: 1000 }).catch(() => false)) {
          visibleFields++
        }
      }
      
      console.log(`📝 Signup form has ${visibleFields}/${requiredFields.length} expected fields`)
      
      if (visibleFields < 3) {
        metrics.errors.push('Signup form missing essential fields')
      }
      
      // STAGE 5: Form Completion Attempt
      const testUser = {
        name: 'Conversion Test User',
        email: `conversion.test.${Date.now()}@tenantflow.test`,
        password: 'ConversionTest123!'
      }
      
      try {
        // Attempt to fill form (simulating user effort)
        await page.fill('input[placeholder="John Doe"]', testUser.name)
        await page.waitForTimeout(800) // Human typing pause
        
        await page.fill('input[placeholder="name@company.com"]', testUser.email)  
        await page.waitForTimeout(1000) // Email thinking pause
        
        metrics.formStarted = Date.now()
        console.log('✏️ User starts filling form')
        
        await page.fill('input[placeholder="Create a strong password"]', testUser.password)
        await page.waitForTimeout(600)
        
        await page.fill('input[placeholder="Confirm your password"]', testUser.password)
        await page.waitForTimeout(400)
        
        // Terms checkbox - common abandonment point
        const termsCheckbox = page.locator('#terms, input[name*="terms"]').first()
        if (await termsCheckbox.isVisible({ timeout: 2000 })) {
          await termsCheckbox.check()
        } else {
          metrics.errors.push('Terms checkbox not found or not visible')
        }
        
        metrics.formCompleted = Date.now()
        console.log('✅ User completes form')
        
        // STAGE 6: Form Submission
        const submitButton = page.locator('button:has-text("Create Account"), button[type="submit"]').first()
        
        if (await submitButton.isEnabled({ timeout: 2000 })) {
          await submitButton.click()
          console.log('🚀 User submits form')
          
          await page.waitForTimeout(3000)
          
          // Check for success indicators
          const successIndicators = [
            'text=/check.*email/i',
            'text=/verify.*email/i',
            'text=/confirmation/i',
            'text=/success/i'
          ]
          
          let conversionSuccess = false
          for (const indicator of successIndicators) {
            if (await page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false)) {
              metrics.emailConfirmationSent = Date.now()
              conversionSuccess = true
              console.log('🎉 CONVERSION SUCCESS - Email confirmation triggered')
              break
            }
          }
          
          if (!conversionSuccess) {
            metrics.abandonment_points.push('No clear success confirmation after form submission')
          }
          
        } else {
          metrics.abandonment_points.push('Submit button not enabled after form completion')
          metrics.errors.push('Form validation preventing submission')
        }
        
      } catch (error) {
        metrics.errors.push(`Form interaction failed: ${error.message}`)
        metrics.abandonment_points.push('Form UX issues preventing completion')
      }
      
      metrics.timeSpent.onSignup = Date.now() - signupStart
    }
    
    // CONVERSION ANALYSIS
    const totalJourneyTime = Date.now() - journeyStart
    
    console.log('\n📊 CONVERSION FUNNEL RESULTS:')
    console.log('=====================================')
    console.log(`🚪 Landing Page Load: ${metrics.landingPageLoad ? '✅' : '❌'}`)
    console.log(`💰 Pricing Page Reached: ${metrics.pricingPageReached ? '✅' : '❌'}`) 
    console.log(`📝 Signup Page Reached: ${metrics.signupPageReached ? '✅' : '❌'}`)
    console.log(`✏️ Form Started: ${metrics.formStarted ? '✅' : '❌'}`)
    console.log(`✅ Form Completed: ${metrics.formCompleted ? '✅' : '❌'}`)
    console.log(`📧 Email Sent: ${metrics.emailConfirmationSent ? '✅' : '❌'}`)
    
    console.log('\n⏱️ TIME ANALYSIS:')
    console.log(`Landing Page: ${metrics.timeSpent.onLanding / 1000}s`)
    console.log(`Pricing Page: ${metrics.timeSpent.onPricing / 1000}s`) 
    console.log(`Signup Process: ${metrics.timeSpent.onSignup / 1000}s`)
    console.log(`Total Journey: ${totalJourneyTime / 1000}s`)
    
    if (metrics.errors.length > 0) {
      console.log('\n🚨 CONVERSION BLOCKERS:')
      metrics.errors.forEach((error, i) => console.log(`${i + 1}. ${error}`))
    }
    
    if (metrics.abandonment_points.length > 0) {
      console.log('\n🚪 ABANDONMENT RISKS:')
      metrics.abandonment_points.forEach((point, i) => console.log(`${i + 1}. ${point}`))
    }
    
    // Success criteria: Did we get to email confirmation?
    const conversionComplete = metrics.emailConfirmationSent > 0
    console.log(`\n🎯 OVERALL CONVERSION: ${conversionComplete ? '✅ SUCCESS' : '❌ FAILED'}`)
    
    expect(conversionComplete).toBeTruthy()
  })
  
  test('should identify mobile conversion differences', async ({ page }) => {
    console.log('📱 MOBILE CONVERSION ANALYSIS...')
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }) // iPhone X
    
    const mobileMetrics = {
      navigationIssues: [],
      formUXIssues: [],
      performanceIssues: []
    }
    
    await page.goto('/')
    
    // Check mobile navigation
    const mobileMenu = await page.locator('.mobile-menu, [data-testid="mobile-menu"], button[aria-label*="menu"]').isVisible()
    if (!mobileMenu) {
      mobileMetrics.navigationIssues.push('No mobile menu found')
    }
    
    // Check if CTA buttons are thumb-friendly
    const ctaButtons = page.locator('button:has-text("Get Started"), a:has-text("Get Started")')
    const ctaCount = await ctaButtons.count()
    
    for (let i = 0; i < ctaCount; i++) {
      const button = ctaButtons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box && (box.height < 44 || box.width < 44)) {
          mobileMetrics.formUXIssues.push('CTA button too small for mobile (< 44px)')
        }
      }
    }
    
    console.log('📱 Mobile Analysis Results:')
    console.log(`Navigation Issues: ${mobileMetrics.navigationIssues.length}`)
    console.log(`Form UX Issues: ${mobileMetrics.formUXIssues.length}`)
    console.log(`Performance Issues: ${mobileMetrics.performanceIssues.length}`)
    
    // Mobile conversion is acceptable if major issues < 3
    const majorIssues = mobileMetrics.navigationIssues.length + mobileMetrics.formUXIssues.length
    expect(majorIssues).toBeLessThan(3)
  })

})