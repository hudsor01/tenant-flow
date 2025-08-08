import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
// Debug decorators removed to fix compilation issues
import { BILLING_PLANS, getPlanById } from '../shared/constants/billing-plans'
import type { PlanType, SubStatus } from '@repo/database'
import type Stripe from 'stripe'
import { MeasureMethod, AsyncTimeout } from '../common/performance/performance.decorators'
import { 
    getProductTier, 
    getStripePriceId
} from '@repo/shared'

export interface CreateSubscriptionParams {
    userId: string
    planType?: PlanType
    priceId?: string
    billingInterval?: 'monthly' | 'annual'
    paymentMethodId?: string
    automaticTax?: boolean
    trialDays?: number
    couponId?: string
}

export interface SubscriptionResult {
    subscriptionId: string
    clientSecret?: string
    status: string
    paymentIntentId?: string
    priceId: string
    customerId: string
}

export interface BillingConfig {
    trialDays: number
    automaticTax: boolean
    defaultPaymentBehavior: 'default_incomplete' | 'allow_incomplete' | 'error_if_incomplete'
}

/**
 * Unified Stripe Billing Service
 * 
 * Consolidates subscription management, customer handling, and billing operations
 * into a single, cohesive service with multiple creation patterns.
 */
// @DetectCircular('StripeBillingService')
// @ProfileModule('StripeBillingService') 
// @TraceInjections
@Injectable()
export class StripeBillingService {
    // 🚨 DEBUG: Adding static property to verify class is being loaded
    static readonly DEBUG_TOKEN = 'STRIPE_BILLING_SERVICE_LOADED';
    private readonly logger = new Logger(StripeBillingService.name)
    
    // PERFORMANCE: Lazy-initialize config to avoid blocking constructor
    private _defaultConfig?: BillingConfig
    private get defaultConfig(): BillingConfig {
        if (!this._defaultConfig) {
            this._defaultConfig = {
                trialDays: 14, // Default trial days, can be overridden per plan
                automaticTax: true,
                defaultPaymentBehavior: 'default_incomplete'
            }
        }
        return this._defaultConfig
    }
    
    /**
     * Get trial configuration for a specific plan
     */
    private getTrialConfigForPlan(planType: PlanType) {
        const tier = getProductTier(planType)
        return tier.trial
    }

    constructor(
        @Inject(StripeService) private readonly stripeService: StripeService,
        @Inject(PrismaService) private readonly prismaService: PrismaService,
        @Inject(ErrorHandlerService) private readonly errorHandler: ErrorHandlerService
    ) {
        // PERFORMANCE: Minimize constructor work - just store dependencies
        // No logging or validation to speed up initialization
    }

    /**
     * Unified subscription creation method
     * Supports both plan-based and direct price-based subscriptions
     */
    @MeasureMethod(200) // Warn if over 200ms
    @AsyncTimeout(10000, 'Subscription creation timed out')
    async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
        try {
            // Validate input parameters
            if (!params.planType && !params.priceId) {
                throw this.errorHandler.createValidationError(
                    'Either planType or priceId must be provided'
                )
            }

            const user = await this.getUserWithSubscription(params.userId)
            const customerId = await this.ensureStripeCustomer(user)
            
            // Determine plan type and price ID
            const planType = params.planType || 'STARTER'
            const priceId = params.priceId || this.getPriceIdFromPlan(
                planType,
                params.billingInterval || 'monthly'
            )
            
            // Get trial configuration for the specific plan
            const trialConfig = this.getTrialConfigForPlan(planType)
            const trialDays = params.trialDays ?? trialConfig.trialPeriodDays

            // Create subscription with appropriate payment behavior
            const subscriptionData = await this.createStripeSubscription({
                customerId,
                priceId,
                paymentMethodId: params.paymentMethodId,
                trialDays,
                trialConfig,
                automaticTax: params.automaticTax ?? this.defaultConfig.automaticTax,
                couponId: params.couponId,
                planType
            })

            // Store subscription in database
            await this.storeSubscriptionInDatabase({
                userId: params.userId,
                subscriptionData,
                planType: params.planType,
                priceId
            })

            const invoice = subscriptionData.latest_invoice as Stripe.Invoice | null
            let clientSecret: string | undefined
            let paymentIntentId: string | undefined

            if (invoice && 'payment_intent' in invoice) {
                const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | string | null
                if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
                    clientSecret = paymentIntent.client_secret || undefined
                    paymentIntentId = paymentIntent.id
                } else if (typeof paymentIntent === 'string') {
                    paymentIntentId = paymentIntent
                }
            }

            return {
                subscriptionId: subscriptionData.id,
                clientSecret,
                status: subscriptionData.status,
                paymentIntentId,
                priceId,
                customerId
            }

        } catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error as Error, {
                operation: 'createSubscription',
                resource: 'subscription',
                metadata: { userId: params.userId, planType: params.planType }
            })
        }
    }

    /**
     * Create checkout session for hosted payment page
     */
    @MeasureMethod(150)
    @AsyncTimeout(8000, 'Checkout session creation timed out')
    async createCheckoutSession(params: {
        userId: string
        planType: PlanType
        billingInterval: 'monthly' | 'annual'
        successUrl: string
        cancelUrl: string
        couponId?: string
    }): Promise<{ sessionId: string; url: string }> {
        try {
            const user = await this.getUserWithSubscription(params.userId)
            const customerId = await this.ensureStripeCustomer(user)
            const priceId = this.getPriceIdFromPlan(params.planType, params.billingInterval)
            
            // Get trial configuration for the specific plan
            const trialConfig = this.getTrialConfigForPlan(params.planType)
            const trialEndBehavior = trialConfig.trialEndBehavior === 'cancel' ? 'cancel' : 'pause'

            const sessionParams: Stripe.Checkout.SessionCreateParams = {
                customer: customerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1
                }],
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                subscription_data: {
                    trial_period_days: trialConfig.trialPeriodDays,
                    metadata: {
                        userId: params.userId,
                        planType: params.planType
                    },
                    trial_settings: {
                        end_behavior: {
                            missing_payment_method: trialEndBehavior
                        }
                    }
                },
                automatic_tax: {
                    enabled: this.defaultConfig.automaticTax
                },
                payment_method_collection: trialConfig.collectPaymentMethod ? 'always' : 'if_required'
            }

            if (params.couponId) {
                sessionParams.discounts = [{ coupon: params.couponId }]
            }

            const session = await this.stripeService.client.checkout.sessions.create(sessionParams)

            return {
                sessionId: session.id,
                url: session.url || ''
            }

        } catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error as Error, {
                operation: 'createCheckoutSession',
                resource: 'checkout',
                metadata: { userId: params.userId }
            })
        }
    }

    /**
     * Update existing subscription
     */
    @MeasureMethod(200)
    @AsyncTimeout(10000, 'Subscription update timed out')
    async updateSubscription(params: {
        subscriptionId: string
        userId: string
        newPriceId?: string
        newPlanType?: PlanType
        billingInterval?: 'monthly' | 'annual'
        prorationBehavior?: 'none' | 'create_prorations' | 'always_invoice'
    }): Promise<SubscriptionResult> {
        try {
            const subscription = await this.stripeService.client.subscriptions.retrieve(params.subscriptionId)
            
            if (!subscription) {
                throw this.errorHandler.createNotFoundError('Subscription', params.subscriptionId)
            }

            const priceId = params.newPriceId || this.getPriceIdFromPlan(
                params.newPlanType || 'STARTER',
                params.billingInterval || 'monthly'
            )

            const updatedSubscription = await this.stripeService.client.subscriptions.update(
                params.subscriptionId,
                {
                    items: [{
                        id: subscription.items.data[0]?.id,
                        price: priceId
                    }],
                    proration_behavior: params.prorationBehavior || 'create_prorations'
                }
            )

            // Update database record
            await this.updateSubscriptionInDatabase({
                userId: params.userId,
                subscriptionData: updatedSubscription,
                planType: params.newPlanType,
                priceId
            })

            return {
                subscriptionId: updatedSubscription.id,
                status: updatedSubscription.status,
                priceId,
                customerId: typeof updatedSubscription.customer === 'string' 
                    ? updatedSubscription.customer 
                    : updatedSubscription.customer.id
            }

        } catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error as Error, {
                operation: 'updateSubscription',
                resource: 'subscription',
                metadata: { subscriptionId: params.subscriptionId, userId: params.userId }
            })
        }
    }

    /**
     * Create portal session for customers to manage billing/payment methods
     */
    async createCustomerPortalSession(params: {
        userId: string
        returnUrl: string
    }): Promise<{ url: string }> {
        try {
            const user = await this.getUserWithSubscription(params.userId)
            const customerId = await this.ensureStripeCustomer(user)

            const session = await this.stripeService.client.billingPortal.sessions.create({
                customer: customerId,
                return_url: params.returnUrl
            })

            return { url: session.url }

        } catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error as Error, {
                operation: 'createCustomerPortalSession',
                resource: 'portal_session',
                metadata: { userId: params.userId }
            })
        }
    }

    /**
     * Reactivate a paused subscription with payment method
     */
    async reactivateSubscription(params: {
        userId: string
        subscriptionId: string
        paymentMethodId: string
    }): Promise<{ status: string }> {
        try {
            // Update customer's default payment method
            const user = await this.getUserWithSubscription(params.userId)
            const customerId = await this.ensureStripeCustomer(user)

            await this.stripeService.client.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: params.paymentMethodId
                }
            })

            // Resume the subscription
            const subscription = await this.stripeService.client.subscriptions.update(
                params.subscriptionId,
                {
                    default_payment_method: params.paymentMethodId,
                    pause_collection: null // Remove pause
                }
            )

            // Update database
            await this.prismaService.subscription.updateMany({
                where: { 
                    stripeSubscriptionId: params.subscriptionId,
                    userId: params.userId
                },
                data: {
                    status: subscription.status as SubStatus
                }
            })

            return { status: subscription.status }

        } catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error as Error, {
                operation: 'reactivateSubscription',
                resource: 'subscription',
                metadata: { subscriptionId: params.subscriptionId, userId: params.userId }
            })
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(params: {
        subscriptionId: string
        userId: string
        immediately?: boolean
        cancellationReason?: string
    }): Promise<{ status: string; canceledAt?: number }> {
        try {
            const cancelParams: Stripe.SubscriptionUpdateParams = {
                metadata: {
                    cancellation_reason: params.cancellationReason || 'user_requested'
                }
            }

            let subscription: Stripe.Subscription

            if (params.immediately) {
                subscription = await this.stripeService.client.subscriptions.cancel(params.subscriptionId)
            } else {
                subscription = await this.stripeService.client.subscriptions.update(
                    params.subscriptionId,
                    { ...cancelParams, cancel_at_period_end: true }
                )
            }

            // Update database
            await this.prismaService.subscription.updateMany({
                where: { 
                    stripeSubscriptionId: params.subscriptionId,
                    userId: params.userId
                },
                data: {
                    status: subscription.status as SubStatus,
                    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
                }
            })

            return {
                status: subscription.status,
                canceledAt: subscription.canceled_at || undefined
            }

        } catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error as Error, {
                operation: 'cancelSubscription',
                resource: 'subscription',
                metadata: { subscriptionId: params.subscriptionId, userId: params.userId }
            })
        }
    }

    // Private helper methods

    private async getUserWithSubscription(userId: string) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: { Subscription: true }
        })

        if (!user) {
            throw this.errorHandler.createNotFoundError('User', userId)
        }

        return user
    }

    private async ensureStripeCustomer(user: { id: string; email: string; name?: string | null; Subscription?: { stripeCustomerId?: string | null }[] }): Promise<string> {
        let customerId = user.Subscription?.[0]?.stripeCustomerId

        if (!customerId) {
            const customer = await this.stripeService.createCustomer({
                email: user.email,
                name: user.name || undefined,
                metadata: { userId: user.id }
            })
            customerId = customer.id
            
            // Store the Stripe customer ID back to the User table for future reference
            await this.prismaService.user.update({
                where: { id: user.id },
                data: { 
                    stripeCustomerId: customerId,
                    updatedAt: new Date()
                }
            })
            
            this.logger.debug('Created and linked Stripe customer', {
                userId: user.id,
                customerId,
                email: user.email
            })
        }

        return customerId
    }

    // PERFORMANCE: Cache plan lookups to avoid repeated env var access
    private readonly planCache = new Map<string, ReturnType<typeof getPlanById>>()
    
    private getPriceIdFromPlan(planType: PlanType, billingInterval: 'monthly' | 'annual'): string {
        // First try the new pricing configuration from shared package
        const priceId = getStripePriceId(planType, billingInterval)
        
        if (priceId) {
            return priceId
        }
        
        // Fall back to legacy BILLING_PLANS for backward compatibility
        let plan = this.planCache.get(planType)
        if (!plan) {
            plan = getPlanById(planType)
            if (plan) {
                this.planCache.set(planType, plan)
            }
        }
        
        if (!plan) {
            throw this.errorHandler.createValidationError(`Invalid plan type: ${planType}`)
        }

        const legacyPriceId = billingInterval === 'annual' ? plan.stripeAnnualPriceId : plan.stripeMonthlyPriceId
        if (!legacyPriceId) {
            throw this.errorHandler.createValidationError(
                `No ${billingInterval} price configured for plan: ${planType}`
            )
        }

        return legacyPriceId
    }

    private async createStripeSubscription(params: {
        customerId: string
        priceId: string
        paymentMethodId?: string
        trialDays: number
        trialConfig?: { trialPeriodDays?: number; collectPaymentMethod?: boolean, trialEndBehavior?: 'cancel' | 'pause' | 'require_payment' } // Trial configuration from pricing
        automaticTax: boolean
        couponId?: string
        planType?: PlanType
    }): Promise<Stripe.Subscription> {
        const subscriptionData: Stripe.SubscriptionCreateParams = {
            customer: params.customerId,
            items: [{ price: params.priceId }],
            payment_behavior: this.defaultConfig.defaultPaymentBehavior,
            payment_settings: {
                save_default_payment_method: 'on_subscription'
            },
            expand: ['latest_invoice.payment_intent'],
            trial_period_days: params.trialDays,
            automatic_tax: {
                enabled: params.automaticTax
            }
        }

        // Add trial settings if we have trial configuration
        if (params.trialConfig && params.trialDays > 0) {
            const trialEndBehavior = params.trialConfig.trialEndBehavior === 'cancel' ? 'cancel' : 'pause'
            subscriptionData.trial_settings = {
                end_behavior: {
                    missing_payment_method: trialEndBehavior
                }
            }
            
            // Set payment collection based on trial config
            if (params.trialConfig.collectPaymentMethod) {
                subscriptionData.payment_behavior = 'default_incomplete' 
            } else {
                subscriptionData.payment_behavior = 'allow_incomplete'
            }
        }

        if (params.paymentMethodId) {
            subscriptionData.default_payment_method = params.paymentMethodId
        }

        if (params.couponId) {
            subscriptionData.discounts = [{ coupon: params.couponId }]
        }
        
        // Add metadata for better tracking
        subscriptionData.metadata = {
            planType: params.planType || 'STARTER',
            customerId: params.customerId
        }

        return await this.stripeService.client.subscriptions.create(subscriptionData)
    }

    private async storeSubscriptionInDatabase(params: {
        userId: string
        subscriptionData: Stripe.Subscription
        planType?: PlanType
        priceId: string
    }) {
        const customerId = typeof params.subscriptionData.customer === 'string' 
            ? params.subscriptionData.customer 
            : params.subscriptionData.customer.id

        const statusMap: Record<Stripe.Subscription.Status, SubStatus> = {
            trialing: 'TRIALING',
            active: 'ACTIVE', 
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'INCOMPLETE_EXPIRED',
            paused: 'INCOMPLETE'
        }

        await this.prismaService.subscription.upsert({
            where: { userId: params.userId },
            create: {
                userId: params.userId,
                stripeSubscriptionId: params.subscriptionData.id,
                stripeCustomerId: customerId,
                status: statusMap[params.subscriptionData.status] as SubStatus,
                planType: params.planType || 'STARTER',
                stripePriceId: params.priceId,
                currentPeriodStart: params.subscriptionData.items?.data?.[0]?.current_period_start 
                    ? new Date(params.subscriptionData.items.data[0].current_period_start * 1000) 
                    : null,
                currentPeriodEnd: params.subscriptionData.items?.data?.[0]?.current_period_end 
                    ? new Date(params.subscriptionData.items.data[0].current_period_end * 1000) 
                    : null,
                trialStart: params.subscriptionData.trial_start 
                    ? new Date(params.subscriptionData.trial_start * 1000) 
                    : null,
                trialEnd: params.subscriptionData.trial_end 
                    ? new Date(params.subscriptionData.trial_end * 1000) 
                    : null,
            },
            update: {
                stripeSubscriptionId: params.subscriptionData.id,
                status: statusMap[params.subscriptionData.status] as SubStatus,
                planType: params.planType || 'STARTER',
                stripePriceId: params.priceId,
                currentPeriodStart: params.subscriptionData.items?.data?.[0]?.current_period_start 
                    ? new Date(params.subscriptionData.items.data[0].current_period_start * 1000) 
                    : null,
                currentPeriodEnd: params.subscriptionData.items?.data?.[0]?.current_period_end 
                    ? new Date(params.subscriptionData.items.data[0].current_period_end * 1000) 
                    : null,
            }
        })
    }

    private async updateSubscriptionInDatabase(params: {
        userId: string
        subscriptionData: Stripe.Subscription
        planType?: PlanType
        priceId: string
    }) {
        const statusMap: Record<Stripe.Subscription.Status, SubStatus> = {
            trialing: 'TRIALING',
            active: 'ACTIVE', 
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'INCOMPLETE_EXPIRED',
            paused: 'INCOMPLETE'
        }

        await this.prismaService.subscription.updateMany({
            where: { 
                userId: params.userId,
                stripeSubscriptionId: params.subscriptionData.id
            },
            data: {
                status: statusMap[params.subscriptionData.status] as SubStatus,
                planType: params.planType,
                stripePriceId: params.priceId,
                currentPeriodStart: params.subscriptionData.items?.data?.[0]?.current_period_start 
                    ? new Date(params.subscriptionData.items.data[0].current_period_start * 1000) 
                    : null,
                currentPeriodEnd: params.subscriptionData.items?.data?.[0]?.current_period_end 
                    ? new Date(params.subscriptionData.items.data[0].current_period_end * 1000) 
                    : null,
            }
        })
    }

    /**
     * Sync subscription from Stripe webhook events
     */
    async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
        // Find user by customer ID
        const subscription = await this.prismaService.subscription.findFirst({
            where: { stripeCustomerId: stripeSubscription.customer as string }
        })

        if (!subscription) {
            this.logger.warn(`No subscription found for customer ${stripeSubscription.customer}`)
            return
        }

        // Map Stripe status to our status
        const status = this.mapStripeStatus(stripeSubscription.status)

        // Determine plan type from price ID
        const priceId = stripeSubscription.items.data[0]?.price.id
        const planType = priceId ? this.getPlanTypeFromPriceId(priceId) : subscription.planType

        // Update subscription
        await this.prismaService.subscription.update({
            where: { id: subscription.id },
            data: {
                stripeSubscriptionId: stripeSubscription.id,
                status: status,
                planType,
                stripePriceId: priceId,
                currentPeriodStart: stripeSubscription.items?.data?.[0]?.current_period_start 
                    ? new Date(stripeSubscription.items.data[0].current_period_start * 1000) 
                    : null,
                currentPeriodEnd: stripeSubscription.items?.data?.[0]?.current_period_end 
                    ? new Date(stripeSubscription.items.data[0].current_period_end * 1000) 
                    : null,
                trialStart: stripeSubscription.trial_start 
                    ? new Date(stripeSubscription.trial_start * 1000) 
                    : null,
                trialEnd: stripeSubscription.trial_end 
                    ? new Date(stripeSubscription.trial_end * 1000) 
                    : null,
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                canceledAt: stripeSubscription.canceled_at 
                    ? new Date(stripeSubscription.canceled_at * 1000) 
                    : null
            }
        })
    }

    /**
     * Handle subscription deleted webhook
     */
    async handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void> {
        await this.prismaService.subscription.updateMany({
            where: { stripeSubscriptionId },
            data: {
                status: 'CANCELED',
                cancelAtPeriodEnd: false,
                canceledAt: new Date()
            }
        })
    }

    private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubStatus {
        const statusMap: Record<Stripe.Subscription.Status, SubStatus> = {
            trialing: 'TRIALING',
            active: 'ACTIVE', 
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'INCOMPLETE_EXPIRED',
            paused: 'INCOMPLETE' // Map paused to incomplete (official status for paused trials)
        }

        return statusMap[stripeStatus] || 'CANCELED'
    }

    // PERFORMANCE: Cache reverse lookups (priceId -> planType)
    private readonly priceIdToPlanCache = new Map<string, PlanType | null>()
    
    private getPlanTypeFromPriceId(priceId: string): PlanType | null {
        if (this.priceIdToPlanCache.has(priceId)) {
            return this.priceIdToPlanCache.get(priceId) || null
        }
        
        for (const [planType, plan] of Object.entries(BILLING_PLANS)) {
            const typedPlan = plan as { stripeMonthlyPriceId?: string; stripeAnnualPriceId?: string }
            if (typedPlan.stripeMonthlyPriceId === priceId || typedPlan.stripeAnnualPriceId === priceId) {
                const result = planType as PlanType
                this.priceIdToPlanCache.set(priceId, result)
                return result
            }
        }
        
        this.priceIdToPlanCache.set(priceId, null)
        return null
    }
}