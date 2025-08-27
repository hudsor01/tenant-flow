import {
	Body,
	Controller,
	Headers,
	Post,
	Req,
	UsePipes,
	ValidationPipe,
	NotFoundException,
	BadRequestException,
	InternalServerErrorException
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { PinoLogger } from 'nestjs-pino'
import { StripeService } from './stripe.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripePortalService } from './stripe-portal.service'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type {
	CreateCheckoutRequest,
	CreatePortalRequest,
	CreateSubscriptionDto
} from '../schemas/stripe.schemas'
import { getPriceId } from '@repo/shared/stripe/config'
import { SupabaseService } from '../database/supabase.service'
import type { BillingPeriod, PlanType } from '@repo/shared'

// Use shared type instead of local interface
import type { User as AuthenticatedUser } from '@repo/shared'

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeWebhookService: StripeWebhookService,
		private readonly stripePortalService: StripePortalService,
		private readonly supabaseService: SupabaseService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

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
		@Body() dto: CreateCheckoutRequest,
		@CurrentUser() user: AuthenticatedUser
	) {
		this.logger.info(
			{
				checkout: {
					userId: user.id,
					planId: dto.planId,
					interval: dto.interval
				}
			},
			`Creating checkout for user ${user.id}, plan: ${dto.planId}`
		)

		try {
			// Get the price ID from our centralized config
			const priceId = getPriceId(
				dto.planId as PlanType,
				dto.interval as BillingPeriod
			)

			if (!priceId) {
				throw new BadRequestException(
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

			this.logger.info(
				{
					checkout: {
						sessionId: result.sessionId,
						userId: user.id
					}
				},
				`Checkout session created: ${result.sessionId}`
			)

			return result
		} catch (error: unknown) {
			this.logger.error(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
					},
					checkout: {
						userId: user.id,
						planId: dto.planId
					}
				},
				'Failed to create checkout session'
			)
			throw new InternalServerErrorException(
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
		@Body() dto: CreatePortalRequest,
		@CurrentUser() user: AuthenticatedUser
	) {
		this.logger.info(
			{
				portal: {
					userId: user.id,
					returnUrl: dto.returnUrl
				}
			},
			`Creating portal session for user ${user.id}`
		)

		try {
			// Use the simplified portal service
			const result = await this.stripePortalService.createPortalSession({
				userId: user.id,
				returnUrl:
					dto.returnUrl ??
					`${process.env.FRONTEND_URL ?? 'https://tenantflow.app'}/billing`
			})

			this.logger.info(
				{
					portal: {
						userId: user.id,
						url: result.url
					}
				},
				`Portal session created for user ${user.id}`
			)

			return result
		} catch (error: unknown) {
			this.logger.error(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
					},
					portal: {
						userId: user.id
					}
				},
				'Failed to create portal session'
			)
			throw new InternalServerErrorException(
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
		this.logger.info(
			{
				subscription: {
					userId: user.id,
					planType: dto.planType,
					billingInterval: dto.billingInterval,
					confirmationTokenId: dto.confirmationTokenId
				}
			},
			`Creating subscription for user ${user.id}, plan: ${dto.planType}`
		)

		try {
			// Step 1: Get or create Stripe customer
			const { data: existingUser } = await this.supabaseService
				.getAdminClient()
				.from('User')
				.select('*')
				.eq('id', user.id)
				.single()

			if (!existingUser) {
				throw new NotFoundException('User not found')
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
				await this.supabaseService
					.getAdminClient()
					.from('User')
					.update({ stripeCustomerId: customerId })
					.eq('id', user.id)

				this.logger.info(
					{
						stripeCustomer: {
							customerId,
							userId: user.id,
							email: user.email
						}
					},
					`Created new Stripe customer: ${customerId}`
				)
			}

			// Step 2: Get price ID from configuration
			const priceId = getPriceId(
				dto.planType as PlanType,
				dto.billingInterval as BillingPeriod
			)
			if (!priceId) {
				throw new BadRequestException(
					`No price ID found for plan ${dto.planType} with interval ${dto.billingInterval}`
				)
			}

			// Step 3: Create subscription using Confirmation Token
			if (!customerId) {
				throw new BadRequestException('Customer ID is required')
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

			this.logger.info(
				{
					subscription: {
						id: subscription.id,
						status: subscription.status,
						userId: user.id,
						planType: dto.planType,
						customerId
					}
				},
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
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
					},
					subscription: {
						userId: user.id,
						planType: dto.planType,
						confirmationTokenId: dto.confirmationTokenId
					}
				},
				'Failed to create subscription'
			)
			throw new InternalServerErrorException(
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
		this.logger.info('Received Stripe webhook')

		try {
			if (!req.rawBody) {
				throw new BadRequestException('No raw body found in request')
			}
			if (!signature) {
				throw new BadRequestException(
					'No stripe signature found in headers'
				)
			}

			// Verify the webhook signature
			const event = await this.stripeService.handleWebhook(
				req.rawBody,
				signature
			)

			this.logger.info(
				{
					webhook: {
						eventType: event.type,
						eventId: event.id,
						livemode: event.livemode
					}
				},
				`Processing webhook event: ${event.type}`
			)

			// Delegate to the simplified webhook service
			// Return 2xx quickly, actual processing happens async
			await this.stripeWebhookService.handleWebhook(event)

			return { received: true }
		} catch (error: unknown) {
			this.logger.error(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
					},
					webhook: {
						hasRawBody: !!req.rawBody,
						hasSignature: !!signature
					}
				},
				'Webhook processing failed'
			)
			throw new InternalServerErrorException(
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
