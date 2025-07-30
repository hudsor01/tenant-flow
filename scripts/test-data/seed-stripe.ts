#!/usr/bin/env tsx

/**
 * Stripe-Specific Test Data Seeding Script
 * 
 * Creates comprehensive Stripe test data including customers, subscriptions,
 * invoices, payment methods, and webhook events for testing payment flows.
 */

import { TestDataFactoryManager } from './factories'
import { Logger } from './utils/logger'
import { getCurrentConfig } from './environments/config'

interface StripeSeedOptions {
  customerCount?: number
  subscriptionScenarios?: boolean
  paymentFailures?: boolean
  webhookHistory?: boolean
  verbose?: boolean
}

class StripeSeeder {
  private factory: TestDataFactoryManager
  private logger: Logger
  private config: any

  constructor(options: StripeSeedOptions = {}) {
    this.factory = new TestDataFactoryManager()
    this.logger = new Logger({ level: options.verbose ? 4 : 2 })
    this.config = getCurrentConfig()
  }

  async seed(options: StripeSeedOptions = {}): Promise<{
    customers: any[]
    subscriptions: any[]
    invoices: any[]
    webhookEvents: any[]
    testCards: any[]
    summary: any
  }> {
    const {
      customerCount = 15,
      subscriptionScenarios = true,
      paymentFailures = true,
      webhookHistory = true
    } = options

    this.logger.info('💳 Starting Stripe test data seeding...')

    try {
      // Clean existing Stripe data
      await this.cleanStripeData()

      // Create users who will become Stripe customers
      const users = await this.createStripeUsers(customerCount)
      
      // Create subscriptions with various states
      const subscriptions = await this.createSubscriptions(users, subscriptionScenarios)
      
      // Create invoices
      const invoices = await this.extractInvoices(subscriptions)
      
      // Create webhook events
      const webhookEvents = webhookHistory 
        ? await this.createWebhookEvents(subscriptions)
        : []
      
      // Create payment failure scenarios
      if (paymentFailures) {
        await this.createPaymentFailureScenarios(users.slice(0, 3))
      }

      // Get test cards reference
      const testCards = this.factory.stripe.getAllTestCards()

      const summary = {
        totalCustomers: users.length,
        totalSubscriptions: subscriptions.length,
        totalInvoices: invoices.length,
        totalWebhookEvents: webhookEvents.length,
        subscriptionBreakdown: this.analyzeSubscriptions(subscriptions),
        testCardsAvailable: testCards.length
      }

      this.logger.success('✅ Stripe seeding completed!')
      this.logger.info('📊 Summary:', summary)

      return { 
        customers: users, 
        subscriptions, 
        invoices, 
        webhookEvents, 
        testCards,
        summary 
      }

    } finally {
      await this.factory.disconnect()
    }
  }

  private async cleanStripeData(): Promise<void> {
    this.logger.info('🧹 Cleaning existing Stripe data...')
    
    // Delete Stripe-related data in dependency order
    await this.factory.prisma.webhookEvent.deleteMany()
    await this.factory.prisma.invoice.deleteMany()
    await this.factory.prisma.subscription.deleteMany()
    
    // Clean users with Stripe customer IDs
    await this.factory.prisma.user.updateMany({
      where: { stripeCustomerId: { not: null } },
      data: { stripeCustomerId: null }
    })
    
    this.logger.success('✅ Stripe data cleaned')
  }

  private async createStripeUsers(count: number): Promise<any[]> {
    this.logger.info(`👥 Creating ${count} Stripe customer users...`)
    
    const users = []
    const progress = this.logger.startProgress(count, 'Creating Stripe customers')

    for (let i = 0; i < count; i++) {
      const user = await this.factory.user.createLandlord({
        hasSubscription: false, // We'll create subscriptions separately
        profile: {
          completeName: true,
          hasPhone: Math.random() < 0.9,
          hasAvatar: Math.random() < 0.6
        }
      })

      // Update user with Stripe customer ID
      const updatedUser = await this.factory.prisma.user.update({
        where: { id: user.id },
        data: { 
          stripeCustomerId: `cus_test_${Math.random().toString(36).substr(2, 14)}` 
        }
      })

      users.push(updatedUser)
      progress.increment()
    }

    progress.complete()
    return users
  }

  private async createSubscriptions(users: any[], includeScenarios: boolean): Promise<any[]> {
    this.logger.info('💰 Creating Stripe subscriptions...')
    
    const subscriptions = []
    
    // Create subscriptions for 80% of users
    const subscriberCount = Math.floor(users.length * 0.8)
    const subscribers = users.slice(0, subscriberCount)
    
    const progress = this.logger.startProgress(subscribers.length, 'Creating subscriptions')

    for (const user of subscribers) {
      const subscriptionType = this.selectSubscriptionType()
      
      const subscription = await this.factory.stripe.createStripeSubscription({
        userId: user.id,
        planType: subscriptionType.plan,
        subscriptionStatus: subscriptionType.status,
        isTrialing: subscriptionType.isTrialing,
        withInvoices: true,
        withWebhookEvents: true
      })

      subscriptions.push(subscription)
      progress.increment()
    }

    progress.complete()

    // Create special scenarios if requested
    if (includeScenarios) {
      await this.createSpecialScenarios(users.slice(subscriberCount))
    }

    return subscriptions
  }

  private async createSpecialScenarios(users: any[]): Promise<void> {
    if (users.length === 0) return

    this.logger.info('🎭 Creating special subscription scenarios...')

    // Subscription lifecycle scenario
    if (users.length > 0) {
      const result = await this.factory.stripe.createSubscriptionLifecycle(users[0].id)
      this.logger.info('   Created subscription lifecycle scenario')
    }

    // Payment failure scenario
    if (users.length > 1) {
      await this.factory.stripe.createPaymentFailureScenario(users[1].id)
      this.logger.info('   Created payment failure scenario')
    }

    // Trial ending scenario
    if (users.length > 2) {
      await this.factory.stripe.createStripeSubscription({
        userId: users[2].id,
        subscriptionStatus: 'TRIALING',
        isTrialing: true,
        trialDays: 3, // Trial ending soon
        withInvoices: true,
        withWebhookEvents: true
      })
      this.logger.info('   Created trial ending scenario')
    }
  }

  private async createPaymentFailureScenarios(users: any[]): Promise<void> {
    this.logger.info('❌ Creating payment failure scenarios...')
    
    for (const user of users) {
      await this.factory.stripe.createPaymentFailureScenario(user.id)
    }
    
    // Create failed webhook events
    const failedWebhooks = await this.factory.stripe.createFailedWebhookEvents(5)
    
    this.logger.info(`   Created ${failedWebhooks.length} failed webhook events`)
  }

  private async extractInvoices(subscriptions: any[]): Promise<any[]> {
    const allInvoices = []
    
    for (const subscription of subscriptions) {
      if (subscription.invoices) {
        allInvoices.push(...subscription.invoices)
      }
    }
    
    this.logger.info(`📄 Extracted ${allInvoices.length} invoices from subscriptions`)
    return allInvoices
  }

  private async createWebhookEvents(subscriptions: any[]): Promise<any[]> {
    const allWebhookEvents = []
    
    for (const subscription of subscriptions) {
      if (subscription.webhookEvents) {
        allWebhookEvents.push(...subscription.webhookEvents)
      }
    }

    // Create additional webhook events for common scenarios
    const additionalEvents = await this.createAdditionalWebhookEvents()
    allWebhookEvents.push(...additionalEvents)
    
    this.logger.info(`🔗 Created ${allWebhookEvents.length} webhook events`)
    return allWebhookEvents
  }

  private async createAdditionalWebhookEvents(): Promise<any[]> {
    const eventTypes = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'setup_intent.succeeded',
      'customer.created',
      'customer.updated',
      'invoice.finalized',
      'charge.dispute.created'
    ]

    const events = []
    
    for (const eventType of eventTypes) {
      const event = await this.factory.prisma.webhookEvent.create({
        data: {
          stripeEventId: `evt_test_${Math.random().toString(36).substr(2, 14)}`,
          eventType,
          processed: Math.random() < 0.95, // 95% processed
          processingTime: Math.floor(Math.random() * 1000) + 50,
          errorMessage: Math.random() < 0.05 ? 'Processing error' : null,
          retryCount: Math.floor(Math.random() * 3)
        }
      })
      
      events.push(event)
    }
    
    return events
  }

  private selectSubscriptionType(): {
    plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
    isTrialing: boolean
  } {
    const random = Math.random()
    
    // Plan distribution
    let plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
    if (random < 0.1) plan = 'FREE'
    else if (random < 0.5) plan = 'STARTER'
    else if (random < 0.85) plan = 'GROWTH'
    else plan = 'ENTERPRISE'
    
    // Status distribution
    const statusRandom = Math.random()
    let status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
    let isTrialing = false
    
    if (statusRandom < 0.7) {
      status = 'ACTIVE'
    } else if (statusRandom < 0.85) {
      status = 'TRIALING'
      isTrialing = true
    } else if (statusRandom < 0.92) {
      status = 'PAST_DUE'
    } else if (statusRandom < 0.97) {
      status = 'CANCELED'
    } else {
      status = 'UNPAID'
    }
    
    return { plan, status, isTrialing }
  }

  private analyzeSubscriptions(subscriptions: any[]): Record<string, any> {
    const planBreakdown = { FREE: 0, STARTER: 0, GROWTH: 0, ENTERPRISE: 0 }
    const statusBreakdown = { ACTIVE: 0, TRIALING: 0, PAST_DUE: 0, CANCELED: 0, UNPAID: 0 }
    
    subscriptions.forEach(sub => {
      if (sub.planType && sub.planType in planBreakdown) {
        planBreakdown[sub.planType as keyof typeof planBreakdown]++
      }
      
      if (sub.status && sub.status in statusBreakdown) {
        statusBreakdown[sub.status as keyof typeof statusBreakdown]++
      }
    })
    
    return {
      plans: planBreakdown,
      statuses: statusBreakdown,
      totalRevenue: this.calculateTotalRevenue(subscriptions),
      averageRevenuePerUser: this.calculateARPU(subscriptions)
    }
  }

  private calculateTotalRevenue(subscriptions: any[]): number {
    const planValues = {
      FREE: 0,
      STARTER: 29,
      GROWTH: 99,
      ENTERPRISE: 299
    }
    
    return subscriptions.reduce((total, sub) => {
      if (sub.status === 'ACTIVE' && sub.planType) {
        return total + (planValues[sub.planType as keyof typeof planValues] || 0)
      }
      return total
    }, 0)
  }

  private calculateARPU(subscriptions: any[]): number {
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'ACTIVE')
    if (activeSubscriptions.length === 0) return 0
    
    const totalRevenue = this.calculateTotalRevenue(activeSubscriptions)
    return Math.round(totalRevenue / activeSubscriptions.length * 100) / 100 // Round to 2 decimal places
  }

  // Utility method to display test cards
  displayTestCards(): void {
    const testCards = this.factory.stripe.getAllTestCards()
    
    console.log('\n💳 Available Stripe Test Cards:')
    console.log('─'.repeat(60))
    
    testCards.forEach(card => {
      console.log(`${card.brand} ****${card.last4}: ${card.description}`)
      console.log(`   Number: ${card.number}`)
      console.log(`   Expected: ${card.expectedOutcome}`)
      console.log()
    })
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const options: StripeSeedOptions = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--customers':
        options.customerCount = parseInt(args[++i])
        break
      case '--no-scenarios':
        options.subscriptionScenarios = false
        break
      case '--no-failures':
        options.paymentFailures = false
        break
      case '--no-webhooks':
        options.webhookHistory = false
        break
      case '--test-cards':
        const seeder = new StripeSeeder()
        seeder.displayTestCards()
        process.exit(0)
        break
      case '--verbose':
        options.verbose = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: tsx seed-stripe.ts [options]

Options:
  --customers <count>    Number of Stripe customers to create (default: 15)
  --no-scenarios         Skip special subscription scenarios
  --no-failures          Skip payment failure scenarios
  --no-webhooks          Skip webhook event creation
  --test-cards           Display available test cards and exit
  --verbose              Enable verbose logging
  -h, --help             Show this help message

Examples:
  tsx seed-stripe.ts --customers 20 --verbose
  tsx seed-stripe.ts --no-failures
  tsx seed-stripe.ts --test-cards
`)
        process.exit(0)
    }
  }

  const seeder = new StripeSeeder(options)
  await seeder.seed(options)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { StripeSeeder, StripeSeedOptions }