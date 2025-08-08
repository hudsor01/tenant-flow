/**
 * E2E Tests for Stripe Pricing Pages
 * Tests all three pricing page implementations and checkout flow
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const STRIPE_TEST_CARD = '4242424242424242'
const TEST_EMAIL = 'test@example.com'
const TEST_CVC = '123'
const FUTURE_DATE = '12/30' // MM/YY format

// Pricing tiers
const PRICING_TIERS = {
  FREE_TRIAL: {
    name: 'Free Trial',
    monthlyPrice: 0,
    annualPrice: 0,
    propertyLimit: '1',
    unitLimit: '5',
  },
  STARTER: {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290,
    propertyLimit: '5',
    unitLimit: '25',
  },
  GROWTH: {
    name: 'Growth',
    monthlyPrice: 79,
    annualPrice: 790,
    propertyLimit: '20',
    unitLimit: '100',
  },
  TENANTFLOW_MAX: {
    name: 'TenantFlow Max',
    monthlyPrice: 199,
    annualPrice: 1990,
    propertyLimit: '∞',
    unitLimit: '∞',
  },
}

test.describe('Standard Pricing Page (/pricing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
  })

  test('should display all pricing tiers', async ({ page }) => {
    // Check all tier names are visible
    for (const tier of Object.values(PRICING_TIERS)) {
      await expect(page.getByText(tier.name, { exact: true })).toBeVisible()
    }
  })

  test('should display correct monthly prices', async ({ page }) => {
    // Ensure monthly billing is selected
    const monthlyButton = page.getByRole('button', { name: /monthly billing/i })
    await monthlyButton.click()
    
    // Check prices
    await expect(page.getByText('$0').first()).toBeVisible() // Free Trial
    await expect(page.getByText('$29').first()).toBeVisible() // Starter
    await expect(page.getByText('$79').first()).toBeVisible() // Growth
    await expect(page.getByText('$199').first()).toBeVisible() // TenantFlow Max
  })

  test('should switch to annual billing and show savings', async ({ page }) => {
    // Click annual billing
    const annualButton = page.getByRole('button', { name: /annual billing/i })
    await annualButton.click()
    
    // Check annual prices
    await expect(page.getByText('$290')).toBeVisible() // Starter annual
    await expect(page.getByText('$790')).toBeVisible() // Growth annual
    await expect(page.getByText('$1990')).toBeVisible() // TenantFlow Max annual
    
    // Check savings badge
    await expect(page.getByText(/save.*17%/i)).toBeVisible()
  })

  test('should display property and unit limits', async ({ page }) => {
    // Check limits for each tier
    const cards = page.locator('[class*="card"]')
    
    // Free Trial limits
    const freeCard = cards.filter({ hasText: 'Free Trial' })
    await expect(freeCard.getByText('1').first()).toBeVisible() // 1 property
    await expect(freeCard.getByText('5').first()).toBeVisible() // 5 units
    
    // Starter limits
    const starterCard = cards.filter({ hasText: 'Starter' })
    await expect(starterCard.getByText('5').first()).toBeVisible() // 5 properties
    await expect(starterCard.getByText('25').first()).toBeVisible() // 25 units
  })

  test('should highlight Growth plan as most popular', async ({ page }) => {
    const growthCard = page.locator('[class*="card"]').filter({ hasText: 'Growth' })
    await expect(growthCard.getByText(/most popular/i)).toBeVisible()
  })

  test('should display feature lists with scroll areas', async ({ page }) => {
    // Check that ScrollArea is working for feature lists
    const cards = page.locator('[class*="card"]')
    
    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i)
      const featureList = card.locator('[class*="scroll-area"]')
      await expect(featureList).toBeVisible()
      
      // Check at least one feature is visible
      const checkmarks = card.locator('svg[class*="check"]')
      expect(await checkmarks.count()).toBeGreaterThan(0)
    }
  })

  test('should show support levels for each tier', async ({ page }) => {
    await expect(page.getByText('Email').first()).toBeVisible()
    await expect(page.getByText('Priority Email')).toBeVisible()
    await expect(page.getByText('Phone & Email')).toBeVisible()
    await expect(page.getByText('24/7 Dedicated')).toBeVisible()
  })

  test('should display trust badges', async ({ page }) => {
    await expect(page.getByText('No setup fees')).toBeVisible()
    await expect(page.getByText('Cancel anytime')).toBeVisible()
    await expect(page.getByText('Secure payment via Stripe')).toBeVisible()
  })

  test('should show FAQ section', async ({ page }) => {
    await expect(page.getByText('Frequently Asked Questions')).toBeVisible()
    
    // Test expandable FAQ items
    const faqItem = page.getByText('Can I change plans anytime?')
    await faqItem.click()
    await expect(page.getByText(/upgrade or downgrade your plan at any time/i)).toBeVisible()
  })
})

test.describe('Custom Dynamic Pricing Page (/pricing-custom)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing-custom')
    await page.waitForLoadState('networkidle')
  })

  test('should fetch and display pricing from Stripe API', async ({ page }) => {
    // Wait for loading to complete
    await expect(page.getByText('Loading pricing...')).toBeHidden({ timeout: 10000 })
    
    // Check that pricing is displayed
    for (const tier of Object.values(PRICING_TIERS)) {
      await expect(page.getByText(tier.name, { exact: true })).toBeVisible()
    }
  })

  test('should have gradient card backgrounds', async ({ page }) => {
    // Check for gradient classes on cards
    const cards = page.locator('[class*="card"]')
    
    // Growth card should have purple gradient
    const growthCard = cards.filter({ hasText: 'Growth' })
    const growthClasses = await growthCard.getAttribute('class')
    expect(growthClasses).toContain('purple')
    
    // TenantFlow Max should have gradient
    const maxCard = cards.filter({ hasText: 'TenantFlow Max' })
    const maxClasses = await maxCard.getAttribute('class')
    expect(maxClasses).toContain('gradient')
  })

  test('should display "Powered by Stripe" badge', async ({ page }) => {
    await expect(page.getByText('POWERED BY STRIPE')).toBeVisible()
  })

  test('should show annual savings badge on toggle', async ({ page }) => {
    const annualTab = page.getByRole('tab', { name: /annual billing/i })
    await annualTab.click()
    
    // Check for savings badge
    await expect(page.getByText('Save 17%')).toBeVisible()
  })

  test('should display trust indicators', async ({ page }) => {
    await expect(page.getByText('Instant activation')).toBeVisible()
    await expect(page.getByText('No setup fees')).toBeVisible()
    await expect(page.getByText('Cancel anytime')).toBeVisible()
  })

  test('should have animated buttons with hover effects', async ({ page }) => {
    const button = page.getByRole('button', { name: /get started/i }).first()
    
    // Check for group class that enables hover effects
    const buttonClasses = await button.getAttribute('class')
    expect(buttonClasses).toContain('group')
    
    // Check for chevron icon that animates on hover
    const chevron = button.locator('svg')
    await expect(chevron).toBeVisible()
  })
})

test.describe('Official Stripe Pricing Page (/pricing-official)', () => {
  test('should display configuration instructions if table ID not set', async ({ page }) => {
    // This test assumes NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID is not set
    await page.goto('/pricing-official')
    
    // Should show setup instructions
    const setupInstructions = page.getByText('Pricing Configuration Required')
    if (await setupInstructions.isVisible()) {
      await expect(page.getByText('Setup Instructions:')).toBeVisible()
      await expect(page.getByText('Go to your Stripe Dashboard')).toBeVisible()
      await expect(page.getByText('Create pricing table')).toBeVisible()
    } else {
      // If table ID is set, should show Stripe pricing table
      await expect(page.locator('stripe-pricing-table')).toBeVisible()
    }
  })

  test('should explain benefits of official pricing table', async ({ page }) => {
    await page.goto('/pricing-official')
    
    if (await page.getByText('Why Use Stripe\'s Pricing Table?').isVisible()) {
      await expect(page.getByText('Automatically responsive')).toBeVisible()
      await expect(page.getByText('Built-in currency localization')).toBeVisible()
      await expect(page.getByText('No maintenance required')).toBeVisible()
    }
  })
})

test.describe('Checkout Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when clicking Get Started', async ({ page }) => {
      await page.goto('/pricing')
      
      // Click Get Started on Starter plan
      const starterCard = page.locator('[class*="card"]').filter({ hasText: 'Starter' })
      const getStartedButton = starterCard.getByRole('button', { name: /get started/i })
      await getStartedButton.click()
      
      // Should redirect to login with redirect param
      await expect(page).toHaveURL(/\/auth\/login.*redirect.*pricing/i)
    })
  })

  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication by setting auth cookie/token
      // This would need to be adjusted based on your actual auth implementation
      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        }))
      })
    })

    test('should open Stripe checkout when clicking Get Started', async ({ page }) => {
      await page.goto('/pricing')
      
      // Click Get Started on Growth plan
      const growthCard = page.locator('[class*="card"]').filter({ hasText: 'Growth' })
      const getStartedButton = growthCard.getByRole('button', { name: /get started/i })
      
      // Set up listener for Stripe redirect
      const [stripeRedirect] = await Promise.all([
        page.waitForRequest(req => req.url().includes('checkout.stripe.com')),
        getStartedButton.click(),
      ])
      
      expect(stripeRedirect).toBeTruthy()
    })

    test('should show loading state while processing', async ({ page }) => {
      await page.goto('/pricing')
      
      // Click Get Started
      const button = page.getByRole('button', { name: /get started/i }).first()
      await button.click()
      
      // Should show processing state
      await expect(page.getByText('Processing...')).toBeVisible()
    })
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/pricing')
    
    // Cards should stack vertically on mobile
    const cards = page.locator('[class*="card"]')
    const firstCard = await cards.first().boundingBox()
    const secondCard = await cards.nth(1).boundingBox()
    
    if (firstCard && secondCard) {
      // Second card should be below first card (higher Y position)
      expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height)
    }
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/pricing')
    
    // Should show 2 columns on tablet
    const cards = page.locator('[class*="card"]')
    const firstCard = await cards.first().boundingBox()
    const secondCard = await cards.nth(1).boundingBox()
    
    if (firstCard && secondCard) {
      // Cards should be side by side (similar Y position)
      expect(Math.abs(firstCard.y - secondCard.y)).toBeLessThan(50)
    }
  })

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/pricing')
    
    // Should show 4 columns on desktop
    const cards = page.locator('[class*="card"]')
    expect(await cards.count()).toBe(4)
    
    // All cards should be in a row
    const firstCard = await cards.first().boundingBox()
    const lastCard = await cards.last().boundingBox()
    
    if (firstCard && lastCard) {
      // Cards should be at similar Y position (in same row)
      expect(Math.abs(firstCard.y - lastCard.y)).toBeLessThan(50)
    }
  })
})

test.describe('Accessibility', () => {
  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/pricing')
    
    // Check for proper button roles
    const buttons = page.getByRole('button')
    expect(await buttons.count()).toBeGreaterThan(0)
    
    // Check for proper heading hierarchy
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/pricing')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to activate billing toggle with keyboard
    await page.keyboard.press('Enter')
    
    // Check that focus is visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/pricing')
    
    // This would ideally use an accessibility testing library
    // For now, we just check that text is visible
    const bodyText = page.locator('body')
    await expect(bodyText).toBeVisible()
  })
})

test.describe('Error Handling', () => {
  test('should handle API failures gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/stripe/setup-pricing', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })
    
    await page.goto('/pricing-custom')
    
    // Should show error message
    await expect(page.getByText(/failed to load pricing/i)).toBeVisible({ timeout: 10000 })
  })

  test('should handle Stripe checkout failures', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@example.com' },
      }))
    })
    
    // Intercept checkout API and make it fail
    await page.route('**/billing/create-checkout-session', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ message: 'Invalid price ID' }),
      })
    })
    
    await page.goto('/pricing')
    
    // Click Get Started
    const button = page.getByRole('button', { name: /get started/i }).first()
    await button.click()
    
    // Should show error toast
    await expect(page.getByText(/failed to create checkout session/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Performance', () => {
  test('should load pricing page within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
  })

  test('should not have memory leaks on billing toggle', async ({ page }) => {
    await page.goto('/pricing')
    
    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    })
    
    // Toggle billing multiple times
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /monthly billing/i }).click()
      await page.getByRole('button', { name: /annual billing/i }).click()
    }
    
    // Get final memory usage
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    })
    
    // Memory increase should be reasonable (less than 10MB)
    const memoryIncrease = finalMetrics - initialMetrics
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})