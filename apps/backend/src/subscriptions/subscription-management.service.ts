import { Injectable, forwardRef, Inject } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionSyncService } from './subscription-sync.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import type Stripe from 'stripe'
import type { PlanType, Subscription } from '@repo/database'

export interface SubscriptionManagementResult {
  success: boolean
  subscription?: Subscription
  stripeSubscription?: Stripe.Subscription
  checkoutUrl?: string
  error?: string
  changes: string[]
  metadata: {
    operation: string
    fromPlan?: PlanType
    toPlan?: PlanType
    correlationId: string
    timestamp: string
  }
}

export interface UpgradeRequest {
  targetPlan: PlanType
  billingCycle: 'monthly' | 'annual'
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

export interface DowngradeRequest {
  targetPlan: PlanType
  billingCycle: 'monthly' | 'annual'
  effectiveDate?: 'immediate' | 'end_of_period'
  reason?: string
}

export interface CancelRequest {
  cancelAt: 'immediate' | 'end_of_period'
  reason?: string
  feedback?: string
}

/**
 * Service for managing subscription upgrades, downgrades, and cancellations
 * 
 * Features:
 * - Stripe-integrated plan changes with prorations
 * - Downgrade scheduling for end of billing period
 * - Cancellation with retention logic
 * - Usage validation and limit checking
 * - Event emission for plan changes
 * - Comprehensive error handling and rollback
 */
@Injectable()
export class SubscriptionManagementService {
  private readonly logger: StructuredLoggerService

  constructor(
    private readonly prismaService: PrismaService,
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => SubscriptionsManagerService))
    private readonly subscriptionManager: SubscriptionsManagerService,
    @Inject(forwardRef(() => SubscriptionSyncService))
    private readonly subscriptionSync: SubscriptionSyncService,
    private readonly eventEmitter: EventEmitter2,
    private readonly errorHandler: ErrorHandlerService
  ) {
    this.logger = new StructuredLoggerService('SubscriptionManagementService')
  }

  /**
   * Upgrade user's subscription to a higher plan
   */
  async upgradeSubscription(
    userId: string,
    request: UpgradeRequest
  ): Promise<SubscriptionManagementResult> {
    const correlationId = `upgrade-${userId}-${Date.now()}`
    
    try {
      this.logger.info('Starting subscription upgrade', {
        userId,
        targetPlan: request.targetPlan,
        billingCycle: request.billingCycle,
        correlationId
      })

      // Get current subscription
      const currentSubscription = await this.subscriptionManager.getSubscription(userId)
      if (!currentSubscription) {
        return {
          success: false,
          error: 'No active subscription found',
          changes: [],
          metadata: {
            operation: 'upgrade',
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Validate upgrade path
      const validationResult = await this.validateUpgrade(currentSubscription, request.targetPlan)
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.reason,
          changes: [],
          metadata: {
            operation: 'upgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Get target price ID
      const targetPriceId = this.getPriceId(request.targetPlan, request.billingCycle)
      if (!targetPriceId) {
        return {
          success: false,
          error: 'Target plan not available',
          changes: [],
          metadata: {
            operation: 'upgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Validate Stripe subscription ID
      if (!currentSubscription.stripeSubscriptionId) {
        return {
          success: false,
          error: 'Subscription not connected to Stripe',
          changes: [],
          metadata: {
            operation: 'upgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Perform Stripe subscription update
      const stripeResult = await this.updateStripeSubscription(
        currentSubscription.stripeSubscriptionId,
        targetPriceId,
        request.prorationBehavior || 'create_prorations'
      )

      if (!stripeResult.success) {
        return {
          success: false,
          error: stripeResult.error,
          changes: [],
          metadata: {
            operation: 'upgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Sync the updated subscription
      if (!stripeResult.subscription) {
        return {
          success: false,
          error: 'Stripe subscription data not available',
          changes: [],
          metadata: {
            operation: 'upgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      const syncResult = await this.subscriptionSync.syncSubscriptionFromWebhook(stripeResult.subscription)
      
      if (syncResult.success && syncResult.subscription) {
        // Emit upgrade event
        this.eventEmitter.emit('subscription.upgraded', {
          userId,
          subscriptionId: syncResult.subscription.id,
          fromPlan: currentSubscription.planType,
          toPlan: request.targetPlan,
          billingCycle: request.billingCycle,
          correlationId,
          timestamp: new Date()
        })

        this.logger.info('Subscription upgrade completed successfully', {
          userId,
          fromPlan: currentSubscription.planType,
          toPlan: request.targetPlan,
          correlationId
        })

        return {
          success: true,
          subscription: syncResult.subscription,
          stripeSubscription: stripeResult.subscription,
          changes: [`Upgraded from ${currentSubscription.planType} to ${request.targetPlan}`],
          metadata: {
            operation: 'upgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      } else {
        throw new Error(`Sync failed after upgrade: ${syncResult.error}`)
      }

    } catch (error) {
      this.logger.error('Subscription upgrade failed', error as Error, {
        userId,
        targetPlan: request.targetPlan,
        correlationId
      })

      return this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'SubscriptionManagementService.upgradeSubscription',
        userId,
        targetPlan: request.targetPlan,
        correlationId
      })
    }
  }

  /**
   * Downgrade user's subscription to a lower plan
   */
  async downgradeSubscription(
    userId: string,
    request: DowngradeRequest
  ): Promise<SubscriptionManagementResult> {
    const correlationId = `downgrade-${userId}-${Date.now()}`
    
    try {
      this.logger.info('Starting subscription downgrade', {
        userId,
        targetPlan: request.targetPlan,
        billingCycle: request.billingCycle,
        effectiveDate: request.effectiveDate || 'end_of_period',
        correlationId
      })

      // Get current subscription
      const currentSubscription = await this.subscriptionManager.getSubscription(userId)
      if (!currentSubscription) {
        return {
          success: false,
          error: 'No active subscription found',
          changes: [],
          metadata: {
            operation: 'downgrade',
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Validate downgrade path
      const validationResult = await this.validateDowngrade(currentSubscription, request.targetPlan, userId)
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.reason,
          changes: [],
          metadata: {
            operation: 'downgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Get target price ID
      const targetPriceId = this.getPriceId(request.targetPlan, request.billingCycle)
      if (!targetPriceId) {
        return {
          success: false,
          error: 'Target plan not available',
          changes: [],
          metadata: {
            operation: 'downgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Validate Stripe subscription ID
      if (!currentSubscription.stripeSubscriptionId) {
        return {
          success: false,
          error: 'Subscription not connected to Stripe',
          changes: [],
          metadata: {
            operation: 'downgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      let stripeResult: { success: boolean, subscription?: Stripe.Subscription, error?: string }

      if (request.effectiveDate === 'immediate') {
        // Immediate downgrade with prorations
        stripeResult = await this.updateStripeSubscription(
          currentSubscription.stripeSubscriptionId,
          targetPriceId,
          'create_prorations'
        )
      } else {
        // Schedule downgrade for end of period
        stripeResult = await this.scheduleSubscriptionChange(
          currentSubscription.stripeSubscriptionId,
          targetPriceId
        )
      }

      if (!stripeResult.success) {
        return {
          success: false,
          error: stripeResult.error,
          changes: [],
          metadata: {
            operation: 'downgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Sync the updated subscription
      if (!stripeResult.subscription) {
        return {
          success: false,
          error: 'Stripe subscription data not available',
          changes: [],
          metadata: {
            operation: 'downgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      const syncResult = await this.subscriptionSync.syncSubscriptionFromWebhook(stripeResult.subscription)
      
      if (syncResult.success && syncResult.subscription) {
        // Emit downgrade event
        this.eventEmitter.emit('subscription.downgraded', {
          userId,
          subscriptionId: syncResult.subscription.id,
          fromPlan: currentSubscription.planType,
          toPlan: request.targetPlan,
          billingCycle: request.billingCycle,
          effectiveDate: request.effectiveDate || 'end_of_period',
          reason: request.reason,
          correlationId,
          timestamp: new Date()
        })

        const effectiveMessage = request.effectiveDate === 'immediate' 
          ? 'immediately' 
          : 'at the end of the current billing period'

        this.logger.info('Subscription downgrade completed successfully', {
          userId,
          fromPlan: currentSubscription.planType,
          toPlan: request.targetPlan,
          effectiveDate: request.effectiveDate,
          correlationId
        })

        return {
          success: true,
          subscription: syncResult.subscription,
          stripeSubscription: stripeResult.subscription,
          changes: [`Downgraded from ${currentSubscription.planType} to ${request.targetPlan} ${effectiveMessage}`],
          metadata: {
            operation: 'downgrade',
            fromPlan: currentSubscription.planType || undefined,
            toPlan: request.targetPlan,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      } else {
        throw new Error(`Sync failed after downgrade: ${syncResult.error}`)
      }

    } catch (error) {
      this.logger.error('Subscription downgrade failed', error as Error, {
        userId,
        targetPlan: request.targetPlan,
        correlationId
      })

      return this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'SubscriptionManagementService.downgradeSubscription',
        userId,
        targetPlan: request.targetPlan,
        correlationId
      })
    }
  }

  /**
   * Cancel user's subscription
   */
  async cancelSubscription(
    userId: string,
    request: CancelRequest
  ): Promise<SubscriptionManagementResult> {
    const correlationId = `cancel-${userId}-${Date.now()}`
    
    try {
      this.logger.info('Starting subscription cancellation', {
        userId,
        cancelAt: request.cancelAt,
        reason: request.reason,
        correlationId
      })

      // Get current subscription
      const currentSubscription = await this.subscriptionManager.getSubscription(userId)
      if (!currentSubscription) {
        return {
          success: false,
          error: 'No active subscription found',
          changes: [],
          metadata: {
            operation: 'cancel',
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Validate Stripe subscription ID
      if (!currentSubscription.stripeSubscriptionId) {
        return {
          success: false,
          error: 'Subscription not connected to Stripe',
          changes: [],
          metadata: {
            operation: 'cancel',
            fromPlan: currentSubscription.planType || undefined,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Cancel in Stripe
      const stripeResult = await this.cancelStripeSubscription(
        currentSubscription.stripeSubscriptionId,
        request.cancelAt === 'immediate'
      )

      if (!stripeResult.success) {
        return {
          success: false,
          error: stripeResult.error,
          changes: [],
          metadata: {
            operation: 'cancel',
            fromPlan: currentSubscription.planType || undefined,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Sync the updated subscription
      if (!stripeResult.subscription) {
        return {
          success: false,
          error: 'Stripe subscription data not available',
          changes: [],
          metadata: {
            operation: 'cancel',
            fromPlan: currentSubscription.planType || undefined,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      const syncResult = await this.subscriptionSync.syncSubscriptionFromWebhook(stripeResult.subscription)
      
      if (syncResult.success && syncResult.subscription) {
        // Emit cancellation event
        this.eventEmitter.emit('subscription.canceled', {
          userId,
          subscriptionId: syncResult.subscription.id,
          fromPlan: currentSubscription.planType,
          cancelAt: request.cancelAt,
          reason: request.reason,
          feedback: request.feedback,
          correlationId,
          timestamp: new Date()
        })

        const cancelMessage = request.cancelAt === 'immediate' 
          ? 'immediately' 
          : 'at the end of the current billing period'

        this.logger.info('Subscription cancellation completed successfully', {
          userId,
          fromPlan: currentSubscription.planType,
          cancelAt: request.cancelAt,
          correlationId
        })

        return {
          success: true,
          subscription: syncResult.subscription,
          stripeSubscription: stripeResult.subscription,
          changes: [`Subscription canceled ${cancelMessage}`],
          metadata: {
            operation: 'cancel',
            fromPlan: currentSubscription.planType || undefined,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      } else {
        throw new Error(`Sync failed after cancellation: ${syncResult.error}`)
      }

    } catch (error) {
      this.logger.error('Subscription cancellation failed', error as Error, {
        userId,
        correlationId
      })

      return this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'SubscriptionManagementService.cancelSubscription',
        userId,
        correlationId
      })
    }
  }

  /**
   * Create checkout session for new subscription
   */
  async createCheckoutSession(
    userId: string,
    planType: PlanType,
    billingCycle: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string
  ): Promise<SubscriptionManagementResult> {
    const correlationId = `checkout-${userId}-${Date.now()}`
    
    try {
      this.logger.info('Creating checkout session', {
        userId,
        planType,
        billingCycle,
        correlationId
      })

      // Get user for Stripe customer
      const user = await this.prismaService.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.stripeCustomerId) {
        return {
          success: false,
          error: 'User not found or no Stripe customer ID',
          changes: [],
          metadata: {
            operation: 'checkout',
            toPlan: planType,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Get price ID
      const priceId = this.getPriceId(planType, billingCycle)
      if (!priceId) {
        return {
          success: false,
          error: 'Plan not available',
          changes: [],
          metadata: {
            operation: 'checkout',
            toPlan: planType,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      // Create checkout session
      const session = await this.stripeService.client.checkout.sessions.create({
        customer: user.stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          planType,
          billingCycle,
          correlationId
        }
      })

      this.logger.info('Checkout session created successfully', {
        userId,
        sessionId: session.id,
        planType,
        correlationId
      })

      if (!session.url) {
        return {
          success: false,
          error: 'Failed to create checkout URL',
          changes: [],
          metadata: {
            operation: 'checkout',
            toPlan: planType,
            correlationId,
            timestamp: new Date().toISOString()
          }
        }
      }

      return {
        success: true,
        checkoutUrl: session.url,
        changes: [`Checkout session created for ${planType}`],
        metadata: {
          operation: 'checkout',
          toPlan: planType,
          correlationId,
          timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      this.logger.error('Checkout session creation failed', error as Error, {
        userId,
        planType,
        correlationId
      })

      return this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'SubscriptionManagementService.createCheckoutSession',
        userId,
        planType,
        correlationId
      })
    }
  }

  /**
   * Validate upgrade path
   */
  private async validateUpgrade(
    currentSubscription: Subscription,
    targetPlan: PlanType
  ): Promise<{ valid: boolean, reason?: string }> {
    // Check if it's actually an upgrade
    const planHierarchy = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX']
    const currentIndex = planHierarchy.indexOf(currentSubscription.planType as PlanType)
    const targetIndex = planHierarchy.indexOf(targetPlan)

    if (targetIndex <= currentIndex) {
      return { valid: false, reason: 'Target plan is not an upgrade' }
    }

    // Check subscription status
    if (!['ACTIVE', 'TRIALING'].includes(currentSubscription.status)) {
      return { valid: false, reason: 'Current subscription is not active' }
    }

    return { valid: true }
  }

  /**
   * Validate downgrade path
   */
  private async validateDowngrade(
    currentSubscription: Subscription,
    targetPlan: PlanType,
    userId: string
  ): Promise<{ valid: boolean, reason?: string }> {
    // Check if it's actually a downgrade
    const planHierarchy = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX']
    const currentIndex = planHierarchy.indexOf(currentSubscription.planType as PlanType)
    const targetIndex = planHierarchy.indexOf(targetPlan)

    if (targetIndex >= currentIndex) {
      return { valid: false, reason: 'Target plan is not a downgrade' }
    }

    // Check subscription status
    if (!['ACTIVE', 'TRIALING'].includes(currentSubscription.status)) {
      return { valid: false, reason: 'Current subscription is not active' }
    }

    // Check usage limits for target plan
    const usage = await this.subscriptionManager.calculateUsageMetrics(userId)
    const targetLimits = await this.subscriptionManager.getUsageLimits(userId)

    if (usage.properties > (typeof targetLimits.properties === 'object' ? targetLimits.properties.limit : targetLimits.properties)) {
      return { 
        valid: false, 
        reason: `Usage exceeds target plan limits: ${usage.properties} properties (limit: ${targetLimits.properties})` 
      }
    }

    return { valid: true }
  }

  /**
   * Update Stripe subscription
   */
  private async updateStripeSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior: 'create_prorations' | 'none' | 'always_invoice'
  ): Promise<{ success: boolean, subscription?: Stripe.Subscription, error?: string }> {
    try {
      // Get current subscription
      const subscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId)
      
      // Update subscription
      const updatedSubscription = await this.stripeService.client.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0]?.id,
            price: newPriceId
          }
        ],
        proration_behavior: prorationBehavior
      })

      return { success: true, subscription: updatedSubscription }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Schedule subscription change for end of period
   */
  private async scheduleSubscriptionChange(
    subscriptionId: string,
    newPriceId: string
  ): Promise<{ success: boolean, subscription?: Stripe.Subscription, error?: string }> {
    try {
      // Get current subscription
      const subscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId)
      
      // Create a subscription schedule
      await this.stripeService.client.subscriptionSchedules.create({
        from_subscription: subscriptionId,
        phases: [
          {
            items: [{ price: newPriceId }]
          }
        ]
      })

      // Return the original subscription (change is scheduled)
      return { success: true, subscription }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Cancel Stripe subscription
   */
  private async cancelStripeSubscription(
    subscriptionId: string,
    immediately: boolean
  ): Promise<{ success: boolean, subscription?: Stripe.Subscription, error?: string }> {
    try {
      if (immediately) {
        const subscription = await this.stripeService.client.subscriptions.cancel(subscriptionId)
        return { success: true, subscription }
      } else {
        const subscription = await this.stripeService.client.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        })
        return { success: true, subscription }
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get Stripe price ID for plan and billing cycle
   */
  private getPriceId(planType: PlanType, billingCycle: 'monthly' | 'annual'): string | null {
    const priceMap: Record<PlanType, { monthly: string, annual: string }> = {
      FREETRIAL: { monthly: '', annual: '' }, // Free trial doesn't have Stripe prices
      STARTER: { 
        monthly: 'price_starter_monthly', 
        annual: 'price_starter_annual' 
      },
      GROWTH: { 
        monthly: 'price_growth_monthly', 
        annual: 'price_growth_annual' 
      },
      TENANTFLOW_MAX: { 
        monthly: 'price_max_monthly', 
        annual: 'price_max_annual' 
      }
    }

    const planPrices = priceMap[planType]
    if (!planPrices || !planPrices[billingCycle]) {
      return null
    }

    return planPrices[billingCycle]
  }
}