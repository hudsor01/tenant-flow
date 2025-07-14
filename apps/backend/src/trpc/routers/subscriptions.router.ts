import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { SubscriptionsService } from '../../subscriptions/subscriptions.service'
import { SubscriptionService } from '../../stripe/services/subscription.service'
import { PortalService } from '../../stripe/services/portal.service'
import { PlanType } from '@prisma/client'
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  updateSubscriptionSchema,
  createPortalSessionSchema,
  subscriptionWithPlanSchema,
  createSubscriptionResponseSchema,
  portalSessionResponseSchema,
  plansListSchema,
  usageMetricsSchema,
  planDetailsSchema,
} from '../schemas/subscription.schemas'

export const createSubscriptionsRouter = (
  subscriptionsService: SubscriptionsService,
  subscriptionService: SubscriptionService,
  portalService: PortalService,
) => {
  return router({
    // Get current user's subscription with plan details and usage
    getCurrent: protectedProcedure
      .output(subscriptionWithPlanSchema)
      .query(async ({ ctx }) => {
        try {
          const subscription = await subscriptionsService.getUserSubscription(ctx.user.id)
          return subscription
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch subscription',
            cause: error,
          })
        }
      }),

    // Get user's usage metrics
    getUsage: protectedProcedure
      .output(usageMetricsSchema)
      .query(async ({ ctx }) => {
        try {
          const usage = await subscriptionsService.calculateUsageMetrics(ctx.user.id)
          return usage
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch usage metrics',
            cause: error,
          })
        }
      }),

    // Get all available plans
    getPlans: publicProcedure
      .output(plansListSchema)
      .query(async () => {
        try {
          const plans = subscriptionsService.getAvailablePlans()
          return plans
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch plans',
            cause: error,
          })
        }
      }),

    // Get specific plan by ID
    getPlan: publicProcedure
      .input(z.object({ planId: z.string() }))
      .output(planDetailsSchema.nullable())
      .query(async ({ input }) => {
        try {
          const plan = subscriptionsService.getPlanById(input.planId)
          return plan
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch plan',
            cause: error,
          })
        }
      }),

    // Create a new subscription (free trial or paid)
    create: protectedProcedure
      .input(createSubscriptionSchema)
      .output(createSubscriptionResponseSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // Map UI plan concept to database enum if needed
          let dbPlanId: PlanType
          
          // Handle plan mapping - support both UI concepts and direct DB enum values
          if (input.planId === 'freeTrial' || input.planId === 'FREE_TRIAL') {
            dbPlanId = PlanType.FREE
          } else if (input.planId === 'starter' || input.planId === 'STARTER') {
            dbPlanId = PlanType.BASIC
          } else if (input.planId === 'growth' || input.planId === 'GROWTH') {
            dbPlanId = PlanType.PROFESSIONAL
          } else if (input.planId === 'enterprise' || input.planId === 'ENTERPRISE') {
            dbPlanId = PlanType.ENTERPRISE
          } else if (Object.values(PlanType).includes(input.planId as PlanType)) {
            dbPlanId = input.planId as PlanType
          } else {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid plan ID: ${input.planId}`,
            })
          }

          // Check if user already has an active subscription
          const existingSubscription = await subscriptionsService.getUserSubscription(ctx.user.id)
          if (existingSubscription && existingSubscription.status === 'ACTIVE') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'You already have an active subscription. Use the update endpoint to change plans.',
            })
          }

          const result = await subscriptionService.createSubscription({
            planId: input.planId, // Keep original for compatibility
            billingPeriod: input.billingPeriod,
            userId: ctx.user.id,
            paymentMethodCollection: input.paymentMethodCollection,
          })

          return {
            subscriptionId: result.subscriptionId,
            status: result.status as any, // Type will be validated by schema
            clientSecret: result.clientSecret || null,
            setupIntentId: result.setupIntentId,
            trialEnd: result.trialEnd || null,
          }
        } catch (error) {
          console.error('Subscription creation failed:', error)
          
          // Handle specific Stripe errors
          if (error instanceof TRPCError) {
            throw error
          }
          
          if (error instanceof Error) {
            if (error.message.includes('already has an active subscription')) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: 'You already have an active subscription',
              })
            }
            if (error.message.includes('Invalid plan')) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid subscription plan',
              })
            }
            if (error.message.includes('Payment failed')) {
              throw new TRPCError({
                code: 'PAYMENT_REQUIRED',
                message: error.message,
              })
            }
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create subscription',
            cause: error,
          })
        }
      }),

    // Update subscription (change plan or billing period)
    update: protectedProcedure
      .input(updateSubscriptionSchema)
      .output(subscriptionWithPlanSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { planId, billingPeriod } = input
          
          // Call the subscription service to update the subscription
          const updatedSubscription = await subscriptionsService.updateSubscription(
            ctx.user.id,
            {
              planId,
              billingPeriod,
            }
          )
          
          return updatedSubscription
        } catch (error) {
          console.error('Subscription update failed:', error)
          
          if (error instanceof Error) {
            if (error.message.includes('No active subscription')) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'No active subscription found to update',
              })
            }
            if (error.message.includes('Invalid plan')) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid subscription plan',
              })
            }
            if (error.message.includes('No Stripe price ID')) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid plan and billing period combination',
              })
            }
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update subscription',
            cause: error,
          })
        }
      }),

    // Cancel subscription
    cancel: protectedProcedure
      .input(cancelSubscriptionSchema)
      .output(z.object({ success: z.boolean(), message: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await subscriptionsService.cancelSubscription(ctx.user.id)
          
          return {
            success: true,
            message: 'Subscription canceled successfully',
          }
        } catch (error) {
          console.error('Subscription cancellation failed:', error)
          
          if (error instanceof Error) {
            if (error.message.includes('No active subscription')) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'No active subscription found to cancel',
              })
            }
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to cancel subscription',
            cause: error,
          })
        }
      }),

    // Create Stripe customer portal session
    createPortalSession: protectedProcedure
      .input(createPortalSessionSchema)
      .output(portalSessionResponseSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // Use user ID from context to create portal session
          const result = await portalService.createPortalSession(ctx.user.id)
          
          return {
            url: result.url,
            sessionId: result.sessionId,
          }
        } catch (error) {
          console.error('Portal session creation failed:', error)
          
          if (error instanceof Error) {
            if (error.message.includes('does not have a Stripe customer ID')) {
              throw new TRPCError({
                code: 'PRECONDITION_FAILED',
                message: 'Please subscribe to a plan before accessing the billing portal',
              })
            }
            if (error.message.includes('User not found')) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User account not found',
              })
            }
            if (error.message.includes('No billing account')) {
              throw new TRPCError({
                code: 'PRECONDITION_FAILED',
                message: 'No billing account found. Please create a subscription first.',
              })
            }
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create billing portal session',
            cause: error,
          })
        }
      }),

    // Check if user can perform action based on plan limits
    canPerformAction: protectedProcedure
      .input(z.object({ 
        action: z.enum(['property', 'tenant', 'team', 'api', 'storage', 'leaseGeneration'])
      }))
      .output(z.object({
        allowed: z.boolean(),
        reason: z.string().optional(),
        upgradeRequired: z.boolean(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const subscription = await subscriptionsService.getUserSubscription(ctx.user.id)
          
          // Check if specific limit is exceeded
          const isExceeded = subscription.limitsExceeded.includes(input.action)
          
          if (isExceeded) {
            return {
              allowed: false,
              reason: `You've reached the limit for ${input.action} on your current plan`,
              upgradeRequired: true,
            }
          }
          
          return {
            allowed: true,
            upgradeRequired: false,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to check action permissions',
            cause: error,
          })
        }
      }),
  })
}

// Export factory function for dependency injection
export const subscriptionsRouter = createSubscriptionsRouter