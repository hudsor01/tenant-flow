/**
 * Visual Regression Tests for Pricing Pages
 * Captures screenshots to detect visual changes
 */

import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
]

test.describe('Visual Regression - Standard Pricing Page', () => {
  viewports.forEach(({ name, width, height }) => {
    test(`should match visual snapshot on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/pricing')
      await page.waitForLoadState('networkidle')
      
      // Wait for animations to complete
      await page.waitForTimeout(1000)
      
      // Take screenshot
      await expect(page).toHaveScreenshot(`pricing-standard-${name}.png`, {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test(`should match visual snapshot with annual billing on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/pricing')
      await page.waitForLoadState('networkidle')
      
      // Switch to annual billing
      await page.getByRole('button', { name: /annual billing/i }).click()
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot(`pricing-standard-annual-${name}.png`, {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test('should capture hover states', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    // Hover over Growth card
    const growthCard = page.locator('[class*="card"]').filter({ hasText: 'Growth' })
    await growthCard.hover()
    await page.waitForTimeout(300)
    
    await expect(growthCard).toHaveScreenshot('pricing-growth-card-hover.png')
  })

  test('should capture FAQ expanded state', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    // Expand first FAQ item
    await page.getByText('Can I change plans anytime?').click()
    await page.waitForTimeout(300)
    
    const faqSection = page.locator('text=Frequently Asked Questions').locator('..')
    await expect(faqSection).toHaveScreenshot('pricing-faq-expanded.png')
  })
})

test.describe('Visual Regression - Custom Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API response for consistent visual tests
    await page.route('**/api/stripe/setup-pricing', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              product: {
                id: 'tenantflow_free_trial',
                name: 'Free Trial',
                description: 'Perfect for getting started',
                metadata: {
                  tier: 'free_trial',
                  propertyLimit: '1',
                  unitLimit: '5',
                  storageGB: '1',
                  support: 'Email',
                  features: JSON.stringify([
                    '1 property',
                    'Up to 5 units',
                    'Basic maintenance tracking',
                  ]),
                  order: '1',
                },
              },
              prices: [
                {
                  id: 'price_free',
                  unit_amount: 0,
                  currency: 'usd',
                  interval: 'month',
                  metadata: {},
                },
              ],
            },
            {
              product: {
                id: 'tenantflow_growth',
                name: 'Growth',
                description: 'For growing portfolios',
                metadata: {
                  tier: 'growth',
                  propertyLimit: '20',
                  unitLimit: '100',
                  storageGB: '50',
                  support: 'Phone & Email',
                  features: JSON.stringify([
                    'Up to 20 properties',
                    'Up to 100 units',
                    'Advanced analytics',
                  ]),
                  popular: 'true',
                  order: '3',
                },
              },
              prices: [
                {
                  id: 'price_growth_monthly',
                  unit_amount: 7900,
                  currency: 'usd',
                  interval: 'month',
                  metadata: { tier: 'growth', billing: 'monthly' },
                },
                {
                  id: 'price_growth_annual',
                  unit_amount: 79000,
                  currency: 'usd',
                  interval: 'year',
                  metadata: { 
                    tier: 'growth', 
                    billing: 'annual',
                    monthly_equivalent: '6583',
                  },
                },
              ],
            },
          ],
          timestamp: new Date().toISOString(),
        }),
      })
    })
  })

  viewports.forEach(({ name, width, height }) => {
    test(`should match visual snapshot on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/pricing-custom')
      await page.waitForLoadState('networkidle')
      
      // Wait for data to load
      await page.waitForSelector('text=Growth', { timeout: 5000 })
      await page.waitForTimeout(1000)
      
      await expect(page).toHaveScreenshot(`pricing-custom-${name}.png`, {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test('should capture gradient card effects', async ({ page }) => {
    await page.goto('/pricing-custom')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Growth')
    
    const growthCard = page.locator('[class*="card"]').filter({ hasText: 'Growth' })
    await expect(growthCard).toHaveScreenshot('pricing-custom-growth-gradient.png')
    
    const maxCard = page.locator('[class*="card"]').filter({ hasText: 'TenantFlow Max' })
    await expect(maxCard).toHaveScreenshot('pricing-custom-max-gradient.png')
  })

  test('should capture loading state', async ({ page }) => {
    // Delay the API response to capture loading state
    await page.route('**/api/stripe/setup-pricing', async route => {
      await page.waitForTimeout(2000)
      route.fulfill({
        status: 200,
        body: JSON.stringify({ products: [] }),
      })
    })
    
    await page.goto('/pricing-custom')
    
    // Capture loading state
    await page.waitForSelector('text=Loading pricing')
    await expect(page).toHaveScreenshot('pricing-custom-loading.png', {
      fullPage: true,
    })
  })
})

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Set dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' })
  })

  test('should match dark mode snapshot for standard pricing', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveScreenshot('pricing-standard-dark.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('should match dark mode snapshot for custom pricing', async ({ page }) => {
    await page.goto('/pricing-custom')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    await expect(page).toHaveScreenshot('pricing-custom-dark.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

test.describe('Visual Regression - Animations', () => {
  test('should capture button hover animation', async ({ page, browserName }) => {
    // Skip on webkit as hover animations can be flaky
    test.skip(browserName === 'webkit')
    
    await page.goto('/pricing-custom')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Get Started')
    
    const button = page.getByRole('button', { name: /get started/i }).first()
    
    // Capture before hover
    await expect(button).toHaveScreenshot('button-before-hover.png')
    
    // Hover and capture
    await button.hover()
    await page.waitForTimeout(300) // Wait for transition
    await expect(button).toHaveScreenshot('button-after-hover.png')
  })

  test('should capture billing toggle animation', async ({ page }) => {
    await page.goto('/pricing-custom')
    await page.waitForLoadState('networkidle')
    
    const billingToggle = page.locator('[role="tablist"]')
    
    // Capture initial state
    await expect(billingToggle).toHaveScreenshot('billing-toggle-monthly.png')
    
    // Click annual and capture
    await page.getByRole('tab', { name: /annual billing/i }).click()
    await page.waitForTimeout(300)
    await expect(billingToggle).toHaveScreenshot('billing-toggle-annual.png')
  })
})

test.describe('Visual Regression - Error States', () => {
  test('should capture API error state', async ({ page }) => {
    await page.route('**/api/stripe/setup-pricing', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })
    
    await page.goto('/pricing-custom')
    await page.waitForSelector('text=Failed to load pricing')
    
    await expect(page).toHaveScreenshot('pricing-custom-error.png', {
      fullPage: true,
    })
  })

  test('should capture configuration required state', async ({ page }) => {
    await page.goto('/pricing-official')
    await page.waitForLoadState('networkidle')
    
    // If configuration is not set, capture the setup instructions
    if (await page.getByText('Pricing Configuration Required').isVisible()) {
      await expect(page).toHaveScreenshot('pricing-official-config-required.png', {
        fullPage: true,
      })
    }
  })
})

test.describe('Visual Regression - Cross-browser', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should render consistently on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Skipping for ${currentBrowser}`)
      
      await page.goto('/pricing')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      await expect(page).toHaveScreenshot(`pricing-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })
})

test.describe('Visual Regression - Accessibility', () => {
  test('should maintain visual hierarchy with high contrast mode', async ({ page }) => {
    // Emulate high contrast mode
    await page.emulateMedia({ forcedColors: 'active' })
    
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('pricing-high-contrast.png', {
      fullPage: true,
    })
  })

  test('should show focus indicators', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    // Tab to first interactive element
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Capture with focus visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toHaveScreenshot('element-with-focus.png')
  })
})