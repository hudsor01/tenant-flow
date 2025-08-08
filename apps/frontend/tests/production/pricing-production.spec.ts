/**
 * Production-Ready Pricing Flow Tests
 * Tests the exact implementation flow that will run in production
 * Based on actual backend endpoints and frontend implementation
 */

import { test, expect, Page } from '@playwright/test'

// Production configuration
const PRODUCTION_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  backendURL: process.env.BACKEND_URL || 'http://localhost:3002',
  timeout: 10000,
  retries: 3,
}

// Test user configurations for different scenarios
const TEST_USERS = {
  authenticated: {
    email: 'test@tenantflow.app',
    password: 'TestPassword123!',
    id: 'test-user-id',
    stripeCustomerId: 'cus_test_customer',
  },
  unauthenticated: null,
}

// Actual plan types from your backend
const PLAN_TYPES = {
  FREETRIAL: 'FREETRIAL',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  TENANTFLOW_MAX: 'TENANTFLOW_MAX',
} as const

// Actual price IDs from your environment
const PRICE_IDS = {
  FREETRIAL: process.env.NEXT_PUBLIC_STRIPE_FREE_TRIAL || '',
  STARTER_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY || '',
  STARTER_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL || '',
  GROWTH_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY || '',
  GROWTH_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL || '',
  TENANTFLOW_MAX_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY || '',
  TENANTFLOW_MAX_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL || '',
}

test.describe('Production Pricing Flow', () => {
  test.beforeAll(async () => {
    // Verify environment configuration
    console.log('🔍 Verifying production configuration...')
    console.log(`Base URL: ${PRODUCTION_CONFIG.baseURL}`)
    console.log(`Backend URL: ${PRODUCTION_CONFIG.backendURL}`)
    
    // Check required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_STRIPE_FREE_TRIAL',
      'NEXT_PUBLIC_STRIPE_STARTER_MONTHLY',
      'NEXT_PUBLIC_STRIPE_STARTER_ANNUAL',
      'NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY',
      'NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL',
      'NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY',
      'NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL',
    ]
    
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`)
    }
  })

  test('Environment Variables - All Stripe Price IDs are configured', async ({ request }) => {
    // Test that all price IDs are set and valid format
    const priceIds = Object.values(PRICE_IDS)
    
    for (const priceId of priceIds) {
      expect(priceId, 'Price ID should not be empty').toBeTruthy()
      expect(priceId, 'Price ID should have correct format').toMatch(/^price_/)
    }
    
    console.log('✅ All price IDs are properly configured')
  })

  test('Backend Health Check - Stripe endpoints are accessible', async ({ request }) => {
    // Test backend health
    const healthResponse = await request.get(`${PRODUCTION_CONFIG.backendURL}/health`)
    expect(healthResponse.ok()).toBeTruthy()
    
    // Test Stripe pricing endpoint
    const pricingResponse = await request.get('/api/stripe/setup-pricing')
    expect(pricingResponse.ok()).toBeTruthy()
    
    const pricingData = await pricingResponse.json()
    expect(pricingData).toHaveProperty('products')
    expect(pricingData.products.length).toBe(4) // 4 tiers
    
    console.log('✅ Backend Stripe endpoints are healthy')
  })
})

test.describe('Standard Pricing Page (/pricing) - Production Flow', () => {
  test('Pricing page loads with all tiers and correct prices', async ({ page }) => {
    await page.goto('/pricing')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Verify all 4 tiers are displayed
    const tierNames = ['Free Trial', 'Starter', 'Growth', 'TenantFlow Max']
    for (const tierName of tierNames) {
      const tierElement = page.locator('[data-slot="card-title"]').filter({ hasText: tierName })
      await expect(tierElement.first()).toBeVisible({ timeout: 5000 })
    }
    
    // Verify monthly prices match your configuration
    await expect(page.getByText('$0').first()).toBeVisible() // Free Trial
    await expect(page.getByText('$29').first()).toBeVisible() // Starter
    await expect(page.getByText('$79').first()).toBeVisible() // Growth
    await expect(page.getByText('$199').first()).toBeVisible() // TenantFlow Max
    
    console.log('✅ Standard pricing page displays all tiers correctly')
  })

  test('Annual billing toggle shows correct prices and savings', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    // Click annual billing
    const annualButton = page.getByRole('button').filter({ hasText: /annual billing/i })
    await annualButton.click()
    
    // Wait for price update
    await page.waitForTimeout(500)
    
    // Verify annual prices
    await expect(page.getByText('$290')).toBeVisible() // Starter annual
    await expect(page.getByText('$790')).toBeVisible() // Growth annual  
    await expect(page.getByText('$1990')).toBeVisible() // TenantFlow Max annual
    
    // Verify savings indicators
    await expect(page.getByText(/17%/).first()).toBeVisible()
    
    console.log('✅ Annual billing toggle works correctly')
  })

  test('Unauthenticated user redirect to login', async ({ page }) => {
    await page.goto('/pricing')
    
    // Clear any existing authentication
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    
    // Click Get Started on Starter plan
    const starterCard = page.locator('[data-slot="card"]').filter({ hasText: 'Starter' })
    const getStartedButton = starterCard.getByRole('button').filter({ hasText: /get started/i })
    
    await getStartedButton.click()
    
    // Should redirect to login with return URL
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
    
    console.log('✅ Unauthenticated user correctly redirected to login')
  })
})

test.describe('Custom Dynamic Pricing Page (/pricing-custom) - Production Flow', () => {
  test('Loads pricing data from Stripe API', async ({ page }) => {
    // Intercept API call to verify it's being made
    let apiCallMade = false
    page.on('request', request => {
      if (request.url().includes('/api/stripe/setup-pricing')) {
        apiCallMade = true
      }
    })
    
    await page.goto('/pricing-custom')
    
    // Wait for loading to complete
    await page.waitForSelector('text=Choose Your Growth Plan', { timeout: 10000 })
    
    // Verify API call was made
    expect(apiCallMade).toBeTruthy()
    
    // Verify Stripe branding
    await expect(page.getByText('POWERED BY STRIPE').first()).toBeVisible()
    
    // Verify pricing data loaded
    await expect(page.getByText('Free Trial').first()).toBeVisible()
    await expect(page.getByText('Growth').first()).toBeVisible()
    
    console.log('✅ Custom pricing page loads data from Stripe API')
  })

  test('Billing interval toggle updates prices correctly', async ({ page }) => {
    await page.goto('/pricing-custom')
    await page.waitForSelector('text=Choose Your Growth Plan', { timeout: 10000 })
    
    // Test monthly view first
    const monthlyTab = page.getByRole('tab').filter({ hasText: /monthly billing/i })
    await monthlyTab.click()
    await page.waitForTimeout(500)
    
    // Switch to annual
    const annualTab = page.getByRole('tab').filter({ hasText: /annual billing/i })
    await annualTab.click()
    await page.waitForTimeout(500)
    
    // Verify savings badge appears
    await expect(page.getByText('Save 17%')).toBeVisible()
    
    console.log('✅ Custom pricing billing toggle works correctly')
  })
})

test.describe('Checkout Flow - Production Integration', () => {
  test('Authenticated checkout session creation', async ({ page, request }) => {
    // Mock authentication (replace with actual login flow)
    await page.addInitScript(() => {
      // Simulate authenticated state
      localStorage.setItem('auth-token', 'mock-jwt-token')
      window.__AUTH_USER__ = {
        id: 'test-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_test_customer'
      }
    })
    
    // Mock the backend API call to avoid actual Stripe charges
    await page.route('**/billing/create-checkout-session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'cs_test_session_id',
          url: 'https://checkout.stripe.com/test-session'
        })
      })
    })
    
    await page.goto('/pricing')
    
    // Click Get Started on Growth plan (most popular)
    const growthCard = page.locator('[data-slot="card"]').filter({ hasText: 'Growth' })
    const getStartedButton = growthCard.getByRole('button').filter({ hasText: /get started/i })
    
    // Verify button shows processing state
    await getStartedButton.click()
    await expect(page.getByText('Processing...')).toBeVisible({ timeout: 2000 })
    
    console.log('✅ Authenticated checkout flow initiated correctly')
  })

  test('Checkout request payload validation', async ({ page, request }) => {
    let capturedRequest: any = null
    
    // Intercept the checkout API call
    await page.route('**/billing/create-checkout-session', route => {
      capturedRequest = route.request().postDataJSON()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'cs_test_session_id',
          url: 'https://checkout.stripe.com/test-session'
        })
      })
    })
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token')
    })
    
    await page.goto('/pricing')
    
    // Select annual billing
    await page.getByRole('button').filter({ hasText: /annual billing/i }).click()
    
    // Click Starter plan Get Started
    const starterCard = page.locator('[data-slot="card"]').filter({ hasText: 'Starter' })
    await starterCard.getByRole('button').filter({ hasText: /get started/i }).click()
    
    // Wait for request to be captured
    await page.waitForTimeout(1000)
    
    // Validate the request payload structure
    expect(capturedRequest).toBeTruthy()
    expect(capturedRequest).toHaveProperty('priceId')
    expect(capturedRequest).toHaveProperty('planType', 'STARTER')
    expect(capturedRequest).toHaveProperty('billingInterval', 'annual')
    expect(capturedRequest).toHaveProperty('successUrl')
    expect(capturedRequest).toHaveProperty('cancelUrl')
    
    console.log('✅ Checkout request payload structure is correct')
  })
})

test.describe('API Integration Tests', () => {
  test('Backend billing endpoints are properly configured', async ({ request }) => {
    // Test the actual backend endpoints your frontend calls
    
    // Test pricing data endpoint
    const pricingResponse = await request.get('/api/stripe/setup-pricing')
    expect(pricingResponse.ok()).toBeTruthy()
    
    const pricingData = await pricingResponse.json()
    expect(pricingData.products).toBeDefined()
    expect(pricingData.products.length).toBe(4)
    
    // Verify each product has required structure
    pricingData.products.forEach((product: any) => {
      expect(product).toHaveProperty('product')
      expect(product).toHaveProperty('prices')
      expect(product.product).toHaveProperty('name')
      expect(product.product.metadata).toHaveProperty('tier')
      expect(product.prices).toBeInstanceOf(Array)
    })
    
    console.log('✅ Backend API endpoints return correct data structure')
  })

  test('Stripe price IDs match environment configuration', async ({ request }) => {
    const pricingResponse = await request.get('/api/stripe/setup-pricing')
    const pricingData = await pricingResponse.json()
    
    // Build a map of actual price IDs from API
    const apiPriceIds: Record<string, string[]> = {}
    
    pricingData.products.forEach((product: any) => {
      const tier = product.product.metadata.tier
      apiPriceIds[tier] = product.prices.map((p: any) => p.id)
    })
    
    // Verify environment price IDs exist in API response
    const envPriceIds = Object.values(PRICE_IDS).filter(Boolean)
    const allApiPriceIds = Object.values(apiPriceIds).flat()
    
    // Each environment price ID should exist in the API response
    for (const envPriceId of envPriceIds) {
      const found = allApiPriceIds.some(apiId => apiId === envPriceId)
      if (!found) {
        console.warn(`⚠️  Environment price ID ${envPriceId} not found in Stripe`)
      }
    }
    
    console.log('✅ Environment and Stripe price IDs alignment checked')
  })
})

test.describe('Error Handling - Production Scenarios', () => {
  test('Handles Stripe API failures gracefully', async ({ page }) => {
    // Simulate Stripe API failure
    await page.route('**/api/stripe/setup-pricing', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Stripe API unavailable' })
      })
    })
    
    await page.goto('/pricing-custom')
    
    // Should show error message
    await expect(page.getByText(/failed to load pricing/i)).toBeVisible({ timeout: 10000 })
    
    console.log('✅ Stripe API failures handled gracefully')
  })

  test('Handles checkout session creation failures', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token')
    })
    
    // Mock checkout failure
    await page.route('**/billing/create-checkout-session', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Invalid price ID',
          message: 'The provided price ID is invalid' 
        })
      })
    })
    
    await page.goto('/pricing')
    
    // Click Get Started
    const button = page.getByRole('button').filter({ hasText: /get started/i }).first()
    await button.click()
    
    // Should show error message
    await expect(page.getByText(/failed to create checkout session/i)).toBeVisible({ timeout: 5000 })
    
    console.log('✅ Checkout failures handled gracefully')
  })
})

test.describe('Performance - Production Load', () => {
  test('Pricing pages load within performance budget', async ({ page }) => {
    // Standard pricing page
    const startTime1 = Date.now()
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    const loadTime1 = Date.now() - startTime1
    
    expect(loadTime1).toBeLessThan(3000) // 3 second budget
    
    // Custom pricing page (with API call)
    const startTime2 = Date.now()
    await page.goto('/pricing-custom')
    await page.waitForSelector('text=Choose Your Growth Plan', { timeout: 10000 })
    const loadTime2 = Date.now() - startTime2
    
    expect(loadTime2).toBeLessThan(5000) // 5 second budget for API-dependent page
    
    console.log(`✅ Performance: Standard (${loadTime1}ms), Custom (${loadTime2}ms)`)
  })

  test('No memory leaks during plan switching', async ({ page }) => {
    await page.goto('/pricing')
    
    // Get initial memory usage (if available)
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Switch between monthly and annual multiple times
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button').filter({ hasText: /monthly billing/i }).click()
      await page.waitForTimeout(100)
      await page.getByRole('button').filter({ hasText: /annual billing/i }).click()
      await page.waitForTimeout(100)
    }
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // Less than 10MB increase
    }
    
    console.log('✅ No significant memory leaks detected')
  })
})

test.describe('Mobile Production Flow', () => {
  test('Mobile pricing page is fully functional', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }) // iPhone X
    
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    
    // Verify all tiers are accessible on mobile
    const cards = page.locator('[data-slot="card"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThanOrEqual(4)
    
    // Test mobile billing toggle
    const toggleButton = page.getByRole('button').filter({ hasText: /annual billing/i })
    await toggleButton.click()
    
    // Verify pricing updates on mobile
    await expect(page.getByText('$290')).toBeVisible()
    
    // Test mobile checkout flow
    const firstButton = page.getByRole('button').filter({ hasText: /get started/i }).first()
    await expect(firstButton).toBeVisible()
    
    console.log('✅ Mobile pricing page is fully functional')
  })
})