import { test, expect } from '@playwright/test'

/**
 * Landing Page Visual Regression Tests
 * 
 * This test suite captures baseline screenshots of the landing page
 * and detects visual regressions over time. It covers:
 * - Hero section with CTA
 * - Feature cards grid
 * - Trust section
 * - Early access signup form
 * - Full page layout across different viewports
 */

test.describe('Landing Page Visual Regression', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to landing page
    await page.goto('/')
    
    // Wait for page to be fully loaded and animations to settle
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Let animations complete
  })

  test('landing page hero section visual', async ({ page }) => {
    // Scroll to hero section and wait for animations
    await page.locator('h1').scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    // Take screenshot of hero section
    await expect(page.locator('section').first()).toHaveScreenshot('landing-hero-section.png', {
      fullPage: false,
      animations: 'disabled'
    })
  })

  test('landing page feature cards visual', async ({ page }) => {
    // Find and screenshot the feature cards section
    const featureSection = page.locator('text=Everything You Need to').locator('..').locator('..')
    await featureSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    await expect(featureSection).toHaveScreenshot('landing-feature-cards.png', {
      fullPage: false,
      animations: 'disabled'
    })
  })

  test('landing page trust section visual', async ({ page }) => {
    // Find and screenshot the trust section
    const trustSection = page.locator('text=Built by Property Managers').locator('..').locator('..')
    await trustSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    await expect(trustSection).toHaveScreenshot('landing-trust-section.png', {
      fullPage: false,
      animations: 'disabled'
    })
  })

  test('early access signup form visual', async ({ page }) => {
    // Find and screenshot the early access form
    const signupForm = page.locator('text=Join Early Access').locator('..').locator('..')
    await signupForm.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    await expect(signupForm).toHaveScreenshot('early-access-form.png', {
      fullPage: false,
      animations: 'disabled'
    })
  })

  test('early access form interaction states', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]')
    const submitButton = page.locator('button[type="submit"]')
    
    // Scroll to form
    await emailInput.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    // Test focus state
    await emailInput.focus()
    await expect(emailInput.locator('..').locator('..')).toHaveScreenshot('form-focus-state.png', {
      animations: 'disabled'
    })
    
    // Test filled state
    await emailInput.fill('test@example.com')
    await expect(emailInput.locator('..').locator('..')).toHaveScreenshot('form-filled-state.png', {
      animations: 'disabled'
    })
    
    // Test loading state (without actually submitting)
    await submitButton.hover()
    await expect(submitButton).toHaveScreenshot('form-submit-hover.png', {
      animations: 'disabled'
    })
  })

  test('full landing page layout - desktop', async ({ page }) => {
    // Full page screenshot for desktop
    await expect(page).toHaveScreenshot('landing-fullpage-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('full landing page layout - mobile', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Full page screenshot for mobile
    await expect(page).toHaveScreenshot('landing-fullpage-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('full landing page layout - tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Full page screenshot for tablet
    await expect(page).toHaveScreenshot('landing-fullpage-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('navigation visual states', async ({ page }) => {
    const nav = page.locator('nav')
    
    // Default navigation state
    await expect(nav).toHaveScreenshot('navigation-default.png', {
      animations: 'disabled'
    })
    
    // Test mobile menu if viewport is small enough
    await page.setViewportSize({ width: 640, height: 800 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    const mobileMenuButton = page.locator('button', { hasText: /menu/i }).or(
      page.locator('button').filter({ has: page.locator('svg') })
    ).first()
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('navigation-mobile-menu.png', {
        animations: 'disabled'
      })
    }
  })

  test('cta buttons hover states', async ({ page }) => {
    const ctaButtons = page.locator('button, a').filter({ hasText: /join early access|get started/i })
    
    for (let i = 0; i < await ctaButtons.count(); i++) {
      const button = ctaButtons.nth(i)
      await button.scrollIntoViewIfNeeded()
      await button.hover()
      await page.waitForTimeout(200)
      
      await expect(button).toHaveScreenshot(`cta-button-hover-${i}.png`, {
        animations: 'disabled'
      })
    }
  })
})

test.describe('Landing Page Dark Mode Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Set dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('landing page dark theme visual', async ({ page }) => {
    await expect(page).toHaveScreenshot('landing-dark-theme-fullpage.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('early access form dark theme', async ({ page }) => {
    const signupForm = page.locator('text=Join Early Access').locator('..').locator('..')
    await signupForm.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    
    await expect(signupForm).toHaveScreenshot('early-access-form-dark.png', {
      fullPage: false,
      animations: 'disabled'
    })
  })
})

test.describe('Landing Page Performance Visual Indicators', () => {
  test('loading states and skeleton screens', async ({ page }) => {
    // Test with slow network to catch loading states
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100))
      await route.continue()
    })
    
    await page.goto('/')
    
    // Capture any loading states that appear
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('landing-with-loading-states.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })
})