import {
	Body,
	Controller,
	Headers,
	Logger,
	Post,
	Req,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
// import Stripe from 'stripe' // Using enhanced types from @repo/shared instead
import { StripeService } from './stripe.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripePortalService } from './stripe-portal.service'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type {
	CreateCheckoutDto,
	CreatePortalDto,
	CreateSubscriptionDto
} from './dto/checkout.dto'
import { getPriceId } from '@repo/shared/stripe/config'
import { UserSupabaseRepository } from '../database/user-supabase.repository'
import type { BillingPeriod, PlanType } from '@repo/shared'

export interface AuthenticatedUser {
	id: string
	email: string
}

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
	private readonly logger = new Logger(StripeController.name)

	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeWebhookService: StripeWebhookService,
		private readonly stripePortalService: StripePortalService,
		private readonly userRepository: UserSupabaseRepository
	) {}

	@Post('checkout')
	@ApiOperation({
		summary: 'Create Stripe checkout session',
		description:
			'Creates a secure checkout session for subscription purchase'
	})
	@ApiResponse({
		status: 200,
		description: 'Checkout session created successfully',
		schema: {
			properties: {
				url: { type: 'string', description: 'Stripe checkout URL' },
				sessionId: {
					type: 'string',
					description: 'Checkout session ID'
				}
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiBearerAuth()
	@UsePipes(
		new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
	)
	async createCheckout(
		@Body() dto: CreateCheckoutDto,
		@CurrentUser() user: AuthenticatedUser
	) {
		this.logger.log(
			`Creating checkout for user ${user.id}, plan: ${dto.planId}`
		)

		try {
			// Get the price ID from our centralized config
			const priceId = getPriceId(
				dto.planId as PlanType,
				dto.interval as BillingPeriod
			)

			if (!priceId) {
				throw new Error(
					`No price ID found for plan ${dto.planId} with interval ${dto.interval}`
				)
			}

			// Use the simplified portal service for checkout creation
			const result = await this.stripePortalService.createCheckoutSession(
				{
					userId: user.id,
					priceId,
					successUrl:
						dto.successUrl ??
						`${process.env.FRONTEND_URL ?? 'https://tenantflow.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
					cancelUrl:
						dto.cancelUrl ??
						`${process.env.FRONTEND_URL ?? 'https://tenantflow.app'}/pricing`
				}
			)

			this.logger.log(`Checkout session created: ${result.sessionId}`)

			return result
		} catch (error: unknown) {
			this.logger.error(
				`Failed to create checkout session: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error.stack : ''
			)
			throw new Error(
				`Failed to create checkout session: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	@Post('portal')
	@ApiOperation({
		summary: 'Create customer portal session',
		description:
			'Creates a secure customer portal session for subscription management'
	})
	@ApiResponse({
		status: 200,
		description: 'Portal session created successfully',
		schema: {
			properties: {
				url: { type: 'string', description: 'Customer portal URL' }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiBearerAuth()
	@UsePipes(
		new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
	)
	async createPortal(
		@Body() dto: CreatePortalDto,
		@CurrentUser() user: AuthenticatedUser
	) {
		this.logger.log(`Creating portal session for user ${user.id}`)

		try {
			// Use the simplified portal service
			const result = await this.stripePortalService.createPortalSession({
				userId: user.id,
				returnUrl:
					dto.returnUrl ??
					`${process.env.FRONTEND_URL ?? 'https://tenantflow.app'}/billing`
			})

			this.logger.log(`Portal session created for user ${user.id}`)

			return result
		} catch (error: unknown) {
			this.logger.error(
				`Failed to create portal session: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error.stack : ''
			)
			throw new Error(
				`Failed to create portal session: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	@Post('create-subscription')
	@ApiOperation({
		summary: 'Create subscription with confirmation token',
		description:
			"Creates subscription using Stripe's 2025 Confirmation Token pattern for embedded checkout"
	})
	@ApiResponse({
		status: 200,
		description: 'Subscription created successfully',
		schema: {
			properties: {
				subscription: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						status: { type: 'string' }
					}
				},
				clientSecret: {
					type: 'string',
					description:
						'Payment Intent client secret (if additional action required)'
				},
				requiresAction: {
					type: 'boolean',
					description:
						'Whether additional customer action is required'
				}
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiBearerAuth()
	@UsePipes(
		new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
	)
	async createSubscription(
		@Body() dto: CreateSubscriptionDto,
		@CurrentUser() user: AuthenticatedUser
	) {
		this.logger.log(
			`Creating subscription for user ${user.id}, plan: ${dto.planType}`
		)

		try {
			// Step 1: Get or create Stripe customer
			const existingUser = await this.userRepository.findById(user.id)
			if (!existingUser) {
				throw new Error('User not found')
			}
			let customerId = existingUser.stripeCustomerId

			if (!customerId) {
				// Create new Stripe customer
				const customer = await this.stripeService.createCustomer(
					user.email,
					user.email
				)
				customerId = customer.id

				// Update user with Stripe customer ID
				await this.userRepository.updateStripeCustomerId(
					user.id,
					customerId
				)
				this.logger.log(`Created new Stripe customer: ${customerId}`)
			}

			// Step 2: Get price ID from configuration
			const priceId = getPriceId(
				dto.planType as PlanType,
				dto.billingInterval as BillingPeriod
			)
			if (!priceId) {
				throw new Error(
					`No price ID found for plan ${dto.planType} with interval ${dto.billingInterval}`
				)
			}

			// Step 3: Create subscription using Confirmation Token
			if (!customerId) {
				throw new Error('Customer ID is required')
			}
			
			const subscription =
				await this.stripeService.createSubscriptionWithConfirmationToken(
					dto.confirmationTokenId,
					customerId,
					priceId,
					{
						userId: user.id,
						planType: dto.planType
					}
				)

			this.logger.log(
				`Subscription created: ${subscription.id}, status: ${subscription.status}`
			)

			// Step 4: Check if additional action is required
			const latestInvoice = subscription.latest_invoice
			const paymentIntent =
				typeof latestInvoice === 'object' &&
				latestInvoice &&
				'payment_intent' in latestInvoice
					? latestInvoice.payment_intent
					: null

			let requiresAction = false
			let clientSecret: string | undefined

			if (
				typeof paymentIntent === 'object' &&
				paymentIntent &&
				'status' in paymentIntent &&
				paymentIntent.status === 'requires_action'
			) {
				requiresAction = true
				clientSecret =
					'client_secret' in paymentIntent
						? (paymentIntent.client_secret as string) || undefined
						: undefined
			}

			return {
				subscription: {
					id: subscription.id,
					status: subscription.status
				},
				clientSecret,
				requiresAction
			}
		} catch (error: unknown) {
			this.logger.error(
				`Failed to create subscription: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error.stack : ''
			)
			throw new Error(
				`Failed to create subscription: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	@Post('webhook')
	@ApiOperation({
		summary: 'Stripe webhook endpoint',
		description: 'Handles Stripe webhook events with signature verification'
	})
	@ApiResponse({ status: 200, description: 'Webhook processed successfully' })
	@ApiResponse({ status: 400, description: 'Invalid webhook signature' })
	async handleWebhook(
		@Req() req: RawBodyRequest<FastifyRequest>,
		@Headers('stripe-signature') signature: string
	) {
		this.logger.log('Received Stripe webhook')

		try {
			if (!req.rawBody) {
				throw new Error('No raw body found in request')
			}
			if (!signature) {
				throw new Error('No stripe signature found in headers')
			}

			// Verify the webhook signature
			const event = this.stripeService.handleWebhook(
				req.rawBody,
				signature
			)

			this.logger.log(`Processing webhook event: ${event.type}`)

			// Delegate to the simplified webhook service
			// Return 2xx quickly, actual processing happens async
			await this.stripeWebhookService.handleWebhook(event)

			return { received: true }
		} catch (error: unknown) {
			this.logger.error(
				`Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error.stack : ''
			)
			throw new Error(
				`Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	// NOTE: All webhook event handling has been moved to StripeWebhookService
	// The previous individual handler methods have been removed as part of the simplification
	// - handleCheckoutCompleted
	// - handleSubscriptionChange
	// - handlePaymentSucceeded
	// - handlePaymentFailed
	// These are now handled centrally by StripeWebhookService with trust in Stripe as source of truth

	// NOTE: Embedded checkout can use the regular checkout endpoint
	// The frontend can handle the difference in UI presentation
	// Removing this duplicate endpoint as part of simplification

	// NOTE: Checkout session retrieval removed as part of simplification
	// Success/failure is handled via webhooks, not polling
}
