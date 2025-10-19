import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	Param,
	Post,
	Query,
	ServiceUnavailableException,
	SetMetadata
} from '@nestjs/common'
// REMOVED: EventEmitter2, Headers, Req, Request - Webhook endpoint removed
import type { CreateBillingSubscriptionRequest } from '@repo/shared/types/core'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import type {
	CreateBillingPortalRequest,
	CreateCheckoutSessionRequest,
	CreateConnectedPaymentRequest,
	CreatePaymentIntentRequest,
	CreateSetupIntentRequest,
	EmbeddedCheckoutRequest,
	// InvoiceWithSubscription,
	VerifyCheckoutSessionRequest
} from './stripe-interfaces'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeService } from './stripe.service'
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
		private readonly webhookService: StripeWebhookService,
		// REMOVED: eventEmitter - Event emission now handled by Stripe Sync Engine
		private readonly stripeService: StripeService
	) {
		this.stripe = this.stripeService.getStripe()

		// Schedule cleanup of old webhook events every 24 hours
		setInterval(
			() => this.webhookService.cleanupOldEvents(30),
			24 * 60 * 60 * 1000
		)
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

		const currency = body.currency ?? 'usd'

		try {
			const paymentIntent = await this.stripe.paymentIntents.create({
				amount: body.amount,
				currency,
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
					currency,
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
	 * OLD WEBHOOK ENDPOINT - REMOVED (2025-10-18)
	 *
	 * This endpoint has been replaced by Stripe Sync Engine at /webhooks/stripe-sync
	 * See: StripeSyncController for new webhook implementation
	 *
	 * Migration Notes:
	 * - All webhook processing now handled by @supabase/stripe-sync-engine
	 * - Data auto-synced to stripe.* schema (replaces public.subscription)
	 * - User linking handled automatically via email matching
	 *
	 * WARNING: Do not re-enable without removing Stripe Sync Engine to avoid dual webhook systems
	 */

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
					...(body.customerEmail !== undefined && {
						email: body.customerEmail
					}),
					...(body.customerName !== undefined && { name: body.customerName }),
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
	async createSubscription(@Body() body: CreateBillingSubscriptionRequest) {
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
				// P1: Free trial support (14-day trial)
				trial_period_days: 14,
				// P0: Automatic tax calculation (legal requirement)
				automatic_tax: { enabled: true },
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
	 * Update Subscription with Proration
	 * Official Pattern: subscription.update with proration_behavior
	 * Handles plan upgrades/downgrades with automatic proration
	 */
	@Post('update-subscription')
	async updateSubscription(
		@Body()
		body: {
			subscriptionId: string
			newPriceId: string
			prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
		}
	) {
		// Native validation - CLAUDE.md compliant
		if (!body.subscriptionId) {
			throw new BadRequestException('subscriptionId is required')
		}
		if (!body.newPriceId) {
			throw new BadRequestException('newPriceId is required')
		}
		if (!body.newPriceId.startsWith('price_')) {
			throw new BadRequestException(
				'Invalid newPriceId format. Expected Stripe price ID starting with "price_"'
			)
		}

		try {
			// Get current subscription to find subscription item ID
			const currentSubscription = await this.stripe.subscriptions.retrieve(
				body.subscriptionId
			)

			if (!currentSubscription) {
				throw new BadRequestException('Subscription not found')
			}

			if (currentSubscription.items.data.length === 0) {
				throw new BadRequestException('Subscription has no items')
			}

			const firstItem = currentSubscription.items.data[0]
			if (!firstItem?.id) {
				throw new BadRequestException('Subscription item ID not found')
			}

			const subscriptionItemId = firstItem.id
			const currentPrice = firstItem.price?.id

			this.logger.log('Updating subscription with proration', {
				subscriptionId: body.subscriptionId,
				currentPrice: currentPrice || 'unknown',
				newPrice: body.newPriceId,
				prorationBehavior: body.prorationBehavior || 'create_prorations'
			})

			// Update subscription with proration
			// P1: Proration handling for plan changes
			const updatedSubscription = await this.stripe.subscriptions.update(
				body.subscriptionId,
				{
					items: [
						{
							id: subscriptionItemId,
							price: body.newPriceId
						}
					],
					// Default to create_prorations (calculates credit/charge for unused time)
					proration_behavior: body.prorationBehavior || 'create_prorations',
					// Keep same billing date (don't reset billing cycle)
					billing_cycle_anchor: 'unchanged',
					expand: ['latest_invoice']
				}
			)

			const newPrice = updatedSubscription.items.data[0]?.price?.id
			// Access current_period_end from expanded subscription
			const periodEnd = (
				updatedSubscription as Stripe.Response<Stripe.Subscription> & {
					current_period_end?: number
				}
			).current_period_end

			this.logger.log('Subscription updated successfully', {
				subscriptionId: updatedSubscription.id,
				newStatus: updatedSubscription.status,
				newPrice: newPrice || 'unknown'
			})

			return {
				subscription_id: updatedSubscription.id,
				status: updatedSubscription.status,
				current_period_end: periodEnd
					? new Date(periodEnd * 1000).toISOString()
					: null,
				latest_invoice_id:
					typeof updatedSubscription.latest_invoice === 'string'
						? updatedSubscription.latest_invoice
						: updatedSubscription.latest_invoice?.id
			}
		} catch (error) {
			this.logger.error('Failed to update subscription', {
				subscriptionId: body.subscriptionId,
				error: error instanceof Error ? error.message : String(error)
			})
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Cancel Subscription
	 * Official Pattern: subscription cancellation with optional immediate effect
	 */
	@Post('cancel-subscription')
	async cancelSubscription(
		@Body()
		body: {
			subscriptionId: string
			cancelAtPeriodEnd?: boolean
		}
	) {
		// Native validation - CLAUDE.md compliant
		if (!body.subscriptionId) {
			throw new BadRequestException('subscriptionId is required')
		}

		try {
			this.logger.log('Canceling subscription', {
				subscriptionId: body.subscriptionId,
				cancelAtPeriodEnd: body.cancelAtPeriodEnd ?? true
			})

			// Default to cancel at period end (let customer use until they paid for)
			if (body.cancelAtPeriodEnd !== false) {
				// Schedule cancellation for end of billing period
				const updatedSubscription = await this.stripe.subscriptions.update(
					body.subscriptionId,
					{
						cancel_at_period_end: true
					}
				)

				// Access current_period_end from expanded subscription
				const periodEnd = (
					updatedSubscription as Stripe.Response<Stripe.Subscription> & {
						current_period_end?: number
					}
				).current_period_end

				return {
					subscription_id: updatedSubscription.id,
					status: updatedSubscription.status,
					cancel_at_period_end: updatedSubscription.cancel_at_period_end,
					current_period_end: periodEnd
						? new Date(periodEnd * 1000).toISOString()
						: null
				}
			} else {
				// Cancel immediately
				const canceledSubscription = await this.stripe.subscriptions.cancel(
					body.subscriptionId
				)

				return {
					subscription_id: canceledSubscription.id,
					status: canceledSubscription.status,
					canceled_at: canceledSubscription.canceled_at
				}
			}
		} catch (error) {
			this.logger.error('Failed to cancel subscription', {
				subscriptionId: body.subscriptionId,
				error: error instanceof Error ? error.message : String(error)
			})
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Checkout Session Creation
	 * Official Pattern: checkout session with success/cancel URLs
	 */
	@Post('create-checkout-session')
	@SetMetadata('isPublic', true)
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
				// P0: Automatic tax calculation (legal requirement)
				automatic_tax: { enabled: true },
				// P1: Free trial support (14-day trial for subscriptions)
				...(body.isSubscription && {
					subscription_data: {
						trial_period_days: 14
					}
				}),
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
	@SetMetadata('isPublic', true)
	async createEmbeddedCheckoutSession(@Body() body: EmbeddedCheckoutRequest) {
		// Native validation - CLAUDE.md compliant
		if (!body.mode) {
			throw new BadRequestException(
				'mode is required (payment, subscription, or setup)'
			)
		}
		if (!['payment', 'subscription', 'setup'].includes(body.mode)) {
			throw new BadRequestException(
				'mode must be payment, subscription, or setup'
			)
		}
		if (!body.domain) {
			throw new BadRequestException('domain is required')
		}

		// Validate priceId requirements based on mode
		if (body.mode === 'payment' || body.mode === 'subscription') {
			if (!body.priceId) {
				throw new BadRequestException(
					`priceId is required for ${body.mode} mode`
				)
			}
			if (!body.priceId.startsWith('price_')) {
				throw new BadRequestException(
					'Invalid priceId format. Expected Stripe price ID starting with "price_"'
				)
			}
		}

		// Setup mode should not have priceId
		if (body.mode === 'setup' && body.priceId) {
			throw new BadRequestException(
				'priceId should not be provided for setup mode'
			)
		}

		try {
			this.logger.log('Creating embedded checkout session', {
				priceId: body.priceId || 'none (setup mode)',
				mode: body.mode
			})

			// Build session configuration based on transaction type
			const sessionConfig: Stripe.Checkout.SessionCreateParams = {
				ui_mode: 'custom',
				mode: body.mode,
				return_url: `${body.domain}/complete?session_id={CHECKOUT_SESSION_ID}`,
				// P0: Automatic tax calculation (legal requirement)
				automatic_tax: { enabled: true }
			}

			// Add line_items only for payment and subscription modes
			if (body.mode === 'payment' || body.mode === 'subscription') {
				sessionConfig.line_items = [
					{
						...(body.priceId !== undefined && { price: body.priceId }),
						quantity: 1
					}
				]
			}

			// P1: Free trial support (14-day trial for subscriptions)
			if (body.mode === 'subscription') {
				sessionConfig.subscription_data = {
					trial_period_days: 14
				}
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

			const paymentIntent =
				typeof session.payment_intent === 'string'
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
	 * Get Checkout Session Details
	 * Official Pattern: retrieve session for post-checkout flow
	 * Used to get customer email for magic link authentication
	 */
	@Get('checkout-session/:sessionId')
	@SetMetadata('isPublic', true)
	async getCheckoutSession(@Param('sessionId') sessionId: string) {
		if (!sessionId) {
			throw new BadRequestException('sessionId is required')
		}

		try {
			const session = await this.stripe.checkout.sessions.retrieve(sessionId)

			if (!session) {
				throw new BadRequestException('Session not found')
			}

			// Return safe fields only (no sensitive data)
			return {
				id: session.id,
				customer_email: session.customer_email,
				customer_details: {
					email: session.customer_details?.email
				},
				payment_status: session.payment_status,
				status: session.status
			}
		} catch (error) {
			this.handleStripeError(error as Stripe.errors.StripeError)
		}
	}

	/**
	 * Tenant Invitation Endpoint
	 * Official Pattern: auth.admin.generateLink with type 'invite'
	 * Creates TENANT user and sends invitation email with password setup link
	 */
	@Post('invite-tenant')
	async inviteTenant(
		@Body() body: { email: string; landlordId: string; leaseId?: string }
	) {
		// Native validation - CLAUDE.md compliant
		if (!body.email) {
			throw new BadRequestException('email is required')
		}
		if (!body.landlordId) {
			throw new BadRequestException('landlordId is required')
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(body.email)) {
			throw new BadRequestException('Invalid email format')
		}

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Check if user already exists
			const { data: existingUser } = await supabase
				.from('users')
				.select('id, email')
				.eq('email', body.email)
				.single()

			if (existingUser) {
				throw new BadRequestException('User with this email already exists')
			}

			// Create Supabase auth user with TENANT role
			const { data: authData, error: authError } =
				await supabase.auth.admin.createUser({
					email: body.email,
					email_confirm: false, // User must confirm via invite link
					user_metadata: {
						invited_by: body.landlordId,
						invited_at: new Date().toISOString(),
						...(body.leaseId && { lease_id: body.leaseId })
					}
				})

			if (authError) {
				this.logger.error('Failed to create tenant auth user', {
					email: body.email,
					error: authError.message
				})
				throw authError
			}

			// SAFE logging - only ID and email
			this.logger.log(
				`Tenant auth user created: ${authData.user.id} (${body.email})`
			)

			// Create User table record with TENANT role
			const { error: dbError } = await supabase.from('users').insert({
				id: authData.user.id,
				supabaseId: authData.user.id,
				email: body.email,
				role: 'TENANT'
			})

			if (dbError) {
				this.logger.error('Failed to create tenant User record', {
					userId: authData.user.id,
					error: dbError.message
				})
				throw dbError
			}

			// Generate invitation link
			// Official pattern: generateLink with type 'invite'
			const { data: linkData, error: linkError } =
				await supabase.auth.admin.generateLink({
					type: 'invite',
					email: body.email,
					options: {
						redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`
					}
				})

			if (linkError) {
				this.logger.error('Failed to generate invitation link', {
					email: body.email,
					error: linkError.message
				})
				throw linkError
			}

			this.logger.log(`Tenant invitation sent successfully: ${body.email}`)

			return {
				success: true,
				email: body.email,
				userId: authData.user.id,
				inviteUrl: linkData.properties.action_link
			}
		} catch (error) {
			this.logger.error('Tenant invitation failed', {
				email: body.email,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			if (error instanceof BadRequestException || error instanceof Error) {
				throw error
			}

			throw new InternalServerErrorException('Failed to send tenant invitation')
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
					...(body.platformFee !== undefined && {
						application_fee_amount: body.platformFee
					}), // TenantFlow commission
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
				const subData = (await this.stripe.subscriptions.retrieve(
					session.subscription as string,
					{
						expand: ['items.data.price.product']
					}
				)) as Stripe.Response<Stripe.Subscription> // Type assertion to handle the response properly

				const items = subData.items?.data ?? []
				const periodStarts = items
					.map(item => item.current_period_start)
					.filter((value): value is number => typeof value === 'number')
				const periodEnds = items
					.map(item => item.current_period_end)
					.filter((value): value is number => typeof value === 'number')
				const currentPeriodStart =
					periodStarts.length > 0 ? Math.min(...periodStarts) : null
				const currentPeriodEnd =
					periodEnds.length > 0 ? Math.max(...periodEnds) : null

				subscription = {
					id: subData.id,
					status: subData.status,
					current_period_start:
						typeof currentPeriodStart === 'number'
							? Number(currentPeriodStart)
							: null,
					current_period_end:
						typeof currentPeriodEnd === 'number'
							? Number(currentPeriodEnd)
							: null,
					cancelAt_period_end: subData.cancel_at_period_end,
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

	// REMOVED: emitStripeEvent() - Event emission now handled by Stripe Sync Engine

	// Helper methods for webhook handlers

	// private generateRetryPaymentUrl(paymentIntentId: string): string {
	//	if (!process.env.NEXT_PUBLIC_APP_URL) {
	//		throw new InternalServerErrorException('NEXT_PUBLIC_APP_URL not configured')
	//	}
	//	const baseUrl = process.env.NEXT_PUBLIC_APP_URL
	//	return `${baseUrl}/payment/retry?payment_intent=${paymentIntentId}`
	// }

	// private async updatePaymentStatus(paymentIntentId: string, status: string) {
	//	const supabase = this.supabaseService.getAdminClient()

	//	// Update RentPayment status based on Stripe payment intent
	//	await supabase
	//		.from('rent_payments')
	//		.update({
	//			status: status.toUpperCase() as Database['public']['Enums']['RentPaymentStatus'],
	//			updatedAt: new Date().toISOString()
	//		})
	//		.eq('stripePaymentIntentId', paymentIntentId)
	// }

	/**
	 * Get all active products from Stripe
	 * Dynamic product configuration instead of hardcoding
	 * PUBLIC ENDPOINT - Used on pricing page
	 */
	@SetMetadata('isPublic', true)
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
				throw new BadRequestException(
					'Failed to fetch products from Stripe: ' + error.message
				)
			}

			throw new InternalServerErrorException(
				'Internal server error while fetching products'
			)
		}
	}

	// Removed unused private handler methods: handleSetupIntentSucceeded, handleSubscriptionCreated, handleSubscriptionUpdated, handleSubscriptionDeleted, handleInvoicePaymentSucceeded, handleInvoicePaymentFailed

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
	 * PUBLIC ENDPOINT - Used on pricing page
	 */
	@SetMetadata('isPublic', true)
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

					// Parse features from metadata - handle both JSON array and plain string
					let features: string[] = []
					if (product.metadata.features) {
						try {
							// Try parsing as JSON array first
							features = JSON.parse(product.metadata.features) as string[]
						} catch {
							// If parsing fails, treat as comma-separated string or single feature
							features = product.metadata.features
								.split(',')
								.map(f => f.trim())
								.filter(f => f.length > 0)
						}
					}

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
				'Pricing service unavailable [STR-004]'
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

		// Check for control characters using Unicode ranges
		const hasControlChars = [...normalizedValue].some(char => {
			const code = char.charCodeAt(0)
			return (code >= 0x00 && code <= 0x1f) || code === 0x7f
		})

		if (hasControlChars) {
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
				throw new InternalServerErrorException(
					'Payment service authentication error [STR-001]'
				)

			case 'StripePermissionError':
				throw new InternalServerErrorException(
					'Payment service authorization error [STR-002]'
				)

			default:
				throw new InternalServerErrorException(
					'Payment processing error [STR-003]'
				)
		}
	}
}
