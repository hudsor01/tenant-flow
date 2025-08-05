import { PrismaClient } from '@repo/database'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { TestingModule, Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { Browser, Page, BrowserContext } from '@playwright/test'
import Stripe from 'stripe'

/**
 * Test Helpers and Utilities
 * Provides common functionality for test setup and execution
 */

// Database Test Helpers
export class DatabaseTestHelper {
  private static prisma = new PrismaClient()

  static async cleanDatabase(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ')

    try {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`)
    } catch (error) {
      console.log({ error })
    }
  }

  static async resetAutoIncrement(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await this.prisma.$executeRawUnsafe(
          `ALTER SEQUENCE IF EXISTS "${tablename}_id_seq" RESTART WITH 1;`
        )
      }
    }
  }

  static async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// JWT Test Helpers
export class JwtTestHelper {
  private jwtService: JwtService

  constructor(secret: string = 'test-secret') {
    this.jwtService = new JwtService({ secret })
  }

  generateToken(payload: Record<string, any>, options?: { expiresIn?: string }): string {
    return this.jwtService.sign(payload, options)
  }

  generateExpiredToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload, { expiresIn: '-1h' })
  }

  generateUserToken(userId: string, role: string = 'OWNER'): string {
    return this.generateToken({
      sub: userId,
      email: `test-${userId}@tenantflow.app`,
      role
    })
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token)
  }
}

// API Test Helpers
export class ApiTestHelper {
  private app: INestApplication
  private jwtHelper: JwtTestHelper

  constructor(app: INestApplication) {
    this.app = app
    this.jwtHelper = new JwtTestHelper()
  }

  createAuthHeaders(userId: string, role: string = 'OWNER'): Record<string, string> {
    const token = this.jwtHelper.generateUserToken(userId, role)
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  createUnauthenticatedHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    }
  }

  async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      headers?: Record<string, string>
      body?: any
      query?: Record<string, string>
    } = {}
  ): Promise<any> {
    const request = this.app.getHttpAdapter().request

    let url = path
    if (options.query) {
      const searchParams = new URLSearchParams(options.query)
      url += `?${searchParams.toString()}`
    }

    return request[method.toLowerCase()](url)
      .set(options.headers || {})
      .send(options.body)
  }

  async authenticatedRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    userId: string,
    options: {
      body?: any
      query?: Record<string, string>
      role?: string
    } = {}
  ): Promise<any> {
    return this.makeRequest(method, path, {
      headers: this.createAuthHeaders(userId, options.role),
      body: options.body,
      query: options.query
    })
  }
}

// Stripe Test Helpers
export class StripeTestHelper {
  private stripe: Stripe

  constructor(secretKey?: string) {
    this.stripe = new Stripe(secretKey || process.env.STRIPE_SECRET_KEY_TEST!, {
      apiVersion: '2024-09-30.acacia'
    })
  }

  async createTestCustomer(email: string = 'test@tenantflow.app'): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email,
      name: 'Test Customer',
      metadata: { test: 'true' }
    })
  }

  async createTestPrice(amount: number = 2999): Promise<Stripe.Price> {
    const product = await this.stripe.products.create({
      name: 'Test Product',
      metadata: { test: 'true' }
    })

    return await this.stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { test: 'true' }
    })
  }

  async createTestSubscription(
    customerId: string,
    priceId: string,
    options: { trial_period_days?: number } = {}
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: options.trial_period_days,
      metadata: { test: 'true' }
    })
  }

  async createTestPaymentMethod(customerId: string): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa' // Stripe test token
      }
    })

    await this.stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId
    })

    return paymentMethod
  }

  async simulateWebhookEvent(
    type: string,
    data: any,
    secret: string = process.env.STRIPE_WEBHOOK_SECRET_TEST!
  ): Promise<Stripe.Event> {
    const event = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type,
      data: { object: data },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null }
    }

    return event as Stripe.Event
  }

  async cleanupTestData(): Promise<void> {
    // Clean up test customers
    const customers = await this.stripe.customers.list({
      limit: 100
    })

    for (const customer of customers.data) {
      if (customer.metadata?.test === 'true') {
        await this.stripe.customers.del(customer.id)
      }
    }

    // Clean up test products
    const products = await this.stripe.products.list({
      limit: 100
    })

    for (const product of products.data) {
      if (product.metadata?.test === 'true') {
        await this.stripe.products.update(product.id, { active: false })
      }
    }
  }

  getTestCards() {
    return {
      visa: '4242424242424242',
      visaDebit: '4000056655665556',
      mastercard: '5555555555554444',
      declined: '4000000000000002',
      insufficientFunds: '4000000000009995',
      processingError: '4000000000000119',
      expiredCard: '4000000000000069'
    }
  }
}

// Playwright Test Helpers
export class PlaywrightTestHelper {
  private browser: Browser
  private context: BrowserContext
  private page: Page

  constructor(browser: Browser) {
    this.browser = browser
  }

  async createContext(options?: Parameters<Browser['newContext']>[0]): Promise<BrowserContext> {
    this.context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      ...options
    })
    return this.context
  }

  async createPage(): Promise<Page> {
    if (!this.context) {
      await this.createContext()
    }
    this.page = await this.context.newPage()
    return this.page
  }

  async loginUser(email: string, password: string): Promise<void> {
    if (!this.page) {
      await this.createPage()
    }

    await this.page.goto('/auth/login')
    await this.page.fill('[data-testid="login-email"]', email)
    await this.page.fill('[data-testid="login-password"]', password)
    await this.page.click('[data-testid="login-submit"]')
    await this.page.waitForURL('/dashboard')
  }

  async waitForApiResponse(urlPattern: string | RegExp): Promise<any> {
    const response = await this.page.waitForResponse(urlPattern)
    return await response.json()
  }

  async interceptApiCall(urlPattern: string | RegExp, mockResponse: any): Promise<void> {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      })
    })
  }

  async captureNetworkActivity(): Promise<Array<{ url: string; method: string; status: number }>> {
    const requests: Array<{ url: string; method: string; status: number }> = []

    this.page.on('response', response => {
      requests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status()
      })
    })

    return requests
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close()
    }
    if (this.context) {
      await this.context.close()
    }
  }
}

// Performance Test Helpers
export class PerformanceTestHelper {
  static async measureApiEndpoint(
    makeRequest: () => Promise<any>,
    options: { iterations?: number; warmup?: number } = {}
  ): Promise<{
    averageResponseTime: number
    minResponseTime: number
    maxResponseTime: number
    successRate: number
    results: Array<{ time: number; success: boolean }>
  }> {
    const { iterations = 10, warmup = 2 } = options
    const results: Array<{ time: number; success: boolean }> = []

    // Warmup requests
    for (let i = 0; i < warmup; i++) {
      try {
        await makeRequest()
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Actual measurements
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      let success = true

      try {
        await makeRequest()
      } catch (error) {
        success = false
      }

      const endTime = Date.now()
      results.push({ time: endTime - startTime, success })
    }

    const successfulResults = results.filter(r => r.success)
    const responseTimes = successfulResults.map(r => r.time)

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      successRate: (successfulResults.length / results.length) * 100,
      results
    }
  }

  static async measurePageLoad(
    page: Page,
    url: string,
    options: { iterations?: number } = {}
  ): Promise<{
    averageLoadTime: number
    averageFirstContentfulPaint: number
    averageDOMContentLoaded: number
  }> {
    const { iterations = 5 } = options
    const measurements: Array<{
      loadTime: number
      firstContentfulPaint: number
      domContentLoaded: number
    }> = []

    for (let i = 0; i < iterations; i++) {
      await page.goto(url, { waitUntil: 'networkidle' })

      const timing = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint')

        return {
          loadTime: navigation.loadEventEnd - navigation.navigationStart,
          firstContentfulPaint: fcp ? fcp.startTime : 0,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart
        }
      })

      measurements.push(timing)
    }

    return {
      averageLoadTime: measurements.reduce((sum, m) => sum + m.loadTime, 0) / measurements.length,
      averageFirstContentfulPaint: measurements.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / measurements.length,
      averageDOMContentLoaded: measurements.reduce((sum, m) => sum + m.domContentLoaded, 0) / measurements.length
    }
  }
}

// Test Environment Setup
export class TestEnvironment {
  static async setupDatabase(): Promise<void> {
    await DatabaseTestHelper.cleanDatabase()
    await DatabaseTestHelper.resetAutoIncrement()
  }

  static async teardownDatabase(): Promise<void> {
    await DatabaseTestHelper.cleanDatabase()
    await DatabaseTestHelper.disconnect()
  }

  static createTestModule(providers: any[]): Promise<TestingModule> {
    return Test.createTestingModule({
      providers
    }).compile()
  }

  static getTestConfig(): Record<string, any> {
    return {
      database: {
        url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'test-secret',
        expiresIn: '1h'
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY_TEST,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_TEST
      },
      supabase: {
        url: process.env.SUPABASE_URL_TEST || process.env.SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY_TEST || process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }
  }
}

// Assertion Helpers
export class AssertionHelper {
  static expectValidUser(user: any): void {
    expect(user).toBeDefined()
    expect(user.id).toBeTruthy()
    // Use bounded quantifiers to prevent ReDoS attacks
    expect(user.email).toMatch(/^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/)
    expect(user.role).toMatch(/^(OWNER|TENANT|ADMIN)$/)
  }

  static expectValidProperty(property: any): void {
    expect(property).toBeDefined()
    expect(property.id).toBeTruthy()
    expect(property.name).toBeTruthy()
    expect(property.address).toBeTruthy()
    expect(property.ownerId).toBeTruthy()
    expect(property.monthlyRent).toBeGreaterThan(0)
  }

  static expectValidLease(lease: any): void {
    expect(lease).toBeDefined()
    expect(lease.id).toBeTruthy()
    expect(lease.unitId).toBeTruthy()
    expect(lease.tenantId).toBeTruthy()
    expect(lease.startDate).toBeInstanceOf(Date)
    expect(lease.endDate).toBeInstanceOf(Date)
    expect(lease.rentAmount).toBeGreaterThan(0)
  }

  static expectValidSubscription(subscription: any): void {
    expect(subscription).toBeDefined()
    expect(subscription.id).toBeTruthy()
    expect(subscription.stripeSubscriptionId).toBeTruthy()
    expect(subscription.status).toMatch(/^(active|canceled|incomplete|past_due|trialing|unpaid)$/)
  }

  static expectApiError(response: any, expectedStatus: number, expectedMessage?: string): void {
    expect(response.status).toBe(expectedStatus)
    expect(response.body.error).toBeDefined()
    if (expectedMessage) {
      expect(response.body.error.message).toContain(expectedMessage)
    }
  }
}