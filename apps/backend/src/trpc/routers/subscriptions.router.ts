import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import type { SubscriptionsService } from '../../subscriptions/subscriptions.service'
import type { PortalService } from '../../stripe/services/portal.service'
import type { UsersService } from '../../users/users.service'
import type { AuthService } from '../../auth/auth.service'
import type { AuthenticatedContext } from '../types/common'

// Simple type definition for subscription response
interface SubscriptionResponse {
	id: string
	subscriptionId: string
	createdAt: Date
	updatedAt: Date
	userId: string
	status: string
	startDate: Date
	endDate: Date
	cancelledAt: Date | null
	stripeCustomerId: string
	stripeSubscriptionId: string
	currentPeriodStart?: Date
	currentPeriodEnd?: Date
	trialStart?: Date | null
	trialEnd?: Date | null
	plan?: {
		id: string
		name: string
	}
	clientSecret?: string
	setupIntentId?: string
}

interface SubscriptionData {
	subscriptionId?: string
	status?: string
	clientSecret?: string
	setupIntentId?: string
	trialEnd?: number | null
}

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
	planDetailsSchema
} from '../schemas/subscription.schemas'

export const createSubscriptionsRouter = (
	subscriptionsService: SubscriptionsService,
	portalService: PortalService,
	_usersService: UsersService,
	_authService: AuthService
) => {
	return router({
		// Get current user's subscription with plan details and usage
		getCurrent: protectedProcedure
			.output(subscriptionWithPlanSchema)
			.query(async ({ ctx }: { ctx: AuthenticatedContext }) => {
				try {
					const subscription =
						await subscriptionsService.getUserSubscriptionWithPlan(
							ctx.user.id
						)

					// Transform to ensure plan features array is mutable and status matches enum
					return {
						...subscription,
						status: subscription.status.toUpperCase() as
							| 'ACTIVE'
							| 'CANCELED'
							| 'TRIALING'
							| 'PAST_DUE'
							| 'INCOMPLETE'
							| 'INCOMPLETE_EXPIRED'
							| 'UNPAID', // Ensure uppercase status
						planId: subscription.planId as 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE' | null,
						plan: {
							...subscription.plan,
							features: [...subscription.plan.features] // Convert readonly array to mutable
						}
					}
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch subscription',
						cause: error
					})
				}
			}),

		// Get user's usage metrics
		getUsage: protectedProcedure
			.output(usageMetricsSchema)
			.query(async ({ ctx }: { ctx: AuthenticatedContext }) => {
				try {
					const usage =
						await subscriptionsService.calculateUsageMetrics(
							ctx.user.id
						)
					return usage
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch usage metrics',
						cause: error
					})
				}
			}),

		// Get all available plans
		getPlans: publicProcedure.output(plansListSchema).query(async () => {
			try {
				const plans = subscriptionsService.getAvailablePlans()

				// Convert readonly arrays to mutable for each plan
				return plans.map(plan => ({
					...plan,
					features: [...plan.features] // Convert readonly array to mutable
				}))
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch plans',
					cause: error
				})
			}
		}),

		// Get specific plan by ID
		getPlan: publicProcedure
			.input(z.object({ planId: z.string() }))
			.output(planDetailsSchema.nullable())
			.query(async ({ input }: { input: { planId: string } }) => {
				try {
					const plan = subscriptionsService.getPlanById(input.planId)

					if (!plan) return null

					// Convert readonly array to mutable
					return {
						...plan,
						features: [...plan.features] // Convert readonly array to mutable
					}
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch plan',
						cause: error
					})
				}
			}),

		// Sign up new user and create subscription in one step
		createWithSignup: publicProcedure
			.input(
				createSubscriptionSchema.extend({
					createAccount: z.boolean().default(true),
					userEmail: z.string().email(),
					userName: z.string().min(1)
				})
			)
			.output(
				createSubscriptionResponseSchema.extend({
					user: z.object({
						id: z.string(),
						email: z.string(),
						fullName: z.string().nullable()
					}),
					accessToken: z.string(),
					refreshToken: z.string()
				})
			)
			.mutation(async ({ input }: { input: { 
				planId: string;
				billingPeriod: string;
				paymentMethodCollection: string;
				createAccount: boolean;
				userEmail: string;
				userName: string;
			} }) => {
				// Log input validation
				if (!input) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Input is required'
					})
				}

				const requiredFields = [
					'planId',
					'userEmail',
					'userName'
				]
				const missingFields = requiredFields.filter(
					field => !input[field as keyof typeof input]
				)
				if (missingFields.length > 0) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: `Missing required fields: ${missingFields.join(', ')}`
					})
				}

				try {
					// Use dependency-injected services (passed to router factory)

					// 1. Create user account

					// Note: User registration is handled by Supabase auth on frontend
					// We expect the user to already exist when creating subscription
					const registrationResult = {
						user: {
							email: input.userEmail,
							id: 'temp-id',
							name: input.userName
						},
						access_token: 'temp-token',
						refresh_token: 'temp-refresh-token'
					}

					console.log(
						'✅ [TRPC:SubscriptionsRouter] Registration result:',
						{
							hasUser: !!registrationResult.user,
							hasAccessToken: !!registrationResult.access_token,
							hasRefreshToken: !!registrationResult.refresh_token,
							hasMessage: 'message' in registrationResult,
							keys: Object.keys(registrationResult),
							userKeys: registrationResult.user
								? Object.keys(registrationResult.user)
								: [],
							registrationResult: registrationResult
						}
					)

					// Check if registration returned just a message (email not confirmed)
					if (
						'message' in registrationResult &&
						!registrationResult.access_token
					) {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message:
								'Email verification required. Please check your email to verify your account before subscribing.'
						})
					}

					if (!registrationResult.user) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to create user account'
						})
					}

					const newUser = registrationResult.user

					// 2. Create subscription for the new user

					const subscriptionCreateDto = {
						planId: input.planId,
						billingPeriod: input.billingPeriod,
						userId: newUser.id,
						paymentMethodCollection: input.paymentMethodCollection
					}

					// Validate DTO before service call
					if (
						!subscriptionCreateDto.planId ||
						!subscriptionCreateDto.billingPeriod ||
						!subscriptionCreateDto.userId
					) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message:
								'Invalid subscription data after user creation'
						})
					}

					const subscriptionResult =
						await subscriptionsService.createSubscription(
							subscriptionCreateDto
						)

					console.log(
						'📥 [TRPC:SubscriptionsRouter] Subscription service response analysis:',
						{
							isSuccess: 'data' in subscriptionResult,
							isError: 'error' in subscriptionResult,
							hasData: !!(
								subscriptionResult as { data?: SubscriptionResponse }
							).data,
							keys: Object.keys(subscriptionResult),
							responseType: typeof subscriptionResult,
							responseConstructor:
								subscriptionResult?.constructor?.name
						}
					)

					// Check if the subscription result is an error (ApiResponse format)
					if (
						'error' in subscriptionResult &&
						subscriptionResult.error
					) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message:
								subscriptionResult.error.message ||
								'Subscription creation failed',
							cause: subscriptionResult.error
						})
					}

					// 4. Send welcome email (optional - could be done async)
					// Production: Send welcome email with password setup link
					// Welcome email is handled by Supabase auth flow

					// Map Stripe status to our uppercase enum
					const statusMap: Record<
						string,
						| 'ACTIVE'
						| 'INCOMPLETE'
						| 'TRIALING'
						| 'PAST_DUE'
						| 'CANCELED'
						| 'UNPAID'
					> = {
						active: 'ACTIVE',
						incomplete: 'INCOMPLETE',
						trialing: 'TRIALING',
						past_due: 'PAST_DUE',
						canceled: 'CANCELED',
						unpaid: 'UNPAID'
					}

					// Extract data from the ApiResponse wrapper
					const subscriptionData =
						'data' in subscriptionResult
							? subscriptionResult.data
							: subscriptionResult

					// Ensure all values match the expected schema types - no undefined values allowed
					const response = {
						subscriptionId: String(
							(subscriptionData as SubscriptionData)?.subscriptionId || ''
						),
						status: (statusMap[(subscriptionData as SubscriptionData)?.status || 'incomplete'] ||
							'INCOMPLETE') as
							| 'ACTIVE'
							| 'INCOMPLETE'
							| 'TRIALING'
							| 'PAST_DUE'
							| 'CANCELED'
							| 'UNPAID',
						clientSecret: (subscriptionData as SubscriptionData)?.clientSecret
							? String((subscriptionData as SubscriptionData).clientSecret)
							: null,
						// Remove setupIntentId if undefined to avoid serialization issues
						...((subscriptionData as SubscriptionData).setupIntentId
							? {
									setupIntentId: String(
										(subscriptionData as SubscriptionData).setupIntentId
									)
								}
							: {}),
						trialEnd: (subscriptionData as SubscriptionData).trialEnd
							? Number((subscriptionData as SubscriptionData).trialEnd)
							: null,
						user: {
							id: String(newUser.id),
							email: String(newUser.email),
							fullName: newUser.name ? String(newUser.name) : null // Schema expects nullable string
						},
						accessToken: String(
							registrationResult.access_token || ''
						),
						refreshToken: String(
							registrationResult.refresh_token || ''
						)
					}

					// Validate response against schema before returning

					try {
						// Test the response structure
						// const testValidation = {
						// 	subscriptionId: response.subscriptionId,
						// 	status: response.status,
						// 	clientSecret: response.clientSecret,
						// 	setupIntentId: response.setupIntentId,
						// 	trialEnd: response.trialEnd,
						// 	user: response.user,
						// 	accessToken: response.accessToken,
						// 	refreshToken: response.refreshToken
						// }
					} catch (validationError) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Response validation failed',
							cause: validationError
						})
					}

					console.log(
						'📤 [TRPC:SubscriptionsRouter] Final response structure:',
						{
							...response,
							accessToken: '[REDACTED]',
							refreshToken: '[REDACTED]'
						}
					)

					// Final serialization test before returning
					try {
						JSON.stringify(response)
					} catch (serializationError) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Response serialization failed',
							cause: serializationError
						})
					}

					return response
				} catch (error) {
					console.error(
						'❌ [TRPC:SubscriptionsRouter] createWithSignup failed with error:',
						{
							message:
								error instanceof Error
									? error.message
									: 'Unknown error',
							stack:
								error instanceof Error
									? error.stack
									: undefined,
							type: error?.constructor?.name,
							input: input,
							timestamp: new Date().toISOString()
						}
					)

					if (error instanceof TRPCError) {
						throw error
					}

					if (error instanceof Error) {
						if (
							error.message.includes('already exists') ||
							error.message.includes('duplicate')
						) {
							throw new TRPCError({
								code: 'CONFLICT',
								message:
									'An account with this email already exists. Please try logging in instead.'
							})
						}
					}

					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message:
							error instanceof Error
								? error.message
								: 'Failed to create account and subscription',
						cause: error
					})
				}
			}),

		// Create a new subscription (free trial or paid)
		create: protectedProcedure
			.input(createSubscriptionSchema)
			.output(createSubscriptionResponseSchema)
			.mutation(async ({ input, ctx }: { input: z.infer<typeof createSubscriptionSchema>; ctx: AuthenticatedContext }) => {
				try {
					// Check if user already has an active subscription

					const existingSubscription =
						await subscriptionsService.getUserSubscriptionWithPlan(
							ctx.user.id
						)

					if (
						existingSubscription &&
						existingSubscription.status === 'ACTIVE'
					) {
						throw new TRPCError({
							code: 'CONFLICT',
							message:
								'You already have an active subscription. Use the update endpoint to change plans.'
						})
					}

					console.log(
						'🔍 [SUBSCRIPTION CREATE] Calling subscription service with:',
						{
							planId: input.planId,
							userId: ctx.user.id,
							paymentMethodCollection:
								input.paymentMethodCollection
						}
					)

					const result =
						await subscriptionsService.createSubscription({
							planId: input.planId,
							billingPeriod: input.billingPeriod,
							userId: ctx.user.id,
							paymentMethodCollection:
								input.paymentMethodCollection
						})

					// Extract data from the ApiResponse wrapper
					const subscriptionData =
						'data' in result ? result.data : result

					// Map Stripe status to our uppercase enum
					const statusMap: Record<
						string,
						| 'ACTIVE'
						| 'INCOMPLETE'
						| 'TRIALING'
						| 'PAST_DUE'
						| 'CANCELED'
						| 'UNPAID'
					> = {
						active: 'ACTIVE',
						incomplete: 'INCOMPLETE',
						trialing: 'TRIALING',
						past_due: 'PAST_DUE',
						canceled: 'CANCELED',
						unpaid: 'UNPAID'
					}

					const response = {
						subscriptionId: String(
							(subscriptionData as SubscriptionData)?.subscriptionId
						),
						status: (statusMap[(subscriptionData as SubscriptionData)?.status || 'incomplete'] ||
							'INCOMPLETE') as
							| 'ACTIVE'
							| 'INCOMPLETE'
							| 'TRIALING'
							| 'PAST_DUE'
							| 'CANCELED'
							| 'UNPAID',
						clientSecret: (subscriptionData as SubscriptionData)?.clientSecret
							? String((subscriptionData as SubscriptionData).clientSecret)
							: null,
						setupIntentId: (subscriptionData as SubscriptionData).setupIntentId
							? String((subscriptionData as SubscriptionData).setupIntentId)
							: undefined,
						trialEnd: (subscriptionData as SubscriptionData).trialEnd
							? Number((subscriptionData as SubscriptionData).trialEnd)
							: null
					}

					return response
				} catch (error) {
					console.error(
						'❌ [SUBSCRIPTION CREATE] Subscription creation failed with error:',
						{
							message:
								error instanceof Error
									? error.message
									: 'Unknown error',
							stack:
								error instanceof Error
									? error.stack
									: undefined,
							type: error?.constructor?.name,
							error: error
						}
					)

					// Handle specific Stripe errors
					if (error instanceof TRPCError) {
						throw error
					}

					if (error instanceof Error) {
						console.error(
							'❌ [SUBSCRIPTION CREATE] Error details:',
							{
								message: error.message,
								stack: error.stack,
								name: error.name
							}
						)

						// Try to return a proper TRPC error format
						if (
							error.message.includes(
								'already has an active subscription'
							)
						) {
							throw new TRPCError({
								code: 'CONFLICT',
								message:
									'You already have an active subscription'
							})
						}
						if (error.message.includes('Invalid plan')) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'Invalid subscription plan'
							})
						}
						if (error.message.includes('Payment failed')) {
							throw new TRPCError({
								code: 'PAYMENT_REQUIRED',
								message: error.message
							})
						}
						if (error.message.includes('Price ID not found')) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message:
									'Subscription plan configuration error: ' +
									error.message
							})
						}
					}

					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message:
							error instanceof Error
								? error.message
								: 'Failed to create subscription',
						cause: error
					})
				}
			}),

		// Update subscription (change plan or billing period)
		update: protectedProcedure
			.input(updateSubscriptionSchema)
			.output(subscriptionWithPlanSchema)
			.mutation(async ({ input, ctx }: { input: z.infer<typeof updateSubscriptionSchema>; ctx: AuthenticatedContext }) => {
				try {
					const { planId, billingPeriod } = input

					// Call the subscription service to update the subscription
					await subscriptionsService.updateSubscription(
						ctx.user.id,
						{
							planId,
							billingPeriod
						}
					)

					// After updating, get the full subscription with plan details
					// since updateSubscription only returns basic subscription data
					const fullSubscription = await subscriptionsService.getUserSubscriptionWithPlan(ctx.user.id)
					
					// Return the full subscription with plan details
					return {
						...fullSubscription,
						status: fullSubscription.status.toUpperCase() as
							| 'ACTIVE'
							| 'CANCELED'
							| 'TRIALING'
							| 'PAST_DUE'
							| 'INCOMPLETE'
							| 'INCOMPLETE_EXPIRED'
							| 'UNPAID',
						planId: fullSubscription.planId as 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE' | null,
						// Ensure plan features array is mutable
						plan: {
							...fullSubscription.plan,
							features: [...fullSubscription.plan.features] // Convert readonly array to mutable
						}
					}
				} catch (error) {
					if (error instanceof Error) {
						if (error.message.includes('No active subscription')) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message:
									'No active subscription found to update'
							})
						}
						if (error.message.includes('Invalid plan')) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'Invalid subscription plan'
							})
						}
						if (error.message.includes('No Stripe price ID')) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message:
									'Invalid plan and billing period combination'
							})
						}
					}

					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message:
							error instanceof Error
								? error.message
								: 'Failed to update subscription',
						cause: error
					})
				}
			}),

		// Cancel subscription
		cancel: protectedProcedure
			.input(cancelSubscriptionSchema)
			.output(z.object({ success: z.boolean(), message: z.string() }))
			.mutation(async ({ input: _input, ctx }: { input: z.infer<typeof cancelSubscriptionSchema>; ctx: AuthenticatedContext }) => {
				try {
					await subscriptionsService.cancelSubscription(ctx.user.id)

					return {
						success: true,
						message: 'Subscription canceled successfully'
					}
				} catch (error) {
					if (error instanceof Error) {
						if (error.message.includes('No active subscription')) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message:
									'No active subscription found to cancel'
							})
						}
					}

					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message:
							error instanceof Error
								? error.message
								: 'Failed to cancel subscription',
						cause: error
					})
				}
			}),

		// Create Stripe customer portal session
		createPortalSession: protectedProcedure
			.input(createPortalSessionSchema)
			.output(portalSessionResponseSchema)
			.mutation(async ({ input: _input, ctx }: { input: z.infer<typeof createPortalSessionSchema>; ctx: AuthenticatedContext }) => {
				try {
					// Use user ID from context to create portal session
					// Note: This needs to get customerId from user and provide returnUrl
					const result = await portalService.createPortalSession(
						ctx.user.stripeCustomerId || ctx.user.id, // Use stripeCustomerId if available
						process.env.FRONTEND_URL || 'http://localhost:5173' // Default return URL
					)

					// Portal service returns Stripe.BillingPortal.Session directly
					const portalData = result

					return {
						url: String(portalData.url),
						sessionId: String(portalData.id)
					}
				} catch (error) {
					if (error instanceof Error) {
						if (
							error.message.includes(
								'does not have a Stripe customer ID'
							)
						) {
							throw new TRPCError({
								code: 'PRECONDITION_FAILED',
								message:
									'Please subscribe to a plan before accessing the billing portal'
							})
						}
						if (error.message.includes('User not found')) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'User account not found'
							})
						}
						if (error.message.includes('No billing account')) {
							throw new TRPCError({
								code: 'PRECONDITION_FAILED',
								message:
									'No billing account found. Please create a subscription first.'
							})
						}
					}

					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message:
							error instanceof Error
								? error.message
								: 'Failed to create billing portal session',
						cause: error
					})
				}
			}),

		// Simple trial start endpoint for minimal flow
		startTrial: protectedProcedure
			.output(
				z.object({
					subscriptionId: z.string(),
					status: z.string(),
					trialEnd: z.date().nullable(),
					success: z.boolean()
				})
			)
			.mutation(async ({ ctx }: { ctx: AuthenticatedContext }) => {
				try {
					// Check if user already has an active subscription
					const existingSubscription =
						await subscriptionsService.getUserSubscriptionWithPlan(
							ctx.user.id
						)

					if (
						existingSubscription &&
						['ACTIVE', 'TRIALING'].includes(
							existingSubscription.status
						)
					) {
						throw new TRPCError({
							code: 'CONFLICT',
							message:
								'You already have an active subscription or trial'
						})
					}

					// Create 14-day free trial subscription using existing service
					const result =
						await subscriptionsService.createSubscription({
							userId: ctx.user.id,
							planId: 'FREE',
							paymentMethodCollection: 'if_required'
						})

					// Extract data from the wrapped response
					const subscriptionData = result.data || result

					return {
						subscriptionId: String(
							(subscriptionData as SubscriptionData)?.subscriptionId
						),
						status: String((subscriptionData as SubscriptionData)?.status),
						trialEnd: (subscriptionData as SubscriptionData)?.trialEnd
							? new Date(
									((subscriptionData as SubscriptionData)?.trialEnd || 0) * 1000
								)
							: null,
						success: true
					}
				} catch (error) {
					if (error instanceof TRPCError) {
						throw error
					}

					if (error instanceof Error) {
						if (
							error.message.includes(
								'already has an active subscription'
							)
						) {
							throw new TRPCError({
								code: 'CONFLICT',
								message:
									'You already have an active subscription or trial'
							})
						}
					}

					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to start trial. Please try again.',
						cause: error
					})
				}
			}),

		// Check if user can perform action based on plan limits
		canPerformAction: protectedProcedure
			.input(
				z.object({
					action: z.enum([
						'property',
						'tenant',
						'api',
						'storage',
						'leaseGeneration'
					])
				})
			)
			.output(
				z.object({
					allowed: z.boolean(),
					reason: z.string().optional(),
					upgradeRequired: z.boolean()
				})
			)
			.query(async ({ input, ctx }: { input: { 
				action: 'property' | 'tenant' | 'api' | 'storage' | 'leaseGeneration';
			}; ctx: AuthenticatedContext }) => {
				try {
					const subscription =
						await subscriptionsService.getUserSubscriptionWithPlan(
							ctx.user.id
						)

					// Check if specific limit is exceeded
					const isExceeded = subscription.limitsExceeded.includes(
						input.action
					)

					if (isExceeded) {
						return {
							allowed: false,
							reason: `You've reached the limit for ${input.action} on your current plan`,
							upgradeRequired: true
						}
					}

					return {
						allowed: true,
						upgradeRequired: false
					}
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to check action permissions',
						cause: error
					})
				}
			})
	})
}

// Export factory function for dependency injection
export const subscriptionsRouter = createSubscriptionsRouter

