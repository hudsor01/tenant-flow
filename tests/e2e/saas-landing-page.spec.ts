import { test, expect } from '@playwright/test'

test.describe('SaaS Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Storybook SaaS landing page
    await page.goto('/storybook/iframe.html?args=&id=marketing-pages-saas-landing-page--complete-landing-page&viewMode=story')
  })

  test('should render complete landing page with all sections', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check hero section
    await expect(page.getByText('Property management made effortless')).toBeVisible()
    await expect(page.getByText('Start free trial')).toBeVisible()
    await expect(page.getByText('Watch demo')).toBeVisible()

    // Check features section
    await expect(page.getByText('Everything you need to manage')).toBeVisible()
    await expect(page.getByText('Property Portfolio Management')).toBeVisible()

    // Check testimonials section
    await expect(page.getByText('Trusted by property managers')).toBeVisible()
    
    // Check pricing section
    await expect(page.getByText('Simple, transparent pricing')).toBeVisible()
    await expect(page.getByText('Starter')).toBeVisible()
    await expect(page.getByText('Professional')).toBeVisible()
    await expect(page.getByText('Enterprise')).toBeVisible()

    // Check final CTA section
    await expect(page.getByText('Transform your property management today')).toBeVisible()
  })

  test('should handle CTA button interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Test hero CTA buttons
    const heroCtaButton = page.getByRole('button', { name: /start free trial/i }).first()
    await expect(heroCtaButton).toBeVisible()
    await expect(heroCtaButton).toBeEnabled()

    const demoBytton = page.getByRole('button', { name: /watch demo/i }).first()
    await expect(demoBytton).toBeVisible()
    await expect(demoBytton).toBeEnabled()

    // Test hover effects
    await heroCtaButton.hover()
    await expect(heroCtaButton).toHaveClass(/hover:scale-105/)

    // Test pricing section buttons
    const pricingButtons = page.getByRole('button', { name: /start free trial/i })
    await expect(pricingButtons).toHaveCount(2) // Hero + Pricing sections
  })

  test('should display pricing toggle functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Scroll to pricing section
    await page.locator('text=Simple, transparent pricing').scrollIntoViewIfNeeded()

    // Find the billing toggle switch
    const billingToggle = page.locator('[role="switch"]').first()
    await expect(billingToggle).toBeVisible()

    // Test monthly pricing (default)
    await expect(page.getByText('$29')).toBeVisible()
    await expect(page.getByText('$99')).toBeVisible()

    // Toggle to yearly pricing
    await billingToggle.click()
    
    // Check that prices changed to yearly equivalent
    await expect(page.getByText('$24')).toBeVisible() // 290/12 = ~24
    await expect(page.getByText('$82')).toBeVisible() // 990/12 = ~82
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForLoadState('networkidle')

    // Check that hero content is visible and properly stacked
    await expect(page.getByText('Property management made effortless')).toBeVisible()
    
    // Check that buttons stack vertically on mobile
    const heroSection = page.locator('section').first()
    const ctaButtons = heroSection.locator('button')
    
    // Both buttons should be visible
    await expect(ctaButtons).toHaveCount(2)

    // Check that pricing cards stack on mobile
    await page.locator('text=Simple, transparent pricing').scrollIntoViewIfNeeded()
    const pricingCards = page.locator('[class*="grid-cols-1"]')
    await expect(pricingCards).toBeVisible()
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check for semantic HTML structure
    await expect(page.locator('main, section, header, h1, h2, h3')).toHaveCount(6)

    // Check that all buttons have accessible names
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      await expect(button).toHaveAttribute('type', /button|submit/)
    }

    // Check that images have alt attributes
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i)
      await expect(image).toHaveAttribute('alt')
    }

    // Check heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h2')).toHaveCountGreaterThan(0)
  })

  test('should handle animations and loading states', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check that animation components are present
    await expect(page.locator('[class*="blur-fade"]')).toHaveCountGreaterThan(0)
    
    // Check for particle effects
    await expect(page.locator('[class*="particles"]')).toBeVisible()

    // Check for shimmer effects on CTA buttons
    await expect(page.locator('[class*="shimmer"]')).toBeVisible()

    // Check for gradient animations
    await expect(page.locator('[class*="animate-gradient"]')).toBeVisible()
  })

  test('should display all testimonials with proper content', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Scroll to testimonials section
    await page.locator('text=Trusted by property managers').scrollIntoViewIfNeeded()

    // Check that testimonials are displayed
    await expect(page.getByText('TenantFlow transformed our property management')).toBeVisible()
    
    // Check for star ratings
    const starRatings = page.locator('[class*="fill-yellow-400"]')
    await expect(starRatings).toHaveCountGreaterThan(0)

    // Check for author information
    await expect(page.getByText('Sarah Chen')).toBeVisible()
    await expect(page.getByText('CEO')).toBeVisible()

    // Check for metrics badges
    await expect(page.getByText('60% less admin overhead')).toBeVisible()
  })

  test('should display security and trust indicators', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Scroll to bottom CTA section
    await page.locator('text=Transform your property management today').scrollIntoViewIfNeeded()

    // Check for security badges
    await expect(page.getByText('SOC 2 Type II Compliant')).toBeVisible()
    await expect(page.getByText('GDPR Compliant')).toBeVisible()
    await expect(page.getByText('256-bit SSL Encryption')).toBeVisible()
    await expect(page.getByText('99.9% Uptime SLA')).toBeVisible()

    // Check for guarantee statements
    await expect(page.getByText('No credit card required')).toBeVisible()
    await expect(page.getByText('14-day free trial')).toBeVisible()
    await expect(page.getByText('Cancel anytime')).toBeVisible()
  })

  test('should handle dark mode properly', async ({ page }) => {
    // Add dark mode class to test dark theme
    await page.addStyleTag({
      content: `
        html { color-scheme: dark; }
        .dark { color-scheme: dark; }
      `
    })
    
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })

    await page.waitForLoadState('networkidle')

    // Check that dark mode styles are applied
    const body = page.locator('body')
    await expect(body).toHaveClass(/dark/)

    // Check that text is still readable in dark mode
    await expect(page.getByText('Property management made effortless')).toBeVisible()
    await expect(page.getByText('Start free trial')).toBeVisible()
  })

  test('should have proper performance characteristics', async ({ page }) => {
    // Monitor network requests
    const requests = []
    page.on('request', request => {
      requests.push(request.url())
    })

    await page.waitForLoadState('networkidle')

    // Check that essential content loads quickly
    await expect(page.getByText('Property management made effortless')).toBeVisible({ timeout: 3000 })

    // Check for minimal external requests (should mostly be local assets)
    const externalRequests = requests.filter(url => 
      !url.includes('localhost') && !url.includes('127.0.0.1')
    )
    expect(externalRequests.length).toBeLessThan(5) // Allow for some CDN resources

    // Check that images are optimized (should have proper loading attributes)
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < Math.min(imageCount, 3); i++) {
      const image = images.nth(i)
      // Check for loading optimization attributes
      await expect(image).toHaveAttribute('loading', /lazy|eager/)
    }
  })
})