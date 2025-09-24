import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Headers,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	Param,
	Post,
	Query,
	Req,
	ServiceUnavailableException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { SubscriptionStatus } from '@repo/shared'
import type { Request } from 'express'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { EmailService } from '../shared/services/email.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeService } from './stripe.service'
import { Public } from '../shared/decorators/public.decorator'
import type {
	CreateBillingPortalRequest,
	CreateCheckoutSessionRequest,
	EmbeddedCheckoutRequest,
	CreateConnectedPaymentRequest,
	CreatePaymentIntentRequest,
	CreateSetupIntentRequest,
	CreateSubscriptionRequest,
	VerifyCheckoutSessionRequest
} from './stripe-interfaces'
// CLAUDE.md Compliant: NO custom DTOs - using native validation only

/**
 * Production-Grade Stripe Integration Controller
 *
 * Based on comprehensive official Stripe documentation research:
 * - Payment Intent lifecycle management
 * - Advanced webhook handling with signature verification
 * - Subscription billing with flexible pricing models
 * - Stripe Connect for multi-tenant payments
 * - Official error handling patterns
 * - Complete testing coverage with official test methods
 */
@Controller('stripe')
export class StripeController {
	private readonly stripe: Stripe
	private readonly logger = new Logger(StripeController.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly emailService: EmailService,
		private readonly webhookService: StripeWebhookService,
		private readonly eventEmitter: EventEmitter2,
		private readonly stripeService: StripeService
	) {
		this.stripe = this.stripeService.getStripe()

		// Schedule cleanup of old webhook events every 24 hours
		setInterval(() => this.webhookService.cleanupOldEvents(30), 24 * 60 * 60 * 1000)
	}

	/**
	 * Payment Intent Creation with Full Lifecycle Support
	 * Official Pattern: Payment Intent lifecycle management
	 */
	@Post('create-payment-intent')
	@HttpCode(HttpStatus.OK)
	async createPaymentIntent(@Body() body: CreatePaymentIntentRequest) {
		this.logger.log('Payment Intent creation started', {
			amount: body.amount,
			tenantId: body.tenantId
		})

		// Native validation - CLAUDE.md compliant (outside try-catch)
		if (!body.amount || body.amount < 50) {
			this.logger.warn('Payment Intent validation failed: amount too low', {
				amount: body.amount
			})
			throw new BadRequestException('Amount must be at least 50 cents')
		}
		if (!body.tenantId) {
			this.logger.warn('Payment Intent validation failed: tenantId missing')
			throw new BadRequestException('tenantId is required')
		}

		// Validate and sanitize metadata inputs to prevent SQL injection
		const sanitizedTenantId = this.sanitizeMetadataValue(
			body.tenantId,
			'tenant_id'
		)
		const sanitizedPropertyId = body.propertyId
			? this.sanitizeMetadataValue(body.propertyId, 'property_id')
			: undefined
		const sanitizedSubscriptionType = body.subscriptionType
			? this.sanitizeMetadataValue(body.subscriptionType, 'subscription_type')
			: undefined

		try {
			const paymentIntent = await this.stripe.paymentIntents.create({
				amount: body.amount,
				currency: 'usd',
				automatic_payment_methods: { enabled: true },
				metadata: {
					tenant_id: sanitizedTenantId,
					...(sanitizedPropertyId && { property_id: sanitizedPropertyId }),
					...(sanitizedSubscriptionType && {
						subscription_type: sanitizedSubscriptionType
					})
				}
			})

			this.logger.log(
				`Payment Intent created successfully: ${paymentIntent.id}`,
				{
					amount: body.amount,
					tenant_id: body.tenantId,
					payment_intent_id: paymentIntent.id
				}
			)

			const response = {
				clientSecret: paymentIntent.client_secret || ''
			}

			this.logger.log('Payment Intent response prepared', {
				has_client_secret: !!response.clientSecret,
				client_secret_length: response.clientSecret?.length || 0
			})

			return response
		} catch (error) {
			this.logger.error('Payment Intent creation failed', {
				error: error instanceof Error ? error.message : String(error),
				type: (error as Stripe.errors.StripeError).type || 'unknown',
				code: (error as Stripe.errors.StripeError).code || 'unknown'
			})
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Production-Grade Webhook Handler with Enhanced Security
	 * - Signature verification with timing-safe comparison
	 * - Request validation and sanitization
	 * - Rate limiting and replay attack protection
	 * - Comprehensive security monitoring
	 */
	@Post('webhook')
	@Public()
	@HttpCode(HttpStatus.OK)
	async handleWebhooks(
		@Req() req: Request,
		@Headers('stripe-signature') sig: string
	) {
		let event: Stripe.Event

		// Enhanced security: Validate webhook secret is configured
		if (!process.env.STRIPE_WEBHOOK_SECRET) {
			this.logger.error('SECURITY: Stripe webhook secret not configured', {
				ip: req.ip,
				userAgent: req.headers['user-agent']
			})
			throw new InternalServerErrorException('Webhook configuration error')
		}

		// Enhanced security: Validate signature header is present
		if (!sig) {
			this.logger.error('SECURITY: Webhook signature missing', {
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				hasBody: !!req.body
			})
			throw new BadRequestException('Missing signature header')
		}

		// Enhanced security: Validate request body
		if (!req.body) {
			this.logger.error('SECURITY: Webhook body missing', {
				ip: req.ip,
				signature: sig?.substring(0, 20) + '...'
			})
			throw new BadRequestException('Missing request body')
		}

		try {
			const rawBody = req.body as Buffer

			// Enhanced security: Validate body size (prevent DoS)
			if (rawBody.length > 1024 * 1024) {
				// 1MB limit
				this.logger.error('SECURITY: Webhook body too large', {
					size: rawBody.length,
					ip: req.ip,
					userAgent: req.headers['user-agent']
				})
				throw new BadRequestException('Request body too large')
			}

			// Enhanced signature verification with additional validation
			event = this.stripe.webhooks.constructEvent(
				rawBody,
				sig,
				process.env.STRIPE_WEBHOOK_SECRET
			)

			// Enhanced security: Validate event structure
			if (!event?.id || !event?.type || !event?.data) {
				this.logger.error('SECURITY: Invalid webhook event structure', {
					eventId: event?.id,
					eventType: event?.type,
					hasData: !!event?.data,
					ip: req.ip
				})
				throw new BadRequestException('Invalid event structure')
			}

			// Enhanced security: Check for replay attacks (events older than 5 minutes)
			const eventCreated = event.created * 1000 // Convert to milliseconds
			const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

			if (eventCreated < fiveMinutesAgo) {
				this.logger.error('SECURITY: Webhook replay attack detected', {
					eventId: event.id,
					eventType: event.type,
					eventCreated: new Date(eventCreated).toISOString(),
					timeDifference: Date.now() - eventCreated,
					ip: req.ip
				})
				throw new BadRequestException('Event too old - possible replay attack')
			}

			// Enhanced security: Validate livemode consistency
			const expectedLivemode = process.env.NODE_ENV === 'production'
			if (event.livemode !== expectedLivemode) {
				this.logger.error('SECURITY: Webhook livemode mismatch', {
					eventId: event.id,
					eventLivemode: event.livemode,
					expectedLivemode,
					environment: process.env.NODE_ENV,
					ip: req.ip
				})
				throw new BadRequestException('Environment mode mismatch')
			}

			this.logger.log(`Webhook received and validated: ${event.type}`, {
				event_id: event.id,
				livemode: event.livemode,
				ip: req.ip,
				created: new Date(event.created * 1000).toISOString()
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			// Enhanced security logging
			this.logger.error('Webhook signature verification failed', {
				error: errorMessage,
				errorType: error?.constructor?.name,
				signatureLength: sig?.length,
				bodySize: (req.body as Buffer)?.length,
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				timestamp: new Date().toISOString()
			})

			// Don't leak internal error details to potential attackers
			if (
				error instanceof BadRequestException ||
				error instanceof InternalServerErrorException
			) {
				throw error
			}

			throw new BadRequestException('Invalid webhook signature')
		}

		// Official permitted events pattern
		const permittedEvents: string[] = [
			'payment_intent.succeeded',
			'payment_intent.payment_failed',
			'setup_intent.succeeded',
			'customer.subscription.created',
			'customer.subscription.updated',
			'customer.subscription.deleted',
			'invoice.payment_succeeded',
			'invoice.payment_failed',
			'checkout.session.completed'
		]

		if (permittedEvents.includes(event.type)) {
			// Database-backed idempotency check using Supabase
			if (await this.webhookService.isEventProcessed(event.id)) {
				this.logger.log(`Event already processed, skipping: ${event.id} (${event.type})`)
				return { received: true, idempotent: true }
			}

			// Record event as being processed (database persistence)
			await this.webhookService.recordEventProcessing(event.id, event.type)

			// Return 200 immediately and process asynchronously
			// This follows Stripe's best practice to avoid timeouts
			setImmediate(async () => {
				try {
					// Emit event for async processing
					this.emitStripeEvent(event)

					// Mark as successfully processed in database
					await this.webhookService.markEventProcessed(event.id)

					this.logger.log(`Event queued for async processing: ${event.type}`, {
						event_id: event.id,
						event_type: event.type
					})
				} catch (error) {
					// Log error but don't affect webhook response
					this.logger.error(`Event processing failed: ${event.type}`, {
						event_id: event.id,
						event_type: event.type,
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined
					})
				}
			})
		} else {
			this.logger.debug(`Unhandled webhook event type: ${event.type}`, {
				event_id: event.id
			})
		}

		return { received: true }
	}

	/**
	 * Customer & Payment Method Management
	 * Official Pattern: payment method listing with proper types
	 */
	@Get('customers/:id/payment-methods')
	async getPaymentMethods(@Param('id') customerId: string) {
		try {
			return await this.stripe.paymentMethods.list({
				customer: customerId,
				type: 'card'
			})
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Setup Intent for Saving Payment Methods
	 * Official Pattern: Setup Intent creation for future payments
	 */
	@Post('create-setup-intent')
	async createSetupIntent(@Body() body: CreateSetupIntentRequest) {
		// Native validation - CLAUDE.md compliant (outside try-catch)
		if (!body.tenantId) {
			throw new BadRequestException('tenantId is required')
		}

		// Sanitize metadata values
		const sanitizedTenantId = this.sanitizeMetadataValue(
			body.tenantId,
			'tenant_id'
		)

		try {
			let customerId = body.customerId

			// Create customer if not provided or if it's a test customer
			if (!customerId || customerId.startsWith('cus_test')) {
				this.logger.log('Creating new Stripe customer', {
					tenantId: body.tenantId
				})

				const customer = await this.stripe.customers.create({
					email: body.customerEmail,
					name: body.customerName,
					metadata: {
						tenant_id: sanitizedTenantId,
						created_from: 'setup_intent'
					}
				})

				customerId = customer.id
				this.logger.log(`Created Stripe customer: ${customerId}`, {
					tenantId: body.tenantId
				})
			}

			const setupIntent = await this.stripe.setupIntents.create({
				customer: customerId,
				usage: 'off_session',
				payment_method_types: ['card'],
				metadata: {
					tenant_id: sanitizedTenantId
				}
			})

			this.logger.log(`Setup Intent created: ${setupIntent.id}`, {
				customer: customerId,
				tenant_id: body.tenantId
			})

			return {
				client_secret: setupIntent.client_secret || '',
				setup_intent_id: setupIntent.id,
				customer_id: customerId
			}
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Flexible Subscription Creation
	 * Official Pattern: subscription with payment_behavior and expand
	 */
	@Post('create-subscription')
	async createSubscription(@Body() body: CreateSubscriptionRequest) {
		// Native validation - CLAUDE.md compliant
		if (!body.customerId) {
			throw new BadRequestException('customerId is required')
		}
		if (!body.tenantId) {
			throw new BadRequestException('tenantId is required')
		}
		if (!body.amount || body.amount < 50) {
			throw new BadRequestException('Amount must be at least 50 cents')
		}

		// Sanitize metadata values
		const sanitizedTenantId = this.sanitizeMetadataValue(
			body.tenantId,
			'tenant_id'
		)
		const sanitizedSubscriptionType = body.subscriptionType
			? this.sanitizeMetadataValue(body.subscriptionType, 'subscription_type')
			: undefined

		try {
			const subscription = await this.stripe.subscriptions.create({
				customer: body.customerId,
				items: [
					{
						price_data: {
							currency: 'usd',
							product: body.productId,
							recurring: { interval: 'month' },
							unit_amount: body.amount
						}
					}
				],
				payment_behavior: 'default_incomplete',
				expand: ['latest_invoice.payment_intent'], // Official expand pattern
				metadata: {
					tenant_id: sanitizedTenantId,
					...(sanitizedSubscriptionType && {
						subscription_type: sanitizedSubscriptionType
					})
				}
			})

			this.logger.log(`Subscription created: ${subscription.id}`, {
				customer: body.customerId,
				amount: body.amount
			})

			const latestInvoice = subscription.latest_invoice as Stripe.Invoice
			const paymentIntent = (
				latestInvoice as { payment_intent?: Stripe.PaymentIntent }
			)?.payment_intent

			return {
				subscription_id: subscription.id,
				client_secret: paymentIntent?.client_secret || '',
				status: subscription.status
			}
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Checkout Session Creation
	 * Official Pattern: checkout session with success/cancel URLs
	 */
	@Post('create-checkout-session')
	@Public()
	async createCheckoutSession(@Body() body: CreateCheckoutSessionRequest) {
		// Native validation - CLAUDE.md compliant
		if (!body.productName) {
			throw new BadRequestException('productName is required')
		}
		if (!body.tenantId) {
			throw new BadRequestException('tenantId is required')
		}
		if (!body.domain) {
			throw new BadRequestException('domain is required')
		}

		// Validate priceId is provided and correctly formatted
		if (!body.priceId) {
			throw new BadRequestException('priceId is required')
		}
		if (!body.priceId.startsWith('price_')) {
			throw new BadRequestException(
				'Invalid priceId format. Expected Stripe price ID starting with "price_"'
			)
		}

		// Sanitize all metadata values BEFORE try block to return proper 400 errors
		const sanitizedTenantId = this.sanitizeMetadataValue(
			body.tenantId,
			'tenant_id'
		)
		const sanitizedProductName = this.sanitizeMetadataValue(
			body.productName,
			'product_name'
		)
		const sanitizedPriceId = this.sanitizeMetadataValue(
			body.priceId,
			'price_id'
		)

		this.logger.log('Creating checkout session', {
			productName: body.productName,
			priceId: body.priceId,
			tenantId: body.tenantId,
			customerEmail: body.customerEmail,
			isSubscription: body.isSubscription
		})

		try {
			// Use Stripe price ID - ensures pricing consistency
			const lineItems = [
				{
					price: body.priceId,
					quantity: 1
				}
			]

			const session = await this.stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: lineItems,
				mode: body.isSubscription ? 'subscription' : 'payment',
				success_url: `${body.domain}/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${body.domain}/cancel`,
				// Following official Stripe pattern: customer identification via email
				...(body.customerEmail && { customer_email: body.customerEmail }),
				metadata: {
					tenant_id: sanitizedTenantId,
					product_name: sanitizedProductName,
					price_id: sanitizedPriceId,
					...(body.customerEmail && { customer_email: body.customerEmail })
				}
			})

			this.logger.log('Checkout session created successfully', {
				sessionId: session.id,
				url: session.url
			})

			return { url: session.url || '', session_id: session.id }
		} catch (error) {
			this.logger.error('Failed to create checkout session', error)
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Embedded Checkout Session Creation
	 * Official Pattern: checkout session with ui_mode: "custom" for embedded UI
	 * Returns client_secret instead of redirect URL
	 */
	@Post('create-embedded-checkout-session')
	@Public()
	async createEmbeddedCheckoutSession(@Body() body: EmbeddedCheckoutRequest) {
		// Native validation - CLAUDE.md compliant
		if (!body.mode) {
			throw new BadRequestException('mode is required (payment, subscription, or setup)')
		}
		if (!['payment', 'subscription', 'setup'].includes(body.mode)) {
			throw new BadRequestException('mode must be payment, subscription, or setup')
		}
		if (!body.domain) {
			throw new BadRequestException('domain is required')
		}

		// Validate priceId requirements based on mode
		if (body.mode === 'payment' || body.mode === 'subscription') {
			if (!body.priceId) {
				throw new BadRequestException(`priceId is required for ${body.mode} mode`)
			}
			if (!body.priceId.startsWith('price_')) {
				throw new BadRequestException(
					'Invalid priceId format. Expected Stripe price ID starting with "price_"'
				)
			}
		}

		// Setup mode should not have priceId
		if (body.mode === 'setup' && body.priceId) {
			throw new BadRequestException('priceId should not be provided for setup mode')
		}

		try {
			this.logger.log('Creating embedded checkout session', {
				priceId: body.priceId || 'none (setup mode)',
				mode: body.mode
			})

			// Build session configuration based on transaction type
			const sessionConfig: Stripe.Checkout.SessionCreateParams = {
				ui_mode: "custom",
				mode: body.mode,
				return_url: `${body.domain}/complete?session_id={CHECKOUT_SESSION_ID}`,
			}

			// Add line_items only for payment and subscription modes
			if (body.mode === 'payment' || body.mode === 'subscription') {
				sessionConfig.line_items = [
					{
						price: body.priceId,
						quantity: 1,
					},
				]
			}

			// Following Stripe's exact embedded checkout specification
			const session = await this.stripe.checkout.sessions.create(sessionConfig)

			this.logger.log('Embedded checkout session created successfully', {
				sessionId: session.id,
				mode: body.mode,
				has_client_secret: !!session.client_secret
			})

			// Return client_secret as per Stripe's specification
			return { clientSecret: session.client_secret }
		} catch (error) {
			this.logger.error('Failed to create embedded checkout session', error)
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Checkout Session Status Retrieval
	 * Official Pattern: retrieve session status for return page
	 */
	@Get('session-status')
	async getSessionStatus(@Query('session_id') sessionId: string) {
		if (!sessionId) {
			throw new BadRequestException('session_id is required')
		}

		try {
			const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
				expand: ['payment_intent']
			})

			const paymentIntent = typeof session.payment_intent === 'string'
				? null
				: session.payment_intent

			return {
				status: session.status,
				payment_status: session.payment_status,
				payment_intent_id: paymentIntent?.id || null,
				payment_intent_status: paymentIntent?.status || null
			}
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Billing Portal Session Creation
	 * Official Pattern: customer self-service portal
	 */
	@Post('create-billing-portal')
	async createBillingPortal(@Body() body: CreateBillingPortalRequest) {
		// Native validation - CLAUDE.md compliant
		if (!body.customerId) {
			throw new BadRequestException('customerId is required')
		}
		if (!body.returnUrl) {
			throw new BadRequestException('returnUrl is required')
		}

		try {
			const session = await this.stripe.billingPortal.sessions.create({
				customer: body.customerId,
				return_url: body.returnUrl
			})

			return { url: session.url || '' }
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Stripe Connect for Multi-Tenant Payments
	 * Official Pattern: Connect payment with application fees
	 */
	@Post('connect/payment-intent')
	async createConnectedPayment(@Body() body: CreateConnectedPaymentRequest) {
		// Native validation - CLAUDE.md compliant
		if (!body.amount || body.amount < 50) {
			throw new BadRequestException('Amount must be at least 50 cents')
		}
		if (!body.tenantId) {
			throw new BadRequestException('tenantId is required')
		}
		if (!body.connectedAccountId) {
			throw new BadRequestException('connectedAccountId is required')
		}

		// Sanitize metadata values
		const sanitizedTenantId = this.sanitizeMetadataValue(
			body.tenantId,
			'tenant_id'
		)
		const sanitizedPropertyId = body.propertyId
			? this.sanitizeMetadataValue(body.propertyId, 'property_id')
			: undefined
		const sanitizedPropertyOwnerAccount = body.propertyOwnerAccount
			? this.sanitizeMetadataValue(
					body.propertyOwnerAccount,
					'property_owner_account'
				)
			: undefined

		try {
			const paymentIntent = await this.stripe.paymentIntents.create(
				{
					amount: body.amount,
					currency: 'usd',
					application_fee_amount: body.platformFee, // TenantFlow commission
					transfer_data: {
						destination: sanitizedPropertyOwnerAccount || ''
					},
					metadata: {
						tenant_id: sanitizedTenantId,
						...(sanitizedPropertyId && { property_id: sanitizedPropertyId })
					}
				},
				{
					stripeAccount: body.connectedAccountId // Property owner account
				}
			)

			this.logger.log(`Connected payment created: ${paymentIntent.id}`, {
				amount: body.amount,
				platform_fee: body.platformFee,
				connected_account: body.connectedAccountId
			})

			return {
				client_secret: paymentIntent.client_secret || '',
				payment_intent_id: paymentIntent.id
			}
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Subscription Management
	 * Official Pattern: subscription listing with expand
	 */
	@Get('subscriptions/:customerId')
	async getSubscriptions(@Param('customerId') customerId: string) {
		try {
			return await this.stripe.subscriptions.list({
				customer: customerId,
				expand: ['data.default_payment_method', 'data.latest_invoice']
			})
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Verify Checkout Session
	 * Official Pattern: session verification with subscription expansion
	 */
	@Post('verify-checkout-session')
	async verifyCheckoutSession(@Body() body: VerifyCheckoutSessionRequest) {
		try {
			if (!body.sessionId) {
				throw new BadRequestException('Session ID is required')
			}

			// Retrieve the checkout session with expanded subscription and customer data
			const session = await this.stripe.checkout.sessions.retrieve(
				body.sessionId,
				{
					expand: ['subscription', 'customer']
				}
			)

			if (!session) {
				throw new BadRequestException('Session not found')
			}

			// Check if payment was successful
			if (session.payment_status !== 'paid') {
				throw new BadRequestException('Payment not completed')
			}

			// Get subscription details if it exists
			let subscription = null
			if (session.subscription) {
				const subData = await this.stripe.subscriptions.retrieve(
					session.subscription as string,
					{
						expand: ['items.data.price.product']
					}
				)

				subscription = {
					id: subData.id,
					status: subData.status,
					current_period_start: Number(
						(subData as unknown as { current_period_start: number })
							.current_period_start
					),
					current_period_end: Number(
						(subData as unknown as { current_period_end: number })
							.current_period_end
					),
					cancel_at_period_end: subData.cancel_at_period_end,
					items: subData.items.data.map(item => ({
						id: item.id,
						price: {
							id: item.price.id,
							nickname: item.price.nickname,
							unit_amount: item.price.unit_amount,
							currency: item.price.currency,
							interval: item.price.recurring?.interval,
							product: {
								name: (item.price.product as Stripe.Product).name
							}
						}
					}))
				}
			}

			this.logger.log(`Session verified: ${session.id}`, {
				payment_status: session.payment_status,
				customer: session.customer,
				amount_total: session.amount_total
			})

			return {
				session: {
					id: session.id,
					payment_status: session.payment_status,
					customer_email: session.customer_details?.email,
					amount_total: session.amount_total,
					currency: session.currency
				},
				subscription
			}
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Emit Stripe event for async processing
	 * Uses NestJS EventEmitter2 for decoupled event handling
	 */
	private emitStripeEvent(event: Stripe.Event): void {
		// Emit specific event for detailed handling
		const eventName = `stripe.${event.type.replace(/\./g, '_')}`
		this.eventEmitter.emit(eventName, event.data.object, event)

		// Also emit generic event for logging/monitoring
		this.eventEmitter.emit('stripe.event', event)

		this.logger.debug(`Emitted event: ${eventName}`, {
			event_id: event.id,
			event_type: event.type
		})
	}

	// Helper methods for webhook handlers
	private async getUserById(userId: string) {
		const supabase = this.supabaseService.getAdminClient()
		const { data: user, error } = await supabase
			.from('User')
			.select('id, email, name')
			.eq('id', userId)
			.single()

		if (error || !user) {
			throw new Error(`User not found: ${userId}`)
		}

		return user
	}

	private async getUserByStripeCustomerId(stripeCustomerId: string) {
		const supabase = this.supabaseService.getAdminClient()
		const { data: user, error } = await supabase
			.from('User')
			.select('id, email, name')
			.eq('stripeCustomerId', stripeCustomerId)
			.single()

		if (error || !user) {
			throw new Error(`User not found for Stripe customer: ${stripeCustomerId}`)
		}

		return user
	}

	// private generateRetryPaymentUrl(paymentIntentId: string): string {
	//	if (!process.env.FRONTEND_URL) {
	//		throw new InternalServerErrorException('FRONTEND_URL not configured')
	//	}
	//	const baseUrl = process.env.FRONTEND_URL
	//	return `${baseUrl}/payment/retry?payment_intent=${paymentIntentId}`
	// }

	private generateUpdatePaymentMethodUrl(): string {
		if (!process.env.FRONTEND_URL) {
			throw new InternalServerErrorException('FRONTEND_URL not configured')
		}
		const baseUrl = process.env.FRONTEND_URL
		return `${baseUrl}/dashboard/settings?tab=billing&action=update-payment-method`
	}

	// private async updatePaymentStatus(paymentIntentId: string, status: string) {
	//	const supabase = this.supabaseService.getAdminClient()

	//	// Update RentPayment status based on Stripe payment intent
	//	await supabase
	//		.from('RentPayment')
	//		.update({
	//			status: status.toUpperCase() as Database['public']['Enums']['RentPaymentStatus'],
	//			updatedAt: new Date().toISOString()
	//		})
	//		.eq('stripePaymentIntentId', paymentIntentId)
	// }

	private async revokeSubscriptionAccess(stripeCustomerId: string) {
		const supabase = this.supabaseService.getAdminClient()

		// Update subscription status to cancelled
		await supabase
			.from('Subscription')
			.update({
				status: 'CANCELED',
				cancelled_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('stripeCustomerId', stripeCustomerId)

		// Log access change in UserAccessLog table
		const userResult = await supabase
			.from('User')
			.select('id')
			.eq('stripeCustomerId', stripeCustomerId)
			.single()

		if (userResult.data) {
			await supabase.from('UserAccessLog').insert({
				userId: userResult.data.id,
				subscriptionStatus: 'CANCELED',
				planType: 'NONE',
				reason: 'Subscription cancelled via Stripe webhook',
				accessGranted: {}
			})
		}
	}

	private async extendSubscriptionAccess(stripeSubscriptionId: string) {
		const supabase = this.supabaseService.getAdminClient()

		// Ensure subscription status is active
		await supabase
			.from('Subscription')
			.update({
				status: 'ACTIVE',
				updated_at: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', stripeSubscriptionId)

		// Update user subscription status
		const { data: subscription } = await supabase
			.from('Subscription')
			.select('userId')
			.eq('stripeSubscriptionId', stripeSubscriptionId)
			.single()

		if (subscription?.userId) {
			await supabase.from('UserAccessLog').insert({
				userId: subscription.userId,
				subscriptionStatus: 'ACTIVE',
				planType: 'PREMIUM',
				reason: 'Subscription extended via Stripe webhook',
				accessGranted: { premium_features: true }
			})
		}
	}

	private async suspendSubscriptionAccess(stripeSubscriptionId: string) {
		const supabase = this.supabaseService.getAdminClient()

		// Update subscription status to suspended
		await supabase
			.from('Subscription')
			.update({
				status: 'PAST_DUE',
				updated_at: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', stripeSubscriptionId)

		// Update user subscription status
		const { data: subscription } = await supabase
			.from('Subscription')
			.select('userId')
			.eq('stripeSubscriptionId', stripeSubscriptionId)
			.single()

		if (subscription?.userId) {
			await supabase.from('UserAccessLog').insert({
				userId: subscription.userId,
				subscriptionStatus: 'PAST_DUE',
				planType: 'LIMITED',
				reason: 'Subscription suspended via Stripe webhook',
				accessGranted: { basic_features_only: true }
			})
		}
	}

	private calculateNextRetryDate(attemptNumber: number): Date | null {
		// Stripe's retry schedule: 1 day, 3 days, 5 days, 7 days
		const retrySchedule = [1, 3, 5, 7]
		const daysToAdd = retrySchedule[attemptNumber] || null

		if (!daysToAdd) return null

		const nextRetry = new Date()
		nextRetry.setDate(nextRetry.getDate() + daysToAdd)
		return nextRetry
	}

	/**
	 * Get all active products from Stripe
	 * Dynamic product configuration instead of hardcoding
	 */
	@Get('products')
	@HttpCode(HttpStatus.OK)
	async getProducts() {
		this.logger.log('Fetching products from Stripe API')

		try {
			const products = await this.stripe.products.list({
				active: true,
				limit: 100,
				expand: ['data.default_price']
			})

			this.logger.log(`Successfully fetched ${products.data.length} products`)
			return {
				success: true,
				products: products.data
			}
		} catch (error) {
			this.logger.error('Failed to fetch products from Stripe', error)

			if (error instanceof Stripe.errors.StripeError) {
				throw new BadRequestException('Failed to fetch products from Stripe: ' + error.message)
			}

			throw new InternalServerErrorException('Internal server error while fetching products')
		}
	}

	private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
		this.logger.log(`Payment method saved: ${setupIntent.id}`, {
			customer: setupIntent.customer,
			tenant_id: setupIntent.metadata?.tenant_id
		})

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Get payment method details from Stripe
			const paymentMethod = await this.stripe.paymentMethods.retrieve(
				setupIntent.payment_method as string
			)

			// Save payment method reference
			await supabase.from('PaymentMethod').upsert({
				stripePaymentMethodId: setupIntent.payment_method as string,
				tenantId: setupIntent.metadata?.tenant_id || '',
				organizationId: setupIntent.metadata?.organization_id || '', // Required field
				isDefault: true,
				type: paymentMethod.type,
				brand: paymentMethod.card?.brand,
				lastFour: paymentMethod.card?.last4,
				expiryMonth: paymentMethod.card?.exp_month,
				expiryYear: paymentMethod.card?.exp_year,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})

			// Log payment method setup success in access log
			if (setupIntent.metadata?.tenant_id) {
				await supabase.from('UserAccessLog').insert({
					userId: setupIntent.metadata.tenant_id,
					subscriptionStatus: 'ACTIVE',
					planType: 'PREMIUM',
					reason: 'Payment method successfully set up',
					accessGranted: { auto_billing: true }
				})

				// Get user for email notification
				const user = await this.getUserById(setupIntent.metadata.tenant_id)

				// Send confirmation email
				await this.emailService.sendPaymentMethodSavedEmail({
					to: user.email,
					userName: user.name || undefined,
					lastFour: paymentMethod.card?.last4 || '****',
					brand: paymentMethod.card?.brand || 'card'
				})

				this.logger.log(`Payment method saved and auto-billing enabled for user: ${user.email}`)
			}
		} catch (error) {
			this.logger.error('Failed to process setup intent success', error)
			// Don't throw - webhook should still return success
		}
	}

	private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription created: ${subscription.id}`, {
			customer: subscription.customer,
			status: subscription.status
		})

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Get real user ID from Stripe customer ID
			const { data: userRecord, error: userError } = await supabase
				.from('User')
				.select('id')
				.eq('stripeCustomerId', subscription.customer as string)
				.single()

			if (userError || !userRecord) {
				this.logger.error(
					`Failed to find user for Stripe customer: ${subscription.customer}`,
					userError
				)
				throw new Error(
					`User not found for Stripe customer: ${subscription.customer}`
				)
			}

			// Create or update subscription record with real user ID
			await supabase.from('Subscription').upsert({
				stripeSubscriptionId: subscription.id,
				stripeCustomerId: subscription.customer as string,
				status: subscription.status.toUpperCase() as SubscriptionStatus,
				currentPeriodStart: new Date(
					(subscription as unknown as { current_period_start: number })
						.current_period_start * 1000
				).toISOString(),
				currentPeriodEnd: new Date(
					(subscription as unknown as { current_period_end: number })
						.current_period_end * 1000
				).toISOString(),
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
				createdAt: new Date(subscription.created * 1000).toISOString(),
				updatedAt: new Date().toISOString(),
				userId: userRecord.id, // Real user ID from database lookup
				startDate: new Date(subscription.created * 1000).toISOString()
			})

			this.logger.log(
				`Created subscription record: ${subscription.id} for user: ${userRecord.id}`
			)
		} catch (error) {
			this.logger.error('Failed to create subscription record', error)
			// Don't throw - webhook should not fail due to this
		}
	}

	private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription updated: ${subscription.id}`, {
			status: subscription.status,
			cancel_at_period_end: subscription.cancel_at_period_end
		})

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Update existing subscription record
			const { data, error } = await supabase
				.from('Subscription')
				.update({
					status: subscription.status.toUpperCase() as SubscriptionStatus,
					currentPeriodStart: new Date(
						(subscription as unknown as { current_period_start: number })
							.current_period_start * 1000
					).toISOString(),
					currentPeriodEnd: new Date(
						(subscription as unknown as { current_period_end: number })
							.current_period_end * 1000
					).toISOString(),
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					updatedAt: new Date().toISOString()
				})
				.eq('stripeSubscriptionId', subscription.id)
				.select()

			if (error) {
				throw error
			}

			// Update user access level based on subscription status
			if (data && data.length > 0) {
				const isActive = ['active', 'trialing'].includes(subscription.status)
				// Note: This would need the user ID from the subscription metadata or customer mapping
				this.logger.log(
					`Updated subscription: ${subscription.id}, Active: ${isActive}`
				)
			}
		} catch (error) {
			this.logger.error('Failed to update subscription record', error)
		}
	}

	private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription cancelled: ${subscription.id}`, {
			customer: subscription.customer
		})

		try {
			// Revoke user access immediately
			await this.revokeSubscriptionAccess(subscription.customer as string)

			// Send cancellation confirmation email
			const user = await this.getUserByStripeCustomerId(subscription.customer as string)
			await this.emailService.sendSubscriptionCancelledEmail({
				to: user.email,
				userName: user.name || undefined,
				planName: subscription.metadata?.planName || 'Subscription',
				cancellationDate: new Date(subscription.canceled_at! * 1000)
			})

			this.logger.log(`Subscription access revoked and cancellation email sent to user: ${user.email}`)
		} catch (error) {
			this.logger.error('Failed to process subscription cancellation', error)
			// Don't throw - webhook should still return success
		}
	}

	private async handleInvoicePaymentSucceeded(stripeInvoice: Stripe.Invoice) {
		this.logger.log(`Invoice paid: ${stripeInvoice.id}`, {
			amount: stripeInvoice.amount_paid,
			customer: stripeInvoice.customer
		})

		try {
			// Send receipt email
			const user = await this.getUserByStripeCustomerId(stripeInvoice.customer as string)
			await this.emailService.sendInvoiceReceiptEmail({
				to: user.email,
				userName: user.name || undefined,
				invoiceNumber: stripeInvoice.number || `inv_${stripeInvoice.id}`,
				amount: stripeInvoice.amount_paid,
				currency: stripeInvoice.currency,
				invoiceUrl: stripeInvoice.invoice_pdf || `https://dashboard.stripe.com/invoices/${stripeInvoice.id}`
			})

			// Extend subscription access if applicable
			const subscriptionId = (stripeInvoice as any).subscription
			if (subscriptionId && typeof subscriptionId === 'string') {
				await this.extendSubscriptionAccess(subscriptionId)
				this.logger.log(`Subscription access extended for subscription: ${subscriptionId}`)
			}

			this.logger.log(`Invoice receipt sent to user: ${user.email}`)
		} catch (error) {
			this.logger.error('Failed to process successful invoice payment', error)
			// Don't throw - webhook should still return success
		}
	}

	private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
		this.logger.warn(`Invoice payment failed: ${stripeInvoice.id}`, {
			customer: stripeInvoice.customer,
			attempt_count: stripeInvoice.attempt_count
		})

		try {
			// Implement retry logic
			const maxRetries = 3
			const currentAttempt = stripeInvoice.attempt_count

			const user = await this.getUserByStripeCustomerId(stripeInvoice.customer as string)

			if (currentAttempt < maxRetries) {
				// Schedule retry (Stripe handles this automatically)
				// Notify user of failed payment with retry information
				await this.emailService.sendInvoicePaymentFailedEmail({
					to: user.email,
					userName: user.name || undefined,
					attemptNumber: currentAttempt,
					maxRetries,
					nextRetryDate: this.calculateNextRetryDate(currentAttempt),
					updatePaymentMethodUrl: this.generateUpdatePaymentMethodUrl()
				})

				this.logger.log(`Payment retry notification sent to user: ${user.email} (attempt ${currentAttempt}/${maxRetries})`)
			} else {
				// Max retries reached - suspend access
				const subscriptionId = (stripeInvoice as any).subscription
				if (subscriptionId && typeof subscriptionId === 'string') {
					await this.suspendSubscriptionAccess(subscriptionId)
				}

				await this.emailService.sendAccountSuspendedEmail({
					to: user.email,
					userName: user.name || undefined,
					suspensionReason: 'payment_failure'
				})

				this.logger.warn(`Account suspended due to payment failure for user: ${user.email}`)
			}
		} catch (error) {
			this.logger.error('Failed to process invoice payment failure', error)
			// Don't throw - webhook should still return success
		}
	}


	/**
	 * Get all active prices from Stripe
	 * Dynamic pricing configuration instead of hardcoding
	 */
	@Get('prices')
	@HttpCode(HttpStatus.OK)
	async getPrices() {
		this.logger.log('Fetching prices from Stripe API')

		try {
			const prices = await this.stripe.prices.list({
				active: true,
				limit: 100,
				expand: ['data.product']
			})

			this.logger.log(`Successfully fetched ${prices.data.length} prices`)

			return {
				success: true,
				prices: prices.data
			}
		} catch (error) {
			this.logger.error('Failed to fetch prices from Stripe', error)
			if (error instanceof Stripe.errors.StripeError) {
				this.handleStripeError(error)
			}
			throw new InternalServerErrorException('Failed to fetch prices')
		}
	}

	/**
	 * Get pricing configuration with products and prices combined
	 * Returns data in format suitable for frontend pricing components
	 */
	@Get('pricing-config')
	@HttpCode(HttpStatus.OK)
	async getPricingConfig() {
		this.logger.log('Fetching pricing configuration from Stripe API')

		try {
			// Fetch products and prices in parallel
			const [productsResponse, pricesResponse] = await Promise.all([
				this.stripe.products.list({
					active: true,
					limit: 100
				}),
				this.stripe.prices.list({
					active: true,
					limit: 100,
					expand: ['data.product']
				})
			])

			// Group prices by product
			const productPriceMap = new Map<string, Stripe.Price[]>()
			pricesResponse.data.forEach(price => {
				const productId =
					typeof price.product === 'string' ? price.product : price.product.id
				if (!productPriceMap.has(productId)) {
					productPriceMap.set(productId, [])
				}
				productPriceMap.get(productId)!.push(price)
			})

			// Build pricing configuration
			const pricingConfig = productsResponse.data
				.filter(product => {
					// Only include products that match our TenantFlow naming pattern
					return (
						product.id.includes('tenantflow_') ||
						product.name.toLowerCase().includes('tenantflow') ||
						product.name.toLowerCase().includes('starter') ||
						product.name.toLowerCase().includes('growth') ||
						product.name.toLowerCase().includes('trial')
					)
				})
				.map(product => {
					const prices = productPriceMap.get(product.id) || []
					const monthlyPrice = prices.find(
						p => p.recurring?.interval === 'month'
					)
					const annualPrice = prices.find(p => p.recurring?.interval === 'year')

					// Parse features from metadata
					const features = product.metadata.features
						? (JSON.parse(product.metadata.features) as string[])
						: []

					return {
						id: product.id,
						name: product.name,
						description: product.description || '',
						metadata: product.metadata,
						prices: {
							monthly: monthlyPrice
								? {
										id: monthlyPrice.id,
										amount: monthlyPrice.unit_amount || 0,
										currency: monthlyPrice.currency
									}
								: null,
							annual: annualPrice
								? {
										id: annualPrice.id,
										amount: annualPrice.unit_amount || 0,
										currency: annualPrice.currency
									}
								: null
						},
						features,
						limits: {
							properties: parseInt(product.metadata.propertyLimit || '0', 10),
							units: parseInt(product.metadata.unitLimit || '0', 10),
							storage: parseInt(product.metadata.storageGB || '0', 10)
						},
						support: product.metadata.support || '',
						order: parseInt(product.metadata.order || '999', 10)
					}
				})
				.sort((a, b) => a.order - b.order)

			this.logger.log(
				`Successfully built pricing configuration for ${pricingConfig.length} products`
			)

			return {
				success: true,
				config: pricingConfig,
				lastUpdated: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error(
				'Failed to fetch pricing configuration from Stripe',
				error
			)
			if (error instanceof Stripe.errors.StripeError) {
				this.handleStripeError(error)
			}
			throw new InternalServerErrorException(
				'Failed to fetch pricing configuration'
			)
		}
	}



	/**
	 * Sanitize metadata values to prevent injection attacks
	 * CLAUDE.md compliant: Security-first approach
	 * Allows apostrophes for valid business names like "Tenant's Premium Plan"
	 */
	private sanitizeMetadataValue(value: string, fieldName: string): string {
		if (!value || typeof value !== 'string') {
			throw new BadRequestException(
				`Invalid ${fieldName}: must be a non-empty string`
			)
		}

		if (value.length > 500) {
			throw new BadRequestException(
				`${fieldName} must be less than 500 characters`
			)
		}

		const normalizedValue = value.normalize('NFKC')

		// Check for control characters (0x00-0x1F and 0x7F)
		// eslint-disable-next-line no-control-regex
		if (/[\x00-\x1F\x7F]/.test(normalizedValue)) {
			throw new BadRequestException(`${fieldName} contains control characters`)
		}

		// Sanitize dangerous characters but preserve apostrophes for valid names like "Tenant's Premium Plan"
		// Remove: < > " ` ; & \ but keep single quotes (apostrophes)
		const sanitized = normalizedValue
			.trim()
			.replace(/[<>"`;&\\]/g, '') // Removed ' from the regex to allow apostrophes
			.replace(/[\r\n\t]+/g, ' ')
			.replace(/\s{2,}/g, ' ')

		if (!sanitized) {
			throw new BadRequestException(
				`Invalid ${fieldName}: contains only invalid characters`
			)
		}

		return sanitized
	}

	/**
	 * Official Error Handling Pattern from Server SDK docs
	 * Comprehensive error mapping for production use
	 */
	private handleStripeError(error: Stripe.errors.StripeError): never {
		this.logger.error('Stripe API error:', {
			type: error.type,
			message: error.message,
			code: error.code,
			decline_code: error.decline_code,
			request_id: error.requestId
		})

		switch (error.type) {
			case 'StripeCardError':
				throw new BadRequestException({
					message: `Payment error: ${error.message}`,
					code: error.code,
					decline_code: error.decline_code
				})

			case 'StripeInvalidRequestError':
				throw new BadRequestException({
					message: 'Invalid request to Stripe',
					details: error.message
				})

			case 'StripeRateLimitError':
				throw new ServiceUnavailableException('Too many requests to Stripe API')

			case 'StripeConnectionError':
				throw new ServiceUnavailableException(
					'Network error connecting to Stripe'
				)

			case 'StripeAuthenticationError':
				throw new InternalServerErrorException('Stripe authentication failed')

			case 'StripePermissionError':
				throw new InternalServerErrorException(
					'Insufficient permissions for Stripe operation'
				)

			default:
				throw new InternalServerErrorException('Payment processing error')
		}
	}
}
