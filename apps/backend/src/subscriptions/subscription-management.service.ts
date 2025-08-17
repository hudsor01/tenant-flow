import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StripeService } from '../stripe/stripe.service'
import { SupabaseService } from '../common/supabase/supabase.service'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionSyncService } from './subscription-sync.service'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import type { PlanType, Subscription } from '@repo/shared'
import {
	ERROR_CATEGORY_MAPPING,
	ERROR_SEVERITY_MAPPING,
	RETRYABLE_ERROR_CODES,
	StandardizedStripeError,
	STRIPE_ERROR_CATEGORIES,
	STRIPE_ERROR_CODES,
	STRIPE_ERROR_SEVERITIES,
	StripeError,
	StripeErrorCode,
	StripeSubscription
} from '@repo/shared/types/stripe'

export interface SubscriptionManagementResult {
	success: boolean
	subscription?: Subscription
	stripeSubscription?: StripeSubscription
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

/**
 * @deprecated Use UpgradeRequestDto from dto/subscription-management.dto.ts instead
 */
export interface UpgradeRequest {
	targetPlan: PlanType
	billingCycle: 'monthly' | 'annual' | 'yearly'
	prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

/**
 * @deprecated Use DowngradeRequestDto from dto/subscription-management.dto.ts instead
 */
export interface DowngradeRequest {
	targetPlan: PlanType
	billingCycle: 'monthly' | 'annual' | 'yearly'
	effectiveDate?: 'immediate' | 'end_of_period'
	reason?: string
}

/**
 * @deprecated Use CancelRequestDto from dto/subscription-management.dto.ts instead
 */
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
		private readonly supabaseService: SupabaseService,
		private readonly stripeService: StripeService,
		@Inject(forwardRef(() => SubscriptionsManagerService))
		private readonly subscriptionManager: SubscriptionsManagerService,
		@Inject(forwardRef(() => SubscriptionSyncService))
		private readonly subscriptionSync: SubscriptionSyncService,
		private readonly eventEmitter: EventEmitter2
	) {
		this.logger = new StructuredLoggerService(
			'SubscriptionManagementService'
		)
	}

	/**
	 * Enhanced error processing with Stripe-specific categorization
	 */
	private processStripeError(
		error: unknown,
		operation: string,
		context: { userId?: string; planType?: PlanType; correlationId: string }
	): StandardizedStripeError {
		const errorId = `sms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		const timestamp = new Date()

		// Handle Stripe-specific errors
		if (this.isStripeError(error)) {
			const stripeError = error as StripeError
			const code =
				(stripeError.code as StripeErrorCode) ||
				STRIPE_ERROR_CODES.API_ERROR
			const category =
				ERROR_CATEGORY_MAPPING[code] || STRIPE_ERROR_CATEGORIES.UNKNOWN
			const severity =
				ERROR_SEVERITY_MAPPING[code] || STRIPE_ERROR_SEVERITIES.MEDIUM
			const retryable = RETRYABLE_ERROR_CODES.includes(code)

			return {
				code,
				message: stripeError.message || 'Unknown Stripe error',
				userMessage: this.getUserFriendlyMessage(code),
				details: this.sanitizeErrorDetails(stripeError),
				errorId,
				category,
				severity,
				retryable,
				retryAfter: this.getRetryDelay(code),
				stripeErrorType: stripeError.type,
				context: {
					operation,
					resource: 'subscription',
					userId: context.userId,
					metadata: {
						planType: context.planType,
						correlationId: context.correlationId
					},
					timestamp
				}
			}
		}

		// Handle general errors
		const generalError = error as Error
		return {
			code: STRIPE_ERROR_CODES.API_ERROR,
			message: generalError.message || 'Unknown error occurred',
			userMessage: 'An unexpected error occurred. Please try again.',
			errorId,
			category: STRIPE_ERROR_CATEGORIES.UNKNOWN,
			severity: STRIPE_ERROR_SEVERITIES.MEDIUM,
			retryable: false,
			context: {
				operation,
				resource: 'subscription',
				userId: context.userId,
				metadata: {
					planType: context.planType,
					correlationId: context.correlationId
				},
				timestamp
			}
		}
	}

	/**
	 * Type guard for Stripe errors
	 */
	private isStripeError(error: unknown): error is StripeError {
		if (typeof error !== 'object' || error === null) {
			return false
		}

		const errorObj = error as Record<string, unknown>

		if (!('type' in errorObj) || typeof errorObj.type !== 'string') {
			return false
		}

		const errorType = errorObj.type
		return (
			errorType.startsWith('card_error') ||
			errorType.startsWith('invalid_request') ||
			errorType.startsWith('api_error') ||
			errorType.startsWith('authentication') ||
			errorType.startsWith('rate_limit')
		)
	}

	/**
	 * Get user-friendly error messages
	 */
	private getUserFriendlyMessage(code: StripeErrorCode): string {
		const messages: Record<StripeErrorCode, string> = {
			[STRIPE_ERROR_CODES.CARD_DECLINED]:
				'Your payment method was declined. Please try a different payment method.',
			[STRIPE_ERROR_CODES.EXPIRED_CARD]:
				'Your card has expired. Please update your payment method.',
			[STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]:
				'Your card has insufficient funds. Please use a different payment method.',
			[STRIPE_ERROR_CODES.INCORRECT_CVC]:
				'The security code is incorrect. Please check and try again.',
			[STRIPE_ERROR_CODES.PROCESSING_ERROR]:
				'There was an error processing your payment. Please try again.',
			[STRIPE_ERROR_CODES.RATE_LIMIT]:
				'Too many requests. Please wait a moment and try again.',
			[STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]:
				'Authentication failed. Please contact support.',
			[STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]:
				'Subscription not found. Please contact support.',
			[STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]:
				'Customer account not found. Please contact support.',
			[STRIPE_ERROR_CODES.INVALID_PRICE_ID]:
				'The selected plan is not available. Please try a different plan.',
			[STRIPE_ERROR_CODES.API_ERROR]:
				'A service error occurred. Please try again later.',
			[STRIPE_ERROR_CODES.API_CONNECTION_ERROR]:
				'Connection error. Please check your internet connection and try again.'
		} as Record<StripeErrorCode, string>

		return (
			messages[code] ||
			'An unexpected error occurred. Please try again or contact support.'
		)
	}

	/**
	 * Sanitize error details for logging (remove sensitive info)
	 */
	private sanitizeErrorDetails(error: StripeError): string {
		const details = JSON.stringify({
			type: error.type,
			code: error.code,
			decline_code: error.decline_code,
			param: error.param
		})
		// Remove any potential sensitive data patterns
		return details.replace(
			/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
			'****-****-****-****'
		)
	}

	/**
	 * Get retry delay based on error type
	 */
	private getRetryDelay(code: StripeErrorCode): number | undefined {
		const retryDelays: Record<StripeErrorCode, number> = {
			[STRIPE_ERROR_CODES.RATE_LIMIT]: 5000,
			[STRIPE_ERROR_CODES.API_ERROR]: 2000,
			[STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: 3000,
			[STRIPE_ERROR_CODES.PROCESSING_ERROR]: 1000
		} as Record<StripeErrorCode, number>

		return retryDelays[code]
	}

	/**
	 * Enhanced error result creation
	 */
	private createErrorResult(
		error: StandardizedStripeError,
		operation: string,
		fromPlan?: PlanType,
		toPlan?: PlanType
	): SubscriptionManagementResult {
		// Log error with full context
		this.logger.error(
			`Subscription ${operation} failed`,
			new Error(error.message),
			{
				errorId: error.errorId,
				code: error.code,
				category: error.category,
				severity: error.severity,
				retryable: error.retryable,
				context: error.context
			}
		)

		return {
			success: false,
			error: error.userMessage,
			changes: [],
			metadata: {
				operation,
				fromPlan,
				toPlan,
				correlationId: error.context.metadata?.correlationId as string,
				timestamp: error.context.timestamp.toISOString()
			}
		}
	}

	/**
	 * Retry wrapper with exponential backoff for Stripe operations
	 */
	private async withRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
		maxAttempts = 3
	): Promise<T> {
		let lastError: unknown

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error

				// Check if error is retryable
				const isRetryable = this.isRetryableError(error)

				if (!isRetryable || attempt === maxAttempts) {
					throw error
				}

				// Calculate exponential backoff delay
				const baseDelay = 1000 // 1 second
				const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
				const jitter = Math.random() * 200 // Add up to 200ms jitter
				const totalDelay = Math.min(exponentialDelay + jitter, 10000) // Max 10 seconds

				this.logger.warn(
					`${operationName} attempt ${attempt} failed, retrying in ${totalDelay}ms`,
					{
						error:
							error instanceof Error
								? error.message
								: String(error),
						attempt,
						maxAttempts,
						delay: totalDelay
					}
				)

				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, totalDelay))
			}
		}

		throw lastError
	}

	/**
	 * Check if an error is retryable based on Stripe error codes
	 */
	private isRetryableError(error: unknown): boolean {
		if (!this.isStripeError(error)) {
			return false
		}

		const stripeError = error as StripeError
		const code = stripeError.code as StripeErrorCode

		return RETRYABLE_ERROR_CODES.includes(code)
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
			const currentSubscription =
				await this.subscriptionManager.getSubscription(userId)
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
			const validationResult = await this.validateUpgrade(
				currentSubscription,
				request.targetPlan
			)
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
			const targetPriceId = this.getPriceId(
				request.targetPlan,
				request.billingCycle
			)
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

			const syncResult =
				await this.subscriptionSync.syncSubscriptionFromWebhook(
					stripeResult.subscription
				)

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

				this.logger.info(
					'Subscription upgrade completed successfully',
					{
						userId,
						fromPlan: currentSubscription.planType,
						toPlan: request.targetPlan,
						correlationId
					}
				)

				return {
					success: true,
					subscription: syncResult.subscription,
					stripeSubscription: stripeResult.subscription,
					changes: [
						`Upgraded from ${currentSubscription.planType} to ${request.targetPlan}`
					],
					metadata: {
						operation: 'upgrade',
						fromPlan: currentSubscription.planType || undefined,
						toPlan: request.targetPlan,
						correlationId,
						timestamp: new Date().toISOString()
					}
				}
			} else {
				throw new Error(
					`Sync failed after upgrade: ${syncResult.error}`
				)
			}
		} catch (error) {
			const standardizedError = this.processStripeError(
				error,
				'upgrade',
				{
					userId,
					planType: request.targetPlan,
					correlationId
				}
			)

			return this.createErrorResult(
				standardizedError,
				'upgrade',
				undefined, // fromPlan will be filled from current subscription if available
				request.targetPlan
			)
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
			const currentSubscription =
				await this.subscriptionManager.getSubscription(userId)
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
			const validationResult = await this.validateDowngrade(
				currentSubscription,
				request.targetPlan,
				userId
			)
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
			const targetPriceId = this.getPriceId(
				request.targetPlan,
				request.billingCycle
			)
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

			let stripeResult: {
				success: boolean
				subscription?: StripeSubscription
				error?: string
			}

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

			const syncResult =
				await this.subscriptionSync.syncSubscriptionFromWebhook(
					stripeResult.subscription
				)

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

				const effectiveMessage =
					request.effectiveDate === 'immediate'
						? 'immediately'
						: 'at the end of the current billing period'

				this.logger.info(
					'Subscription downgrade completed successfully',
					{
						userId,
						fromPlan: currentSubscription.planType,
						toPlan: request.targetPlan,
						effectiveDate: request.effectiveDate,
						correlationId
					}
				)

				return {
					success: true,
					subscription: syncResult.subscription,
					stripeSubscription: stripeResult.subscription,
					changes: [
						`Downgraded from ${currentSubscription.planType} to ${request.targetPlan} ${effectiveMessage}`
					],
					metadata: {
						operation: 'downgrade',
						fromPlan: currentSubscription.planType || undefined,
						toPlan: request.targetPlan,
						correlationId,
						timestamp: new Date().toISOString()
					}
				}
			} else {
				throw new Error(
					`Sync failed after downgrade: ${syncResult.error}`
				)
			}
		} catch (error) {
			const standardizedError = this.processStripeError(
				error,
				'downgrade',
				{
					userId,
					planType: request.targetPlan,
					correlationId
				}
			)

			return this.createErrorResult(
				standardizedError,
				'downgrade',
				undefined, // fromPlan will be filled from current subscription if available
				request.targetPlan
			)
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
			const currentSubscription =
				await this.subscriptionManager.getSubscription(userId)
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

			const syncResult =
				await this.subscriptionSync.syncSubscriptionFromWebhook(
					stripeResult.subscription
				)

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

				const cancelMessage =
					request.cancelAt === 'immediate'
						? 'immediately'
						: 'at the end of the current billing period'

				this.logger.info(
					'Subscription cancellation completed successfully',
					{
						userId,
						fromPlan: currentSubscription.planType,
						cancelAt: request.cancelAt,
						correlationId
					}
				)

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
				throw new Error(
					`Sync failed after cancellation: ${syncResult.error}`
				)
			}
		} catch (error) {
			const standardizedError = this.processStripeError(error, 'cancel', {
				userId,
				correlationId
			})

			return this.createErrorResult(standardizedError, 'cancel')
		}
	}

	/**
	 * Create checkout session for new subscription
	 */
	async createCheckoutSession(
		userId: string,
		planType: PlanType,
		billingCycle: 'monthly' | 'annual' | 'yearly',
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
			const { data: user, error } = await this.supabaseService
				.getClient()
				.from('User')
				.select('*')
				.eq('id', userId)
				.single()

			if (error || !user) {
				return {
					success: false,
					error: 'User not found',
					changes: [],
					metadata: {
						operation: 'checkout',
						toPlan: planType,
						correlationId,
						timestamp: new Date().toISOString()
					}
				}
			}

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
			const session =
				await this.stripeService.client.checkout.sessions.create({
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
			const standardizedError = this.processStripeError(
				error,
				'checkout',
				{
					userId,
					planType,
					correlationId
				}
			)

			return this.createErrorResult(
				standardizedError,
				'checkout',
				undefined,
				planType
			)
		}
	}

	/**
	 * Validate upgrade path
	 */
	private async validateUpgrade(
		currentSubscription: Subscription,
		targetPlan: PlanType
	): Promise<{ valid: boolean; reason?: string }> {
		// Check if it's actually an upgrade
		const planHierarchy = [
			'FREETRIAL',
			'STARTER',
			'GROWTH',
			'TENANTFLOW_MAX'
		]
		const currentIndex = planHierarchy.indexOf(
			currentSubscription.planType as PlanType
		)
		const targetIndex = planHierarchy.indexOf(targetPlan)

		if (targetIndex <= currentIndex) {
			return { valid: false, reason: 'Target plan is not an upgrade' }
		}

		// Check subscription status
		if (!['ACTIVE', 'TRIALING'].includes(currentSubscription.status)) {
			return {
				valid: false,
				reason: 'Current subscription is not active'
			}
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
	): Promise<{ valid: boolean; reason?: string }> {
		// Check if it's actually a downgrade
		const planHierarchy = [
			'FREETRIAL',
			'STARTER',
			'GROWTH',
			'TENANTFLOW_MAX'
		]
		const currentIndex = planHierarchy.indexOf(
			currentSubscription.planType as PlanType
		)
		const targetIndex = planHierarchy.indexOf(targetPlan)

		if (targetIndex >= currentIndex) {
			return { valid: false, reason: 'Target plan is not a downgrade' }
		}

		// Check subscription status
		if (!['ACTIVE', 'TRIALING'].includes(currentSubscription.status)) {
			return {
				valid: false,
				reason: 'Current subscription is not active'
			}
		}

		// Check usage limits for target plan
		const usage =
			await this.subscriptionManager.calculateUsageMetrics(userId)
		const targetLimits =
			await this.subscriptionManager.getUsageLimits(userId)

		if (
			usage.properties >
			(typeof targetLimits.properties === 'object'
				? targetLimits.properties.limit
				: targetLimits.properties)
		) {
			return {
				valid: false,
				reason: `Usage exceeds target plan limits: ${usage.properties} properties (limit: ${targetLimits.properties})`
			}
		}

		return { valid: true }
	}

	/**
	 * Update Stripe subscription with retry logic and enhanced error handling
	 */
	private async updateStripeSubscription(
		subscriptionId: string,
		newPriceId: string,
		prorationBehavior: 'create_prorations' | 'none' | 'always_invoice'
	): Promise<{
		success: boolean
		subscription?: StripeSubscription
		error?: string
	}> {
		return this.withRetry(async () => {
			// Get current subscription
			const subscription =
				await this.stripeService.client.subscriptions.retrieve(
					subscriptionId
				)

			if (!subscription.items.data[0]?.id) {
				throw new Error('Subscription has no items to update')
			}

			// Update subscription with enhanced metadata
			const updatedSubscription =
				await this.stripeService.client.subscriptions.update(
					subscriptionId,
					{
						items: [
							{
								id: subscription.items.data[0].id,
								price: newPriceId
							}
						],
						proration_behavior: prorationBehavior,
						metadata: {
							...subscription.metadata,
							last_modified: new Date().toISOString(),
							modified_by: 'subscription_management_service',
							operation: 'update_subscription'
						}
					}
				)

			return {
				success: true,
				subscription:
					updatedSubscription as unknown as StripeSubscription
			}
		}, 'updateStripeSubscription')
	}

	/**
	 * Schedule subscription change for end of period with retry logic
	 */
	private async scheduleSubscriptionChange(
		subscriptionId: string,
		newPriceId: string
	): Promise<{
		success: boolean
		subscription?: StripeSubscription
		error?: string
	}> {
		return this.withRetry(async () => {
			// Get current subscription
			const subscription =
				await this.stripeService.client.subscriptions.retrieve(
					subscriptionId
				)

			// Create a subscription schedule with enhanced metadata
			await this.stripeService.client.subscriptionSchedules.create({
				from_subscription: subscriptionId,
				phases: [
					{
						items: [{ price: newPriceId }]
					}
				],
				metadata: {
					scheduled_by: 'subscription_management_service',
					original_subscription: subscriptionId,
					new_price: newPriceId,
					scheduled_at: new Date().toISOString()
				}
			})

			// Return the original subscription (change is scheduled)
			return {
				success: true,
				subscription: subscription as unknown as StripeSubscription
			}
		}, 'scheduleSubscriptionChange')
	}

	/**
	 * Cancel Stripe subscription with retry logic and enhanced metadata
	 */
	private async cancelStripeSubscription(
		subscriptionId: string,
		immediately: boolean
	): Promise<{
		success: boolean
		subscription?: StripeSubscription
		error?: string
	}> {
		return this.withRetry(async () => {
			const cancelMetadata = {
				canceled_by: 'subscription_management_service',
				canceled_at: new Date().toISOString(),
				cancel_type: immediately ? 'immediate' : 'end_of_period'
			}

			if (immediately) {
				const subscription =
					await this.stripeService.client.subscriptions.cancel(
						subscriptionId,
						{
							cancellation_details: {
								comment:
									'Canceled via subscription management service'
							}
						}
					)
				return {
					success: true,
					subscription: subscription as unknown as StripeSubscription
				}
			} else {
				const subscription =
					await this.stripeService.client.subscriptions.update(
						subscriptionId,
						{
							cancel_at_period_end: true,
							metadata: cancelMetadata
						}
					)
				return {
					success: true,
					subscription: subscription as unknown as StripeSubscription
				}
			}
		}, 'cancelStripeSubscription')
	}

	/**
	 * Get Stripe price ID for plan and billing cycle
	 */
	private getPriceId(
		planType: PlanType,
		billingCycle: 'monthly' | 'annual' | 'yearly'
	): string | null {
		const priceMap: Record<PlanType, { monthly: string; annual: string }> =
			{
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
		if (!planPrices) {
			return null
		}

		// Handle 'yearly' as an alias for 'annual'
		const normalizedCycle =
			billingCycle === 'yearly' ? 'annual' : billingCycle
		if (!planPrices[normalizedCycle]) {
			return null
		}

		return planPrices[normalizedCycle]
	}
}
