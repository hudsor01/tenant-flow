import { faker } from '@faker-js/faker'
import { PrismaClient, PlanType, SubStatus } from '@prisma/client'
import type { Subscription, Invoice, WebhookEvent } from '@prisma/client'

export interface StripeFactoryOptions {
  userId: string
  planType?: PlanType
  subscriptionStatus?: SubStatus
  isTrialing?: boolean
  trialDays?: number
  withInvoices?: boolean
  invoiceCount?: number
  withWebhookEvents?: boolean
}

export interface StripeTestCard {
  number: string
  brand: string
  last4: string
  description: string
  expectedOutcome: 'success' | 'declined' | 'error'
}

export class StripeFactory {
  constructor(private prisma: PrismaClient) {}

  // Stripe test card numbers for different scenarios
  private readonly testCards: StripeTestCard[] = [
    {
      number: '4242424242424242',
      brand: 'Visa',
      last4: '4242',
      description: 'Successful payment',
      expectedOutcome: 'success'
    },
    {
      number: '4000056655665556',
      brand: 'Visa',
      last4: '5556',
      description: 'Visa debit card',
      expectedOutcome: 'success'
    },
    {
      number: '5555555555554444',
      brand: 'Mastercard',
      last4: '4444',
      description: 'Mastercard',
      expectedOutcome: 'success'
    },
    {
      number: '4000000000000002',
      brand: 'Visa',
      last4: '0002',
      description: 'Declined payment',
      expectedOutcome: 'declined'
    },
    {
      number: '4000000000009995',
      brand: 'Visa',
      last4: '9995',
      description: 'Insufficient funds',
      expectedOutcome: 'declined'
    },
    {
      number: '4000000000000119',
      brand: 'Visa',
      last4: '0119',
      description: 'Processing error',
      expectedOutcome: 'error'
    },
    {
      number: '4000000000000069',
      brand: 'Visa',
      last4: '0069',
      description: 'Expired card',
      expectedOutcome: 'declined'
    }
  ]

  async createStripeSubscription(options: StripeFactoryOptions): Promise<Subscription & {
    invoices?: Invoice[]
    webhookEvents?: WebhookEvent[]
  }> {
    const {
      userId,
      planType = faker.helpers.arrayElement(['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE']),
      subscriptionStatus = 'ACTIVE',
      isTrialing = faker.datatype.boolean({ probability: 0.3 }),
      trialDays = 14,
      withInvoices = faker.datatype.boolean({ probability: 0.8 }),
      invoiceCount = faker.number.int({ min: 1, max: 6 }),
      withWebhookEvents = faker.datatype.boolean({ probability: 0.7 })
    } = options

    const now = new Date()
    const startDate = faker.date.past({ years: 1 })
    
    // Calculate period dates
    const currentPeriodStart = new Date(startDate)
    const currentPeriodEnd = new Date(currentPeriodStart)
    currentPeriodEnd.setMonth(currentPeriodStart.getMonth() + 1)
    
    // Calculate trial dates
    let trialStart: Date | null = null
    let trialEnd: Date | null = null
    
    if (isTrialing || subscriptionStatus === 'TRIALING') {
      trialStart = startDate
      trialEnd = new Date(startDate)
      trialEnd.setDate(startDate.getDate() + trialDays)
    }

    const subscriptionData = {
      id: faker.string.uuid(),
      userId,
      status: subscriptionStatus,
      planType,
      startDate,
      endDate: subscriptionStatus === 'CANCELED' ? faker.date.past() : null,
      cancelledAt: subscriptionStatus === 'CANCELED' ? faker.date.past() : null,
      stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
      stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
      stripePriceId: this.getPriceIdForPlan(planType),
      planId: `plan_${planType.toLowerCase()}`,
      billingPeriod: faker.helpers.arrayElement(['monthly', 'yearly']),
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: subscriptionStatus === 'CANCELED' ? faker.datatype.boolean() : false,
      canceledAt: subscriptionStatus === 'CANCELED' ? faker.date.past() : null,
      createdAt: startDate,
      updatedAt: new Date()
    }

    const subscription = await this.prisma.subscription.create({
      data: subscriptionData
    })

    let invoices: Invoice[] = []
    let webhookEvents: WebhookEvent[] = []

    // Create invoices
    if (withInvoices && planType !== 'FREE') {
      invoices = await this.createStripeInvoices(subscription, invoiceCount)
    }

    // Create webhook events
    if (withWebhookEvents) {
      webhookEvents = await this.createWebhookEvents(subscription)
    }

    return { ...subscription, invoices, webhookEvents }
  }

  private async createStripeInvoices(subscription: Subscription, count: number): Promise<Invoice[]> {
    const invoices: Invoice[] = []
    const monthlyAmount = this.getAmountForPlan(subscription.planType!)
    
    for (let i = 0; i < count; i++) {
      const invoiceDate = new Date(subscription.startDate)
      invoiceDate.setMonth(invoiceDate.getMonth() + i)
      
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 7) // 7 days to pay
      
      const isPaid = faker.datatype.boolean({ probability: 0.9 })
      const paidAt = isPaid ? faker.date.between({ from: invoiceDate, to: dueDate }) : null
      
      const invoice = await this.prisma.invoice.create({
        data: {
          id: faker.string.uuid(),
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripeInvoiceId: `in_${faker.string.alphanumeric(14)}`,
          amountPaid: isPaid ? monthlyAmount : 0,
          amountDue: monthlyAmount,
          currency: 'usd',
          status: isPaid ? 'paid' : faker.helpers.arrayElement(['open', 'past_due', 'uncollectible']),
          invoiceDate,
          dueDate,
          paidAt,
          invoiceUrl: `https://invoice.stripe.com/i/acct_test_${faker.string.alphanumeric(8)}/${faker.string.alphanumeric(20)}`,
          invoicePdf: `https://files.stripe.com/invoices/in_${faker.string.alphanumeric(14)}.pdf`,
          description: `${subscription.planType} Plan - Monthly Subscription`,
          createdAt: invoiceDate,
          updatedAt: paidAt || invoiceDate
        }
      })
      
      invoices.push(invoice)
    }
    
    return invoices
  }

  private async createWebhookEvents(subscription: Subscription): Promise<WebhookEvent[]> {
    const events: WebhookEvent[] = []
    
    // Common webhook events for subscriptions
    const webhookTypes = [
      'customer.subscription.created',
      'customer.subscription.updated',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.trial_will_end'
    ]
    
    for (const eventType of webhookTypes) {
      // Skip trial events if not trialing
      if (eventType.includes('trial') && subscription.status !== 'TRIALING') {
        continue
      }
      
      const event = await this.prisma.webhookEvent.create({
        data: {
          id: faker.string.uuid(),
          stripeEventId: `evt_${faker.string.alphanumeric(14)}`,
          eventType,
          processed: faker.datatype.boolean({ probability: 0.95 }),
          processingTime: faker.number.int({ min: 50, max: 2000 }),
          errorMessage: faker.datatype.boolean({ probability: 0.05 }) 
            ? faker.helpers.arrayElement([
                'Rate limit exceeded',
                'Database connection timeout',
                'Invalid customer ID'
              ])
            : null,
          retryCount: faker.number.int({ min: 0, max: 3 }),
          createdAt: faker.date.between({ 
            from: subscription.startDate, 
            to: new Date() 
          }),
          updatedAt: new Date()
        }
      })
      
      events.push(event)
    }
    
    return events
  }

  // Create failed webhook events for testing retry logic
  async createFailedWebhookEvents(count: number = 5): Promise<any[]> {
    const failedEvents = []
    
    for (let i = 0; i < count; i++) {
      const eventType = faker.helpers.arrayElement([
        'invoice.payment_failed',
        'customer.subscription.updated',
        'payment_method.attached'
      ])
      
      const firstFailedAt = faker.date.past({ days: 7 })
      const failureCount = faker.number.int({ min: 1, max: 5 })
      
      // Calculate next retry time based on exponential backoff
      const nextRetryAt = new Date(firstFailedAt)
      nextRetryAt.setMinutes(nextRetryAt.getMinutes() + Math.pow(2, failureCount) * 5)
      
      const failedEvent = {
        id: faker.string.uuid(),
        eventId: `evt_${faker.string.alphanumeric(14)}`,
        eventType,
        payload: JSON.stringify({
          id: `evt_${faker.string.alphanumeric(14)}`,
          type: eventType,
          data: {
            object: {
              id: `sub_${faker.string.alphanumeric(14)}`,
              customer: `cus_${faker.string.alphanumeric(14)}`
            }
          }
        }),
        signature: `t=${Date.now()},v1=${faker.string.alphanumeric(64)}`,
        failureReason: faker.helpers.arrayElement([
          'Database connection timeout',
          'Rate limit exceeded',
          'Invalid webhook signature',
          'Customer not found',
          'Subscription processing error'
        ]),
        failureCount,
        firstFailedAt,
        lastRetryAt: faker.date.between({ from: firstFailedAt, to: new Date() }),
        nextRetryAt: failureCount < 5 ? nextRetryAt : null,
        createdAt: firstFailedAt,
        updatedAt: new Date()
      }
      
      failedEvents.push(failedEvent)
    }
    
    return failedEvents
  }

  // Create subscription lifecycle scenario
  async createSubscriptionLifecycle(userId: string): Promise<{
    subscription: Subscription
    timeline: Array<{
      date: Date
      event: string
      description: string
      webhookType?: string
    }>
  }> {
    // Create subscription with trial
    const subscription = await this.createStripeSubscription({
      userId,
      planType: 'STARTER',
      subscriptionStatus: 'ACTIVE',
      isTrialing: true,
      withInvoices: true,
      withWebhookEvents: true
    })
    
    const timeline = [
      {
        date: subscription.startDate,
        event: 'Trial Started',
        description: '14-day free trial began',
        webhookType: 'customer.subscription.created'
      },
      {
        date: new Date(subscription.trialEnd!.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before trial end
        event: 'Trial Ending Warning',
        description: 'Trial will end in 3 days notification sent',
        webhookType: 'customer.subscription.trial_will_end'
      },
      {
        date: subscription.trialEnd!,
        event: 'Trial Ended',
        description: 'Free trial ended, first payment processed',
        webhookType: 'invoice.payment_succeeded'
      },
      {
        date: subscription.currentPeriodEnd!,
        event: 'Renewal',
        description: 'Subscription renewed for next month',
        webhookType: 'customer.subscription.updated'
      }
    ]
    
    return { subscription, timeline }
  }

  // Create payment failure scenario
  async createPaymentFailureScenario(userId: string): Promise<{
    subscription: Subscription
    failureEvents: Array<{
      date: Date
      attemptNumber: number
      reason: string
      nextRetry?: Date
    }>
  }> {
    const subscription = await this.createStripeSubscription({
      userId,
      subscriptionStatus: 'PAST_DUE',
      withInvoices: true
    })
    
    const baseDate = subscription.currentPeriodEnd!
    const failureEvents = [
      {
        date: baseDate,
        attemptNumber: 1,
        reason: 'Insufficient funds',
        nextRetry: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000) // Retry in 3 days
      },
      {
        date: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        attemptNumber: 2,
        reason: 'Card expired',
        nextRetry: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Retry in 7 days
      },
      {
        date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        attemptNumber: 3,
        reason: 'Card declined',
        nextRetry: new Date(baseDate.getTime() + 21 * 24 * 60 * 60 * 1000) // Final retry in 21 days
      }
    ]
    
    return { subscription, failureEvents }
  }

  private getPriceIdForPlan(plan: PlanType): string {
    const priceIds = {
      FREE: 'price_free',
      STARTER: 'price_1NqjIvGrz8KkRPNH4H7VmKLh',
      GROWTH: 'price_1NqjJ9Grz8KkRPNH0E3q6H8M',
      ENTERPRISE: 'price_1NqjJQGrz8KkRPNHvK4L6S9P'
    }
    return priceIds[plan] || priceIds.FREE
  }

  private getAmountForPlan(plan: PlanType): number {
    const amounts = {
      FREE: 0,
      STARTER: 2900, // $29.00 in cents
      GROWTH: 9900, // $99.00 in cents
      ENTERPRISE: 29900 // $299.00 in cents
    }
    return amounts[plan] || 0
  }

  // Get test card for specific scenario
  getTestCard(scenario: 'success' | 'declined' | 'error' = 'success'): StripeTestCard {
    const cards = this.testCards.filter(card => card.expectedOutcome === scenario)
    return faker.helpers.arrayElement(cards)
  }

  // Get all test cards for comprehensive testing
  getAllTestCards(): StripeTestCard[] {
    return [...this.testCards]
  }

  // Create comprehensive Stripe test data
  async createStripeTestSuite(userIds: string[]): Promise<{
    activeSubscriptions: Subscription[]
    trialingSubscriptions: Subscription[]
    pastDueSubscriptions: Subscription[]
    canceledSubscriptions: Subscription[]
    testCards: StripeTestCard[]
    webhookEvents: WebhookEvent[]
    failedWebhooks: { eventType: string; error: string; timestamp: Date; retryCount: number }[]
  }> {
    const results = {
      activeSubscriptions: [],
      trialingSubscriptions: [],
      pastDueSubscriptions: [],
      canceledSubscriptions: [],
      testCards: this.getAllTestCards(),
      webhookEvents: [],
      failedWebhooks: []
    }

    // Create different subscription states
    for (const userId of userIds) {
      const subscriptionType = faker.helpers.arrayElement([
        'active', 'trialing', 'past_due', 'canceled'
      ])

      let subscription: Subscription
      
      switch (subscriptionType) {
        case 'active':
          subscription = await this.createStripeSubscription({
            userId,
            subscriptionStatus: 'ACTIVE',
            planType: faker.helpers.arrayElement(['STARTER', 'GROWTH', 'ENTERPRISE']),
            withInvoices: true,
            withWebhookEvents: true
          })
          results.activeSubscriptions.push(subscription)
          break
          
        case 'trialing':
          subscription = await this.createStripeSubscription({
            userId,
            subscriptionStatus: 'TRIALING',
            isTrialing: true,
            withWebhookEvents: true
          })
          results.trialingSubscriptions.push(subscription)
          break
          
        case 'past_due':
          subscription = await this.createStripeSubscription({
            userId,
            subscriptionStatus: 'PAST_DUE',
            withInvoices: true,
            withWebhookEvents: true
          })
          results.pastDueSubscriptions.push(subscription)
          break
          
        case 'canceled':
          subscription = await this.createStripeSubscription({
            userId,
            subscriptionStatus: 'CANCELED',
            withInvoices: true,
            withWebhookEvents: true
          })
          results.canceledSubscriptions.push(subscription)
          break
      }
    }

    // Create failed webhook events
    results.failedWebhooks = await this.createFailedWebhookEvents(10)

    return results
  }
}