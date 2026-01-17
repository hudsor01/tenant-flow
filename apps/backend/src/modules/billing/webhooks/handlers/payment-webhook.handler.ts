/**
 * Payment Webhook Handler
 *
 * Handles Stripe payment lifecycle events:
 * - payment_method.attached
 * - invoice.payment_failed
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 */

import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { SupabaseService } from '../../../../database/supabase.service'
import { AppLogger } from '../../../../logger/app-logger.service'
import { SseService } from '../../../notifications/sse/sse.service'
import {
	SSE_EVENT_TYPES,
	type PaymentStatusUpdatedEvent
} from '@repo/shared/events/sse-events'
import type { EmailJob } from '../../../email/email.queue'

/** Maximum number of payment retry attempts before marking as final failure */
export const MAX_PAYMENT_RETRY_ATTEMPTS = 3

/** Tenant with user email from Supabase join query */
interface TenantWithEmail {
	id: string
	users: { email: string }
}

/**
 * Runtime type guard for TenantWithEmail
 */
function isTenantWithEmail(data: unknown): data is TenantWithEmail {
	return (
		typeof data === 'object' &&
		data !== null &&
		'id' in data &&
		typeof (data as Record<string, unknown>).id === 'string' &&
		'users' in data &&
		typeof (data as Record<string, unknown>).users === 'object' &&
		(data as Record<string, unknown>).users !== null &&
		'email' in
			((data as Record<string, unknown>).users as Record<string, unknown>) &&
		typeof ((data as Record<string, unknown>).users as Record<string, unknown>)
			.email === 'string'
	)
}

@Injectable()
export class PaymentWebhookHandler {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly sseService: SseService,
		@InjectQueue('emails') private readonly emailQueue: Queue<EmailJob>
	) {}

	async handlePaymentAttached(
		paymentMethod: Stripe.PaymentMethod
	): Promise<void> {
		try {
			this.logger.log('Payment method attached', {
				customerId: paymentMethod.customer
			})

			const client = this.supabase.getAdminClient()

			const customerId =
				typeof paymentMethod.customer === 'string'
					? paymentMethod.customer
					: paymentMethod.customer?.id

			if (!customerId) {
				this.logger.warn('No customer ID on payment method')
				return
			}

			// Fetch tenant and email in a single query to avoid multiple round-trips
			const { data: tenantWithUser, error: tenantLookupError } = await client
				.from('tenants')
				.select('id, user_id, users!inner(email)')
				.eq('stripe_customer_id', customerId)
				.single()

			if (tenantLookupError || !tenantWithUser) {
				this.logger.warn('Tenant not found for payment method', {
					customerId: paymentMethod.customer,
					error: tenantLookupError?.message
				})
				return
			}

			await client
				.from('tenant_invitations')
				.update({
					status: 'accepted',
					accepted_by_user_id: tenantWithUser.user_id,
					accepted_at: new Date().toISOString()
				})
				.eq(
					'email',
					(tenantWithUser as { users: { email: string } }).users.email
				)
				.eq('status', 'pending')

			this.logger.log('Tenant invitation accepted', {
				tenant_id: tenantWithUser.id
			})
		} catch (error) {
			this.logger.error('Failed to handle payment method attached', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
		try {
			this.logger.log('Payment failed', {
				invoiceId: invoice.id,
				customerId: invoice.customer
			})

			const client = this.supabase.getAdminClient()

			const customerId =
				typeof invoice.customer === 'string'
					? invoice.customer
					: invoice.customer?.id

			if (!customerId) {
				this.logger.warn('No customer ID on invoice')
				return
			}

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

			this.logger.warn('Payment failure for tenant', {
				tenant_id: tenant.id,
				invoice_id: invoice.id,
				amount: invoice.amount_due / 100,
				failure_reason:
					invoice.last_finalization_error?.message || 'Unknown error'
			})

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

	async handlePaymentIntentSucceeded(
		paymentIntent: Stripe.PaymentIntent
	): Promise<void> {
		try {
			this.logger.log('Payment intent succeeded', {
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				metadata: paymentIntent.metadata
			})

			const client = this.supabase.getAdminClient()

			// Check if this is a rent payment (has lease_id in metadata)
			const leaseId = paymentIntent.metadata?.lease_id
			if (!leaseId) {
				this.logger.debug(
					'Payment intent is not a rent payment (no lease_id metadata)',
					{
						paymentIntentId: paymentIntent.id
					}
				)
				return
			}

			// Update rent_payments record - include tenant info for SSE
			const { data: rentPayment, error: selectError } = await client
				.from('rent_payments')
				.select('id, tenant_id, tenants!inner(user_id)')
				.eq('stripe_payment_intent_id', paymentIntent.id)
				.maybeSingle()

			if (selectError) {
				this.logger.error('Failed to query rent payment', {
					error: selectError.message,
					paymentIntentId: paymentIntent.id
				})
			}

			if (rentPayment) {
				const { error: updateError } = await client
					.from('rent_payments')
					.update({
						status: 'succeeded',
						paid_date: new Date().toISOString(),
						updated_at: new Date().toISOString()
					})
					.eq('id', rentPayment.id)

				if (updateError) {
					this.logger.error('Failed to update rent payment status', {
						error: updateError.message,
						rentPaymentId: rentPayment.id
					})
					throw new Error(
						`Failed to update rent payment: ${updateError.message}`
					)
				}

				this.logger.log('Rent payment marked as succeeded', {
					rentPaymentId: rentPayment.id,
					paymentIntentId: paymentIntent.id
				})

				// Broadcast SSE event to tenant
				const tenantUserId = (rentPayment as { tenants: { user_id: string } })
					.tenants?.user_id
				if (tenantUserId) {
					await this.broadcastPaymentStatus({
						tenantId: rentPayment.tenant_id,
						userId: tenantUserId,
						status: 'succeeded',
						amount: paymentIntent.amount / 100
					})
				}
			} else {
				// Payment intent may have been created but not yet recorded
				this.logger.warn('No rent_payment record found for payment intent', {
					paymentIntentId: paymentIntent.id,
					leaseId
				})
			}
		} catch (error) {
			this.logger.error('Failed to handle payment_intent.succeeded', {
				error: error instanceof Error ? error.message : String(error),
				paymentIntentId: paymentIntent.id
			})
			throw error
		}
	}

	async handlePaymentIntentFailed(
		paymentIntent: Stripe.PaymentIntent
	): Promise<void> {
		try {
			this.logger.log('Payment intent failed', {
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				lastPaymentError: paymentIntent.last_payment_error?.message
			})

			const client = this.supabase.getAdminClient()

			// Check if this is a rent payment
			const leaseId = paymentIntent.metadata?.lease_id
			if (!leaseId) {
				this.logger.debug(
					'Payment intent is not a rent payment (no lease_id metadata)',
					{
						paymentIntentId: paymentIntent.id
					}
				)
				return
			}

			// Find and update rent_payment record - include tenant info for SSE
			const { data: rentPayment, error: selectError } = await client
				.from('rent_payments')
				.select('id, tenant_id, tenants!inner(user_id)')
				.eq('stripe_payment_intent_id', paymentIntent.id)
				.maybeSingle()

			if (selectError) {
				this.logger.error('Failed to query rent payment for failure', {
					error: selectError.message,
					paymentIntentId: paymentIntent.id
				})
			}

			if (rentPayment) {
				// Use atomic RPC to update rent_payment and insert transaction record
				const { error: rpcError } = await client.rpc(
					'process_payment_intent_failed',
					{
						p_rent_payment_id: rentPayment.id,
						p_payment_intent_id: paymentIntent.id,
						p_amount: paymentIntent.amount,
						p_failure_reason:
							paymentIntent.last_payment_error?.message || 'Unknown error'
					}
				)

				if (rpcError) {
					this.logger.error('Failed to process payment intent failure via RPC', {
						error: rpcError.message,
						rentPaymentId: rentPayment.id,
						paymentIntentId: paymentIntent.id
					})
					throw new Error(`Transaction failed: ${rpcError.message}`)
				}

				this.logger.warn('Rent payment failed (processed atomically)', {
					rentPaymentId: rentPayment.id,
					tenantId: rentPayment.tenant_id,
					amount: paymentIntent.amount / 100,
					failureReason: paymentIntent.last_payment_error?.message
				})

				// Broadcast SSE event to tenant
				const tenantUserId = (rentPayment as { tenants: { user_id: string } })
					.tenants?.user_id
				if (tenantUserId) {
					await this.broadcastPaymentStatus({
						tenantId: rentPayment.tenant_id,
						userId: tenantUserId,
						status: 'failed',
						amount: paymentIntent.amount / 100
					})
				}

				await this.sendPaymentFailureEmail(paymentIntent, rentPayment, client)
			} else {
				this.logger.warn(
					'No rent_payment record found for failed payment intent',
					{
						paymentIntentId: paymentIntent.id,
						leaseId
					}
				)
			}
		} catch (error) {
			this.logger.error('Failed to handle payment_intent.payment_failed', {
				error: error instanceof Error ? error.message : String(error),
				paymentIntentId: paymentIntent.id
			})
			throw error
		}
	}

	private async sendPaymentFailureEmail(
		paymentIntent: Stripe.PaymentIntent,
		rentPayment: { id: string; tenant_id: string },
		client: ReturnType<SupabaseService['getAdminClient']>
	): Promise<void> {
		const { data: tenantWithUser, error: tenantQueryError } = await client
			.from('tenants')
			.select('id, users!inner(email)')
			.eq('id', rentPayment.tenant_id)
			.single()

		if (tenantQueryError) {
			this.logger.error('Failed to fetch tenant email for payment failure', {
				error: tenantQueryError.message,
				tenantId: rentPayment.tenant_id
			})
			return
		}

		if (!tenantWithUser) return

		// Validate data structure with runtime type guard
		if (!isTenantWithEmail(tenantWithUser)) {
			this.logger.error('Invalid tenant data structure from database', {
				tenantId: rentPayment.tenant_id,
				receivedData: JSON.stringify(tenantWithUser)
			})
			return
		}

		const tenantEmail = tenantWithUser.users.email
		// Use metadata for attempt tracking (PaymentIntent doesn't have attempt_count)
		const attemptCount = paymentIntent.metadata?.attempt_count
			? parseInt(paymentIntent.metadata.attempt_count, 10)
			: 1
		const latestCharge = paymentIntent.latest_charge
		const invoiceUrl =
			latestCharge &&
			typeof latestCharge === 'object' &&
			'receipt_url' in latestCharge
				? (latestCharge.receipt_url ?? null)
				: null
		const isLastAttempt = attemptCount >= MAX_PAYMENT_RETRY_ATTEMPTS

		await this.emailQueue.add('payment-failed', {
			type: 'payment-failed',
			data: {
				customerEmail: tenantEmail,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency || 'usd',
				attemptCount,
				invoiceUrl,
				isLastAttempt
			}
		})
	}

	/**
	 * Broadcast payment status update via SSE
	 */
	private async broadcastPaymentStatus(params: {
		tenantId: string
		userId: string
		status: 'succeeded' | 'failed' | 'pending'
		amount?: number
	}): Promise<void> {
		const { tenantId, userId, status, amount } = params

		const event: PaymentStatusUpdatedEvent = {
			type: SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED,
			timestamp: new Date().toISOString(),
			payload: {
				tenantId,
				status,
				...(amount !== undefined && { amount })
			}
		}

		try {
			await this.sseService.broadcast(userId, event)
			this.logger.debug('Payment SSE broadcast sent', {
				userId,
				tenantId,
				status
			})
		} catch (error) {
			// Non-critical: log but don't throw
			this.logger.error('Failed to broadcast payment SSE event', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})
		}
	}
}
