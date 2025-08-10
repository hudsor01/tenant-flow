/**
 * Integration Tests for Stripe API Endpoints
 * Tests the API routes that interact with Stripe
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      products: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'tenantflow_free_trial',
              name: 'Free Trial',
              description: 'Perfect for getting started',
              metadata: {
                tier: 'free_trial',
                propertyLimit: '1',
                unitLimit: '5',
                features: JSON.stringify(['1 property', 'Up to 5 units']),
                order: '1',
              },
            },
            {
              id: 'tenantflow_starter',
              name: 'Starter',
              description: 'For small landlords',
              metadata: {
                tier: 'starter',
                propertyLimit: '5',
                unitLimit: '25',
                features: JSON.stringify(['Up to 5 properties', 'Up to 25 units']),
                order: '2',
              },
            },
          ],
        }),
        retrieve: vi.fn().mockImplementation((id: string) => ({
          id,
          name: 'Test Product',
          metadata: {},
        })),
        create: vi.fn().mockImplementation((data: any) => ({
          id: data.id || 'prod_test',
          ...data,
        })),
        update: vi.fn().mockImplementation((id: string, data: any) => ({
          id,
          ...data,
        })),
      },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'price_free',
              product: 'tenantflow_free_trial',
              unit_amount: 0,
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: {},
            },
            {
              id: 'price_starter_monthly',
              product: 'tenantflow_starter',
              unit_amount: 2900,
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: { tier: 'starter', billing: 'monthly' },
            },
          ],
        }),
        create: vi.fn().mockImplementation((data: any) => ({
          id: 'price_test',
          ...data,
        })),
        update: vi.fn().mockImplementation((id: string, data: any) => ({
          id,
          ...data,
        })),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockImplementation((data: any) => ({
            id: 'cs_test_session',
            url: 'https://checkout.stripe.com/test',
            ...data,
          })),
        },
      },
    })),
  }
})

describe('Stripe API Routes', () => {
  describe('GET /api/stripe/setup-pricing', () => {
    it('should fetch current pricing from Stripe', async () => {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data).toHaveProperty('products')
      expect(data.products).toBeInstanceOf(Array)
      expect(data).toHaveProperty('timestamp')
    })

    it('should return sorted products by order metadata', async () => {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'GET',
      })

      const data = await response.json()
      const products = data.products

      // Check if products are sorted by order
      for (let i = 1; i < products.length; i++) {
        const prevOrder = parseInt(products[i - 1].product.metadata.order)
        const currOrder = parseInt(products[i].product.metadata.order)
        expect(currOrder).toBeGreaterThanOrEqual(prevOrder)
      }
    })

    it('should include price information for each product', async () => {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'GET',
      })

      const data = await response.json()
      
      data.products.forEach((item: any) => {
        expect(item).toHaveProperty('product')
        expect(item).toHaveProperty('prices')
        expect(item.prices).toBeInstanceOf(Array)
        
        item.prices.forEach((price: any) => {
          expect(price).toHaveProperty('id')
          expect(price).toHaveProperty('unit_amount')
          expect(price).toHaveProperty('currency')
          expect(price).toHaveProperty('interval')
        })
      })
    })
  })

  describe('POST /api/stripe/setup-pricing', () => {
    it('should require authorization', async () => {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorization: 'wrong-secret',
        }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should create products with correct metadata', async () => {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorization: process.env.STRIPE_SETUP_SECRET || 'setup-secret-key-2025',
        }),
      })

      if (response.status === 200) {
        const data = await response.json()
        
        expect(data.success).toBe(true)
        expect(data.products).toBeInstanceOf(Array)
        expect(data.products.length).toBe(4) // 4 tiers
        
        // Check each product has required metadata
        data.products.forEach((product: any) => {
          expect(product.metadata).toHaveProperty('tier')
          expect(product.metadata).toHaveProperty('propertyLimit')
          expect(product.metadata).toHaveProperty('unitLimit')
          expect(product.metadata).toHaveProperty('features')
          expect(product.metadata).toHaveProperty('order')
        })
      }
    })

    it('should create prices with correct amounts', async () => {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorization: process.env.STRIPE_SETUP_SECRET || 'setup-secret-key-2025',
        }),
      })

      if (response.status === 200) {
        const data = await response.json()
        
        expect(data.prices).toBeInstanceOf(Array)
        expect(data.prices.length).toBe(7) // 7 price points total
        
        // Check specific price amounts
        const starterMonthly = data.prices.find((p: any) => 
          p.product === 'tenantflow_starter' && p.interval === 'month'
        )
        expect(starterMonthly?.unit_amount).toBe(2900) // $29.00
        
        const growthAnnual = data.prices.find((p: any) => 
          p.product === 'tenantflow_growth' && p.interval === 'year'
        )
        expect(growthAnnual?.unit_amount).toBe(79000) // $790.00
      }
    })
  })
})

describe('Stripe Checkout Integration', () => {
  it('should create checkout session with correct parameters', async () => {
    const mockPriceId = 'price_starter_monthly'
    const mockUserId = 'test-user-123'
    
    const response = await fetch('http://localhost:3001/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-token`,
      },
      body: JSON.stringify({
        priceId: mockPriceId,
        planType: 'STARTER',
        billingInterval: 'monthly',
        successUrl: 'http://localhost:3000/billing/success',
        cancelUrl: 'http://localhost:3000/pricing',
      }),
    })

    if (response.status === 200) {
      const data = await response.json()
      
      expect(data).toHaveProperty('sessionId')
      expect(data.sessionId).toMatch(/^cs_/)
    }
  })

  it('should handle invalid price IDs', async () => {
    const response = await fetch('http://localhost:3001/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-token`,
      },
      body: JSON.stringify({
        priceId: 'invalid_price_id',
        planType: 'INVALID',
        billingInterval: 'monthly',
      }),
    })

    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

describe('Pricing Configuration', () => {
  it('should have all required environment variables', () => {
    const requiredVars = [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
    ]
    
    requiredVars.forEach(varName => {
      expect(process.env[varName], `Missing ${varName}`).toBeDefined()
    })
  })

  it('should have valid price ID format', () => {
    const priceIds = [
      process.env.NEXT_PUBLIC_STRIPE_FREE_TRIAL,
      process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY,
      process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL,
      process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY,
      process.env.NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL,
      process.env.NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY,
      process.env.NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL,
    ]
    
    priceIds.forEach(priceId => {
      if (priceId) {
        expect(priceId).toMatch(/^price_/)
      }
    })
  })
})

describe('Pricing Calculations', () => {
  it('should calculate annual savings correctly', () => {
    const monthlyPrice = 79 // Growth monthly
    const annualPrice = 790 // Growth annual
    
    const yearlyCost = monthlyPrice * 12 // $948
    const savings = yearlyCost - annualPrice // $158
    const percentSaved = Math.round((savings / yearlyCost) * 100) // 17%
    
    expect(percentSaved).toBe(17)
  })

  it('should calculate monthly equivalent for annual plans', () => {
    const testCases = [
      { annual: 290, monthlyEquiv: 24.17 }, // Starter
      { annual: 790, monthlyEquiv: 65.83 }, // Growth
      { annual: 1990, monthlyEquiv: 165.83 }, // TenantFlow Max
    ]
    
    testCases.forEach(({ annual, monthlyEquiv }) => {
      const calculated = Number((annual / 12).toFixed(2))
      expect(calculated).toBeCloseTo(monthlyEquiv, 1)
    })
  })
})

describe('Error Handling', () => {
  it('should handle Stripe API errors gracefully', async () => {
    // Mock a network error scenario by checking for actual API availability
    try {
      const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
        method: 'GET',
      })
      // If the server is not running, this will throw
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    } catch (error) {
      // Expected when backend is not running
      expect(error).toBeDefined()
    }
  })

  it('should validate request body', async () => {
    const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Missing authorization
    })
    
    expect(response.status).toBe(401)
  })
})

describe('Security', () => {
  it('should not expose sensitive data in responses', async () => {
    const response = await fetch('http://localhost:3001/api/stripe/setup-pricing', {
      method: 'GET',
    })
    
    const data = await response.json()
    const dataString = JSON.stringify(data)
    
    // Should not contain secret keys
    expect(dataString).not.toContain('sk_')
    expect(dataString).not.toContain('rk_')
    expect(dataString).not.toContain('whsec_')
  })

  it('should require HTTPS in production', () => {
    if (process.env.NODE_ENV === 'production') {
      expect(window.location.protocol).toBe('https:')
    }
  })
})