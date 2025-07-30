import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BILLING_PLANS, getPlanById } from '../shared/constants/billing-plans'
import type { PlanType, SubStatus } from '@prisma/client'
import type Stripe from 'stripe'

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
@Injectable()
export class StripeBillingService {
    private readonly logger = new Logger(StripeBillingService.name)
    
    private readonly defaultConfig: BillingConfig = {
        trialDays: 14,
        automaticTax: true,
        defaultPaymentBehavior: 'default_incomplete'
    }

    constructor(
        private readonly stripeService: StripeService,
        private readonly prismaService: PrismaService,
        private readonly errorHandler: ErrorHandlerService
    ) {}

    /**
     * Unified subscription creation method
     * Supports both plan-based and direct price-based subscriptions
     */
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
            
            // Determine price ID
            const priceId = params.priceId || this.getPriceIdFromPlan(
                params.planType!,
                params.billingInterval || 'monthly'
            )

            // Create subscription with appropriate payment behavior
            const subscriptionData = await this.createStripeSubscription({
                customerId,
                priceId,
                paymentMethodId: params.paymentMethodId,
                trialDays: params.trialDays || this.defaultConfig.trialDays,
                automaticTax: params.automaticTax ?? this.defaultConfig.automaticTax,
                couponId: params.couponId
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
                    trial_period_days: this.defaultConfig.trialDays,
                    metadata: {
                        userId: params.userId,
                        planType: params.planType
                    },
                    trial_settings: {
                        end_behavior: {
                            missing_payment_method: 'pause'
                        }
                    }
                },
                automatic_tax: {
                    enabled: this.defaultConfig.automaticTax
                },
                payment_method_collection: 'if_required'
            }

            if (params.couponId) {
                sessionParams.discounts = [{ coupon: params.couponId }]
            }

            const session = await this.stripeService.client.checkout.sessions.create(sessionParams)

            return {
                sessionId: session.id,
                url: session.url!
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
                params.newPlanType!,
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
        }

        return customerId
    }

    private getPriceIdFromPlan(planType: PlanType, billingInterval: 'monthly' | 'annual'): string {
        const plan = getPlanById(planType)
        if (!plan) {
            throw this.errorHandler.createValidationError(`Invalid plan type: ${planType}`)
        }

        const priceId = billingInterval === 'annual' ? plan.stripeAnnualPriceId : plan.stripeMonthlyPriceId
        if (!priceId) {
            throw this.errorHandler.createValidationError(
                `No ${billingInterval} price configured for plan: ${planType}`
            )
        }

        return priceId
    }

    private async createStripeSubscription(params: {
        customerId: string
        priceId: string
        paymentMethodId?: string
        trialDays: number
        automaticTax: boolean
        couponId?: string
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

        if (params.paymentMethodId) {
            subscriptionData.default_payment_method = params.paymentMethodId
        }

        if (params.couponId) {
            subscriptionData.discounts = [{ coupon: params.couponId }]
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

    private getPlanTypeFromPriceId(priceId: string): PlanType | null {
        for (const [planType, plan] of Object.entries(BILLING_PLANS)) {
            if (plan.stripeMonthlyPriceId === priceId || plan.stripeAnnualPriceId === priceId) {
                return planType as PlanType
            }
        }
        return null
    }
}