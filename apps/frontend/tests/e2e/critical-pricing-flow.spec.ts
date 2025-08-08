/**
 * Critical Pricing Flow Tests
 * Focused test suite for the most important pricing functionality
 */

import { test, expect } from '@playwright/test'

test.describe('Critical Pricing Flow', () => {
  test('Complete pricing page journey', async ({ page }) => {
    // 1. Navigate to standard pricing page
    await page.goto('/pricing')
    await expect(page).toHaveURL('/pricing')
    
    // 2. Verify all tiers are displayed (use first match for each)
    await expect(page.getByText('Free Trial').first()).toBeVisible()
    await expect(page.getByText('Starter').first()).toBeVisible()
    await expect(page.getByText('Growth').first()).toBeVisible()
    await expect(page.getByText('TenantFlow Max').first()).toBeVisible()
    
    // 3. Verify monthly prices
    await expect(page.getByText('$0').first()).toBeVisible()
    await expect(page.getByText('$29').first()).toBeVisible()
    await expect(page.getByText('$79').first()).toBeVisible()
    await expect(page.getByText('$199').first()).toBeVisible()
    
    // 4. Switch to annual billing
    await page.getByRole('button', { name: /annual billing/i }).click()
    
    // 5. Verify annual prices appear
    await expect(page.getByText('$290')).toBeVisible()
    await expect(page.getByText('$790')).toBeVisible()
    await expect(page.getByText('$1990')).toBeVisible()
    
    // 6. Verify savings badge
    await expect(page.getByText(/17%/)).toBeVisible()
    
    console.log('✅ Standard pricing page tests passed')
  })

  test('Custom pricing page with API', async ({ page }) => {
    // 1. Navigate to custom pricing
    await page.goto('/pricing-custom')
    
    // 2. Wait for API data to load
    await page.waitForSelector('text=Choose Your Growth Plan', { timeout: 10000 })
    
    // 3. Verify Stripe branding (use first match)
    await expect(page.getByText('POWERED BY STRIPE').first()).toBeVisible()
    
    // 4. Test billing toggle
    await page.getByRole('tab', { name: /annual billing/i }).click()
    await expect(page.getByText('Save 17%')).toBeVisible()
    
    // 5. Verify gradient cards (check classes)
    const growthCard = page.locator('[class*="card"]').filter({ hasText: 'Growth' })
    const cardClass = await growthCard.getAttribute('class')
    expect(cardClass).toContain('purple')
    
    console.log('✅ Custom pricing page tests passed')
  })

  test('Checkout redirect for unauthenticated user', async ({ page }) => {
    // 1. Go to pricing page
    await page.goto('/pricing')
    
    // 2. Click Get Started on Starter plan
    const starterCard = page.locator('[class*="card"]').filter({ hasText: 'Starter' })
    const getStartedButton = starterCard.getByRole('button', { name: /get started/i })
    await getStartedButton.click()
    
    // 3. Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/)
    
    console.log('✅ Authentication redirect tests passed')
  })

  test('Responsive layout verification', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/pricing')
    
    // Cards should stack vertically (filter to only pricing cards)
    const cards = page.locator('[class*="card"]').filter({ 
      has: page.locator('button:has-text("Get Started"), button:has-text("Start Free Trial")') 
    })
    const cardCount = await cards.count()
    expect(cardCount).toBe(4)
    
    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.reload()
    
    // Verify cards are in a row
    const firstCard = await cards.first().boundingBox()
    const lastCard = await cards.last().boundingBox()
    
    if (firstCard && lastCard) {
      // On desktop, cards should be at similar Y position
      const yDifference = Math.abs(firstCard.y - lastCard.y)
      expect(yDifference).toBeLessThan(100)
    }
    
    console.log('✅ Responsive layout tests passed')
  })

  test('FAQ interaction', async ({ page }) => {
    await page.goto('/pricing')
    
    // Scroll to FAQ section
    await page.getByText('Frequently Asked Questions').scrollIntoViewIfNeeded()
    
    // Click FAQ item to expand
    const faqItem = page.getByText('Can I change plans anytime?')
    await faqItem.click()
    
    // Verify answer is visible
    await expect(page.getByText(/upgrade or downgrade your plan at any time/i)).toBeVisible()
    
    console.log('✅ FAQ interaction tests passed')
  })

  test('Performance check', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    console.log(`✅ Page loaded in ${loadTime}ms`)
  })
})

test.describe('Stripe Integration', () => {
  test('API endpoint returns pricing data', async ({ request }) => {
    const response = await request.get('/api/stripe/setup-pricing')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('products')
    expect(Array.isArray(data.products)).toBeTruthy()
    
    // Should have 4 products
    expect(data.products.length).toBe(4)
    
    // Verify product structure
    data.products.forEach((product: any) => {
      expect(product).toHaveProperty('product')
      expect(product).toHaveProperty('prices')
      expect(product.product).toHaveProperty('name')
      expect(product.product).toHaveProperty('metadata')
    })
    
    console.log('✅ Stripe API tests passed')
  })
})

test.describe('Visual Elements', () => {
  test('Trust badges are displayed', async ({ page }) => {
    await page.goto('/pricing')
    
    const trustBadges = [
      'No setup fees',
      'Cancel anytime',
      'Secure payment via Stripe',
    ]
    
    for (const badge of trustBadges) {
      await expect(page.getByText(badge)).toBeVisible()
    }
    
    console.log('✅ Trust badges tests passed')
  })

  test('Support levels are shown', async ({ page }) => {
    await page.goto('/pricing')
    
    const supportLevels = [
      'Email',
      'Priority Email',
      'Phone & Email',
      '24/7 Dedicated',
    ]
    
    for (const level of supportLevels) {
      await expect(page.getByText(level).first()).toBeVisible()
    }
    
    console.log('✅ Support levels tests passed')
  })

  test('Most popular badge on Growth plan', async ({ page }) => {
    await page.goto('/pricing')
    
    const growthCard = page.locator('[class*="card"]').filter({ hasText: 'Growth' })
    await expect(growthCard.getByText(/MOST POPULAR/i)).toBeVisible()
    
    console.log('✅ Popular badge tests passed')
  })
})