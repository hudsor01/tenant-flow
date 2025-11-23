/**
 * Stripe Webhook Controller
 *
 * Handles Stripe webhook events for:
 * - Payment method attached/updated
 * - Subscription status changes
 * - Payment failures/retries
 * - Customer deletions
 *
 * Direct processing without EventEmitter for better performance
 */

import type Stripe from 'stripe'
import type { LeaseStatus } from '@repo/shared/constants/status-types'
import { LEASE_STATUS } from '@repo/shared/constants/status-types'
import {
	BadRequestException,
	Controller,
	Headers,
	Logger,
	Optional,
	Post,
	RawBodyRequest,
	Req
} from '@nestjs/common'
import { Request } from 'express'
import { Public } from '../../shared/decorators/public.decorator'
import { Throttle } from '@nestjs/throttler'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import { AppConfigService } from '../../config/app-config.service'
import { createThrottleDefaults } from '../../config/throttle.config'

// Stripe Sync Engine table types (stripe schema)
interface StripeCheckoutSession {
	id: string
	stripe_id: string
	customer: string | null
	subscription: string | null
	payment_status: string | null
	status: string | null
	created_at: string
	updated_at: string
}

interface StripeCustomer {
	id: string
	stripe_id: string
	email: string
	name: string | null
	created_at: string
	updated_at: string
}

interface StripeSubscription {
	id: string
	stripe_id: string
	customer: string
	status: string
	created_at: string
	updated_at: string
}

const STRIPE_WEBHOOK_THROTTLE = createThrottleDefaults({
	envTtlKey: 'WEBHOOK_THROTTLE_TTL',
	envLimitKey: 'WEBHOOK_THROTTLE_LIMIT',
	defaultTtl: 60000,
	defaultLimit: 30
})

@Controller('webhooks/stripe')
export class StripeWebhookController {
	private readonly logger = new Logger(StripeWebhookController.name)

	constructor(
		private readonly stripeConnect: StripeConnectService,
		private readonly supabase: SupabaseService,
		private readonly config: AppConfigService,
		@Optional() private readonly prometheus: PrometheusService | null
	) {}

	/**
	 * Handle Stripe webhook events
	 *
	 * IMPORTANT: Requires raw body for signature verification
	 * Configure in main.ts with rawBody: true
	 */
	@Public()
	@Throttle({
		default: STRIPE_WEBHOOK_THROTTLE
	})
	@Post()
	async handleWebhook(
		@Req() req: RawBodyRequest<Request>,
		@Headers('stripe-signature') signature: string
	) {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}

		const stripe = this.stripeConnect.getStripe()
		const webhookSecret = this.config.getStripeWebhookSecret()

		if (!webhookSecret) {
			throw new BadRequestException('Webhook secret not configured')
		}

		let event: Stripe.Event

		const rawBody: string | Buffer | undefined =
			req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : undefined)

		if (!rawBody) {
			this.logger.error('Stripe webhook invoked without raw body payload')
			throw new BadRequestException('Webhook body missing')
		}

		try {
			// Verify webhook signature
			event = stripe.webhooks.constructEvent(
				rawBody,
				signature,
				webhookSecret
			)
		} catch (error) {
			this.logger.error('Webhook signature verification failed', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Invalid webhook signature')
		}

		const client = this.supabase.getAdminClient()
		const startTime = Date.now()

		this.logger.log('Stripe webhook received', {
			type: event.type,
			id: event.id
		})

		try {
			// Use atomic lock via RPC to prevent duplicate processing
			const lockAcquired = await this.supabase.getAdminClient().rpc(
				'record_processed_stripe_event_lock',
				{
					p_stripe_event_id: event.id,
					p_event_type: event.type,
					p_processed_at: new Date().toISOString(),
					p_status: 'processing'
				}
			)

			const data = lockAcquired.data as Array<{ lock_acquired: boolean }> | null
			const rows = Array.isArray(data) ? data : (data ? [data] : [])
			const acquired = rows.some(row => row && 'lock_acquired' in row && row.lock_acquired === true)

			if (!acquired) {
				// Record idempotency hit
				this.prometheus?.recordIdempotencyHit(event.type)
				this.logger.log('Duplicate webhook event detected', {
					type: event.type,
					id: event.id
				})
				return { received: true, duplicate: true }
			}

			// Process the webhook event directly
			await this.processWebhookEvent(event)

			// Record success
			const duration = Date.now() - startTime
			this.prometheus?.recordWebhookProcessing(event.type, duration, 'success')

			// Mark event as processed
			await client
				.from('stripe_processed_events')
				.update({
					processed_at: new Date().toISOString(),
					status: 'processed'
				})
				.eq('stripe_event_id', event.id)

			// Store metrics in webhook_metrics table
			const currentDate = new Date().toISOString().split('T')[0] as string
			await client.from('webhook_metrics').upsert(
				{
					date: currentDate,
					event_type: event.type,
					total_received: 1,
					total_processed: 1,
					total_failed: 0,
					average_latency_ms: duration,
					created_at: new Date().toISOString()
				},
				{
					onConflict: 'date,event_type'
				}
			)

			return { received: true }
		} catch (error) {
			// Record failure
			const duration = Date.now() - startTime
			this.prometheus?.recordWebhookProcessing(event.type, duration, 'error')
			this.prometheus?.recordWebhookFailure(
				event.type,
				error instanceof Error ? error.constructor.name : 'UnknownError'
			)

			// Store failure details
			await client.from('webhook_attempts').insert({
				webhook_event_id: event.id,
				status: 'failed',
				failure_reason: 'processing_error'
			})

			// Store metrics
			const currentDate = new Date().toISOString().split('T')[0] as string
			await client.from('webhook_metrics').upsert(
				{
					date: currentDate,
					event_type: event.type,
					total_received: 1,
					total_processed: 0,
					total_failed: 1,
					average_latency_ms: duration,
					created_at: new Date().toISOString()
				},
				{
					onConflict: 'date,event_type'
				}
			)

			this.logger.error('Webhook processing failed', {
				type: event.type,
				id: event.id,
				error: error instanceof Error ? error.message : String(error)
			})

			// Return 500 to trigger Stripe automatic retry
			throw new BadRequestException('Webhook processing failed')
		}
	}

	/**
	 * Process webhook events using a switch statement
	 * This is simpler and faster than EventEmitter
	 *
	 * Public to allow retry service to call directly
	 */
	async processWebhookEvent(event: Stripe.Event): Promise<void> {
		switch (event.type) {
			case 'checkout.session.completed':
				await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
				break

			case 'payment_method.attached':
				await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
				break

			case 'customer.subscription.updated':
				await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
				break

			case 'invoice.payment_failed':
				await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
				break

			case 'customer.subscription.deleted':
				await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
				break

			default:
				this.logger.debug('Unhandled webhook event type', { type: event.type })
		}
	}

	/**
	 * Handle payment method attached to subscription
	 * Update tenant invitation status to ACCEPTED
	 */
	private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
		try {
			this.logger.log('Payment method attached', {
				customerId: paymentMethod.customer
			})

			const client = this.supabase.getAdminClient()

			// Get customer ID from payment method
			const customerId =
				typeof paymentMethod.customer === 'string'
					? paymentMethod.customer
					: paymentMethod.customer?.id

			if (!customerId) {
				this.logger.warn('No customer ID on payment method')
				return
			}

			// Find tenant by Stripe Customer ID
			const { data: tenant } = await client
				.from('tenants')
				.select('id')
				.eq('stripe_customer_id', customerId)
				.single()

			if (!tenant) {
				this.logger.warn('Tenant not found for payment method', {
					customerId: paymentMethod.customer
				})
				return
			}

			// Update invitation status in tenant_invitations table
			const { data: tenantWithUser } = await client
				.from('tenants')
				.select('id, user_id, users!inner(email)')
				.eq('id', tenant.id)
				.single()

			if (tenantWithUser) {
				await client
					.from('tenant_invitations')
					.update({
						status: 'accepted',
						accepted_by_user_id: tenantWithUser.user_id,
						accepted_at: new Date().toISOString()
					})
					.eq('email', (tenantWithUser as { users: { email: string } }).users.email)
					.eq('status', 'pending')
			}

			this.logger.log('Tenant invitation accepted', {
				tenant_id: tenant.id
			})
		} catch (error) {
			this.logger.error('Failed to handle payment method attached', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Handle subscription updated
	 * Update lease status based on subscription status
	 */
	private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription updated', {
				subscriptionId: subscription.id,
				status: subscription.status
			})

			const client = this.supabase.getAdminClient()

			// Find lease by Stripe Subscription ID
			const { data: lease } = await client
				.from('leases')
				.select('id')
				.eq('stripe_subscription_id', subscription.id)
				.single()

			if (!lease) {
				this.logger.warn('Lease not found for subscription', {
					subscriptionId: subscription.id
				})
				return
			}

			// Map Stripe subscription status to lease status
			let lease_status: LeaseStatus = LEASE_STATUS.DRAFT

			if (subscription.status === 'active') {
				lease_status = LEASE_STATUS.ACTIVE
			} else if (subscription.status === 'canceled') {
				lease_status = LEASE_STATUS.TERMINATED
			}

			await client
				.from('leases')
				.update({
					lease_status: lease_status,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			this.logger.log('Lease status updated', {
				lease_id: lease.id,
				status: lease_status
			})
		} catch (error) {
			this.logger.error('Failed to handle subscription updated', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Handle payment failure
	 * Send notification to tenant and property owner
	 */
	private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
		try {
			this.logger.log('Payment failed', {
				invoiceId: invoice.id,
				customerId: invoice.customer
			})

			const client = this.supabase.getAdminClient()

			// Get customer ID
			const customerId =
				typeof invoice.customer === 'string'
					? invoice.customer
					: invoice.customer?.id

			if (!customerId) {
				this.logger.warn('No customer ID on invoice')
				return
			}

			// Find tenant by Stripe Customer ID
			const { data: tenant } = await client
				.from('tenants')
				.select('id, user_id')
				.eq('stripe_customer_id', customerId)
				.single()

			if (!tenant) {
				this.logger.warn('Tenant not found for payment failure', {
					customerId
				})
				return
			}

			// Log payment failure for monitoring and alerting
			this.logger.warn('Payment failure for tenant', {
				tenant_id: tenant.id,
				invoice_id: invoice.id,
				amount: invoice.amount_due / 100, // Convert from cents
				failure_reason: invoice.last_finalization_error?.message || 'Unknown error'
			})

			// Could trigger notification service here if needed
			// For now, just log for monitoring systems to pick up

			this.logger.log('Payment failure processed', {
				tenant_id: tenant.id,
				invoice_id: invoice.id
			})
		} catch (error) {
			this.logger.error('Failed to handle payment failure', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Handle subscription deleted
	 * Update lease status to TERMINATED
	 */
	private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription deleted', {
				subscriptionId: subscription.id
			})

			const client = this.supabase.getAdminClient()

			// Find lease by Stripe Subscription ID
			const { data: lease } = await client
				.from('leases')
				.select('id')
				.eq('stripe_subscription_id', subscription.id)
				.single()

			if (!lease) {
				this.logger.warn('Lease not found for deleted subscription', {
					subscriptionId: subscription.id
				})
				return
			}

			// Update lease status to TERMINATED
			await client
				.from('leases')
				.update({
					lease_status: LEASE_STATUS.TERMINATED,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			this.logger.log('Lease terminated due to subscription deletion', {
				lease_id: lease.id
			})
		} catch (error) {
			this.logger.error('Failed to handle subscription deletion', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Handle checkout session completed
	 * Payment-first signup: Create Supabase user using Stripe Sync Engine data
	 *
	 * Flow:
	 * 1. Wait for Stripe Sync Engine to sync checkout session to stripe.checkout_sessions
	 * 2. Query stripe.customers and stripe.subscriptions for synced data
	 * 3. Create Supabase Auth user
	 * 4. Create public.users row linking to stripe.customers.id (NOT stripe_id)
	 */
	private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
		try {
			this.logger.log('Checkout session completed', {
				sessionId: session.id,
				stripeCustomerId: session.customer,
				stripeSubscriptionId: session.subscription
			})

			const client = this.supabase.getAdminClient()

			// Query synced checkout session from stripe.checkout_sessions
			// Type assertion needed: stripe schema tables aren't in generated types
			const { data: checkoutSession, error: sessionError } = (await (
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				client.schema('stripe') as any
			)
				.from('checkout_sessions')
				.select('*')
				.eq('stripe_id', session.id)
				.maybeSingle()) as {
				data: StripeCheckoutSession | null
				error: { message: string } | null
			}

			if (sessionError) {
				this.logger.error('Failed to query checkout session', {
					error: sessionError.message,
					sessionId: session.id
				})
			}

			if (!checkoutSession) {
				this.logger.warn('Checkout session not synced yet - will retry', {
					sessionId: session.id
				})
				// Sync might be delayed - webhook will be retried by Stripe
				throw new Error('Checkout session not synced - retry')
			}

			// Extract customer ID from checkout session
			const stripeCustomerId = typeof session.customer === 'string'
				? session.customer
				: session.customer?.id

			if (!stripeCustomerId) {
				this.logger.error('No customer ID in checkout session', { sessionId: session.id })
				return
			}

			// Query synced customer from stripe.customers
			// Type assertion needed: stripe schema tables aren't in generated types
			const { data: stripeCustomer, error: customerError} = (await (
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				client.schema('stripe') as any
			)
				.from('customers')
				.select('id, stripe_id, email, name')
				.eq('stripe_id', stripeCustomerId)
				.maybeSingle()) as {
				data: Pick<StripeCustomer, 'id' | 'stripe_id' | 'email' | 'name'> | null
				error: { message: string } | null
			}

			if (customerError || !stripeCustomer) {
				this.logger.error('Failed to query stripe customer', {
					error: customerError?.message,
					stripeCustomerId
				})
				throw new Error('Stripe customer not synced - retry')
			}

			const customerEmail = stripeCustomer.email
			if (!customerEmail) {
				this.logger.error('No email for stripe customer', {
					stripeCustomerId,
					stripeCustomerDbId: stripeCustomer.id
				})
				return
			}

			// Check if user already exists (idempotency)
			const { data: existingUser } = await client
				.from('users')
				.select('id, email, stripe_customer_id')
				.eq('email', customerEmail.toLowerCase())
				.maybeSingle()

			if (existingUser) {
				this.logger.log('User already exists for checkout session', {
					userId: existingUser.id,
					email: customerEmail,
					sessionId: session.id
				})

				// Update stripe_customer_id if not set (link to stripe.customers.id NOT stripe_id)
				if (!existingUser.stripe_customer_id) {
					await client
						.from('users')
						.update({
							stripe_customer_id: stripeCustomerId,
							updated_at: new Date().toISOString()
						})
						.eq('id', existingUser.id)

					this.logger.log('Updated user with stripe_customer_id', {
						userId: existingUser.id,
						stripeCustomerId
					})
				}

				return
			}

			// Extract customer name
			const customerName = stripeCustomer.name || customerEmail.split('@')[0] || 'Owner'

			// Create Supabase Auth user
			const { data: authUser, error: authError } = await client.auth.admin.createUser({
				email: customerEmail.toLowerCase(),
				email_confirm: true,
				user_metadata: {
					full_name: customerName,
					stripe_customer_id: stripeCustomerId,
					onboarding_source: 'stripe_checkout'
				}
			})

			if (authError || !authUser.user) {
				this.logger.error('Failed to create Supabase auth user', {
					error: authError?.message,
					email: customerEmail,
					sessionId: session.id
				})
				throw new Error(`Failed to create auth user: ${authError?.message}`)
			}

			this.logger.log('Created Supabase auth user', {
				userId: authUser.user.id,
				email: customerEmail
			})

			// Create public.users row (links to stripe.customers.stripe_id)
			const { error: usersError } = await client.from('users').insert({
				id: authUser.user.id,
				email: customerEmail.toLowerCase(),
				full_name: customerName,
				user_type: 'OWNER',
				stripe_customer_id: stripeCustomerId,
				status: 'active',
				created_at: new Date().toISOString()
			})

			if (usersError) {
				this.logger.error('Failed to create users table row', {
					error: usersError.message,
					userId: authUser.user.id,
					sessionId: session.id
				})
				throw new Error(`Failed to create users row: ${usersError.message}`)
			}

			this.logger.log('User creation completed', {
				userId: authUser.user.id,
				email: customerEmail,
				stripeCustomerDbId: stripeCustomer.id,
				stripeCustomerId,
				sessionId: session.id
			})

			// Subscription data is already in stripe.subscriptions - no need to create
			// Just verify it's there
			const stripeSubscriptionId = typeof session.subscription === 'string'
				? session.subscription
				: session.subscription?.id

			if (stripeSubscriptionId) {
				// Type assertion needed: stripe schema tables aren't in generated types
				const { data: subscription } = (await (
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					client.schema('stripe') as any
				)
					.from('subscriptions')
					.select('id, stripe_id, status')
					.eq('stripe_id', stripeSubscriptionId)
					.maybeSingle()) as {
					data: Pick<StripeSubscription, 'id' | 'stripe_id' | 'status'> | null
					error: { message: string } | null
				}

				if (subscription) {
					this.logger.log('Subscription already synced', {
						subscriptionDbId: subscription.id,
						stripeSubscriptionId,
						status: subscription.status
					})
				} else {
					this.logger.warn('Subscription not synced yet', { stripeSubscriptionId })
				}
			}
		} catch (error) {
			this.logger.error('Failed to handle checkout session completed', {
				error: error instanceof Error ? error.message : String(error),
				sessionId: session.id
			})
			throw error
		}
	}
}
