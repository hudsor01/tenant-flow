import { z } from 'zod'
import { createRouter, protectedProcedure } from '../trpc'
import type { SubscriptionService } from '../../stripe/subscription.service'
import type { SubscriptionsService } from '../../subscriptions/subscriptions.service'
import { PLAN_TYPE } from '@tenantflow/shared'

export const createSubscriptionsRouter = (services: {
	subscriptionService: SubscriptionService
	subscriptionsService: SubscriptionsService
}) => {
	return createRouter({
		// Get current user's subscription
		current: protectedProcedure.query(async ({ ctx }) => {
			return services.subscriptionsService.getSubscription(ctx.user.id)
		}),

		// Create checkout session for subscription
		createCheckoutSession: protectedProcedure
			.input(
				z.object({
					planType: z.nativeEnum(PLAN_TYPE).refine(type => type !== PLAN_TYPE.FREE),
					billingInterval: z.enum(['monthly', 'annual']),
					collectPaymentMethod: z.boolean().default(false),
					successUrl: z.string().url(),
					cancelUrl: z.string().url(),
					uiMode: z.enum(['embedded', 'hosted']).optional()
				})
			)
			.mutation(async ({ input, ctx }) => {
				const result = await services.subscriptionService.createCheckoutSession({
					userId: ctx.user.id,
					planType: input.planType,
					billingInterval: input.billingInterval,
					collectPaymentMethod: input.collectPaymentMethod,
					successUrl: input.successUrl,
					cancelUrl: input.cancelUrl,
					uiMode: input.uiMode
				})

				return result
			}),

		// Create customer portal session
		createPortalSession: protectedProcedure
			.input(
				z.object({
					returnUrl: z.string().url()
				})
			)
			.mutation(async ({ input, ctx }) => {
				const url = await services.subscriptionService.createPortalSession(
					ctx.user.id,
					input.returnUrl
				)

				return { url }
			}),

		// Start free trial without payment method
		startFreeTrial: protectedProcedure.mutation(async ({ ctx }) => {
			const result = await services.subscriptionService.startFreeTrial(ctx.user.id)
			return { 
				success: true, 
				subscriptionId: result.subscriptionId,
				status: result.status,
				trialEnd: result.trialEnd
			}
		}),

		// Create subscription directly (new pattern from Stripe sample)
		createDirect: protectedProcedure
			.input(
				z.object({
					priceId: z.string(),
					planType: z.nativeEnum(PLAN_TYPE)
				})
			)
			.mutation(async ({ input, ctx }) => {
				// Determine billing interval from price ID
				const billingInterval = input.priceId.includes('annual') ? 'annual' : 'monthly'
				
				return services.subscriptionService.createSubscription({
					userId: ctx.user.id,
					planType: input.planType,
					billingInterval: billingInterval as 'monthly' | 'annual'
				})
			}),

		// Update subscription plan directly
		updateDirect: protectedProcedure
			.input(
				z.object({
					subscriptionId: z.string(),
					newPriceId: z.string()
				})
			)
			.mutation(async ({ input, ctx }) => {
				return services.subscriptionService.updateSubscriptionPlan({
					userId: ctx.user.id,
					newPriceId: input.newPriceId
				})
			}),

		// Cancel subscription
		cancel: protectedProcedure
			.input(
				z.object({
					subscriptionId: z.string(),
					cancelAtPeriodEnd: z.boolean().default(true)
				})
			)
			.mutation(async ({ input, ctx }) => {
				return services.subscriptionService.cancelSubscription({
					userId: ctx.user.id,
					cancelAtPeriodEnd: input.cancelAtPeriodEnd
				})
			}),

		// Preview subscription update
		previewUpdate: protectedProcedure
			.input(
				z.object({
					subscriptionId: z.string(),
					newPriceId: z.string()
				})
			)
			.mutation(async ({ input, ctx }) => {
				const preview = await services.subscriptionService.previewSubscriptionChange({
					userId: ctx.user.id,
					newPriceId: input.newPriceId
				})

				// Extract relevant preview data
				return {
					proratedAmount: preview.amount_due / 100,
					immediatePayment: preview.amount_due / 100,
					nextInvoiceAmount: preview.total / 100,
					currency: preview.currency
				}
			}),

		// Check if user can access premium features
		canAccessPremiumFeatures: protectedProcedure.query(async ({ ctx }) => {
			const subscription = await services.subscriptionsService.getSubscription(ctx.user.id)
			
			if (!subscription) {
				return { hasAccess: false, reason: 'No subscription found' }
			}

			const hasActiveSubscription = ['ACTIVE', 'TRIALING'].includes(subscription.status)
			const isNotFreePlan = subscription.planId !== PLAN_TYPE.FREE

			return {
				hasAccess: hasActiveSubscription && isNotFreePlan,
				subscription: {
					status: subscription.status,
					planId: subscription.planId,
					trialEnd: subscription.trialEnd,
					currentPeriodEnd: subscription.currentPeriodEnd,
					cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
				}
			}
		}),

		// Get available plans
		getPlans: protectedProcedure.query(async () => {
			return services.subscriptionsService.getAvailablePlans()
		})
	})
}

export type SubscriptionsRouter = ReturnType<typeof createSubscriptionsRouter>