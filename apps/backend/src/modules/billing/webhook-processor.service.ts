/**
 * Webhook Processor Service
 *
 * Handles Stripe webhook event processing logic.
 * Used by both StripeWebhookController and WebhookRetryService.
 */

import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import type { LeaseStatus } from '@repo/shared/constants/status-types'
import { LEASE_STATUS } from '@repo/shared/constants/status-types'
import { SupabaseService } from '../../database/supabase.service'
import { EmailService } from '../email/email.service'
import { asStripeSchemaClient, type SupabaseError, type StripeCheckoutSession, type StripeCustomer, type StripeSubscription } from '../../types/stripe-schema'

@Injectable()
export class WebhookProcessor {
	private readonly logger = new Logger(WebhookProcessor.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly emailService: EmailService
	) {}

	async processEvent(event: Stripe.Event): Promise<void> {
		switch (event.type) {
			case 'checkout.session.completed':
				await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
				break

			case 'payment_method.attached':
				await this.handlePaymentAttached(event.data.object as Stripe.PaymentMethod)
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

			case 'account.updated':
				await this.handleAccountUpdated(event.data.object as Stripe.Account)
				break

			case 'payment_intent.succeeded':
				await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
				break

			case 'payment_intent.payment_failed':
				await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
				break

			default:
				this.logger.debug('Unhandled webhook event type', { type: event.type })
		}
	}

	private async handlePaymentAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
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

	private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription updated', {
				subscriptionId: subscription.id,
				status: subscription.status
			})

			const client = this.supabase.getAdminClient()

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

	private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
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
				failure_reason: invoice.last_finalization_error?.message || 'Unknown error'
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

	private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription deleted', {
				subscriptionId: subscription.id
			})

			const client = this.supabase.getAdminClient()

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

	private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
		try {
			this.logger.log('Checkout session completed', {
				sessionId: session.id,
				stripeCustomerId: session.customer,
				stripeSubscriptionId: session.subscription
			})

			const client = this.supabase.getAdminClient()
			const stripeClient = asStripeSchemaClient(client)

			const { data: checkoutSession, error: sessionError } = (await stripeClient
				.schema('stripe')
				.from('checkout_sessions')
				.select('*')
				.eq('id', session.id)
				.maybeSingle()) as {
				data: StripeCheckoutSession | null
				error: SupabaseError | null
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
				throw new Error('Checkout session not synced - retry')
			}

			const stripeCustomerId = typeof session.customer === 'string'
				? session.customer
				: session.customer?.id

			if (!stripeCustomerId) {
				this.logger.error('No customer ID in checkout session', { sessionId: session.id })
				return
			}

			const { data: stripeCustomer, error: customerError} = (await stripeClient
				.schema('stripe')
				.from('customers')
				.select('id, email, name')
				.eq('id', stripeCustomerId)
				.maybeSingle()) as {
				data: Pick<StripeCustomer, 'id' | 'email' | 'name'> | null
				error: SupabaseError | null
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

			const customerName = stripeCustomer.name || customerEmail.split('@')[0] || 'Owner'

			const { data: authUser, error: authError } = await client.auth.admin.createUser({
				email: customerEmail.toLowerCase(),
				email_confirm: true,
				user_metadata: {
					full_name: customerName,
					stripe_customer_id: stripeCustomerId,
					onboarding_source: 'stripe_checkout'
				},
				app_metadata: {
					user_type: 'OWNER'
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

			const stripeSubscriptionId = typeof session.subscription === 'string'
				? session.subscription
				: session.subscription?.id

			if (stripeSubscriptionId) {
				const { data: subscription } = (await stripeClient
					.schema('stripe')
					.from('subscriptions')
					.select('id, status')
					.eq('id', stripeSubscriptionId)
					.maybeSingle()) as {
					data: Pick<StripeSubscription, 'id' | 'status'> | null
					error: SupabaseError | null
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


	/**
	 * Handle Stripe Connect account.updated webhook
	 * Updates property_owners table with onboarding status and capabilities
	 */
	private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
		try {
			this.logger.log('Connect account updated', {
				accountId: account.id,
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				detailsSubmitted: account.details_submitted
			})

			const client = this.supabase.getAdminClient()

			// Determine onboarding status based on Stripe account state
			let onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'rejected' = 'in_progress'
			if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
				onboardingStatus = 'completed'
			} else if (account.requirements?.disabled_reason) {
				onboardingStatus = 'rejected'
			} else if (!account.details_submitted) {
				onboardingStatus = 'in_progress'
			}

			// Combine currently_due and eventually_due requirements
			const requirementsDue = [
				...(account.requirements?.currently_due || []),
				...(account.requirements?.eventually_due || [])
			]

			const { error } = await client
				.from('property_owners')
				.update({
					charges_enabled: account.charges_enabled,
					payouts_enabled: account.payouts_enabled,
					onboarding_status: onboardingStatus,
					requirements_due: requirementsDue,
					onboarding_completed_at: onboardingStatus === 'completed' ? new Date().toISOString() : null,
					updated_at: new Date().toISOString()
				})
				.eq('stripe_account_id', account.id)

			if (error) {
				this.logger.error('Failed to update property owner', {
					error: error.message,
					accountId: account.id
				})
				throw new Error(`Failed to update property owner: ${error.message}`)
			}

			this.logger.log('Property owner updated successfully', {
				accountId: account.id,
				onboardingStatus,
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled
			})
		} catch (error) {
			this.logger.error('Failed to handle account.updated', {
				error: error instanceof Error ? error.message : String(error),
				accountId: account.id
			})
			throw error
		}
	}

	/**
	 * Handle payment_intent.succeeded webhook
	 * Updates rent_payments table with successful payment status
	 */
	private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
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
				this.logger.debug('Payment intent is not a rent payment (no lease_id metadata)', {
					paymentIntentId: paymentIntent.id
				})
				return
			}

			// Update rent_payments record
			const { data: rentPayment, error: selectError } = await client
				.from('rent_payments')
				.select('id')
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
					throw new Error(`Failed to update rent payment: ${updateError.message}`)
				}

				this.logger.log('Rent payment marked as succeeded', {
					rentPaymentId: rentPayment.id,
					paymentIntentId: paymentIntent.id
				})
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

	/**
	 * Handle payment_intent.payment_failed webhook
	 * Updates rent_payments table with failed status and records failure reason
	 */
	private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
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
				this.logger.debug('Payment intent is not a rent payment (no lease_id metadata)', {
					paymentIntentId: paymentIntent.id
				})
				return
			}

			// Find and update rent_payment record
			const { data: rentPayment, error: selectError } = await client
				.from('rent_payments')
				.select('id, tenant_id')
				.eq('stripe_payment_intent_id', paymentIntent.id)
				.maybeSingle()

			if (selectError) {
				this.logger.error('Failed to query rent payment for failure', {
					error: selectError.message,
					paymentIntentId: paymentIntent.id
				})
			}

			if (rentPayment) {
				const { error: updateError } = await client
					.from('rent_payments')
					.update({
						status: 'failed',
						updated_at: new Date().toISOString()
					})
					.eq('id', rentPayment.id)

				if (updateError) {
					this.logger.error('Failed to update rent payment status to failed', {
						error: updateError.message,
						rentPaymentId: rentPayment.id
					})
				}

				// Record payment transaction with failure details
				await client.from('payment_transactions').insert({
					rent_payment_id: rentPayment.id,
					stripe_payment_intent_id: paymentIntent.id,
					status: 'failed',
					amount: paymentIntent.amount,
					failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error',
					attempted_at: new Date().toISOString()
				})

				this.logger.warn('Rent payment failed', {
					rentPaymentId: rentPayment.id,
					tenantId: rentPayment.tenant_id,
					amount: paymentIntent.amount / 100,
					failureReason: paymentIntent.last_payment_error?.message
				})


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
				} else {
					const tenantEmail = (tenantWithUser as { users?: { email?: string } })
						?.users?.email

					if (!tenantEmail) {
						this.logger.warn('No tenant email found for payment failure notification', {
							tenantId: rentPayment.tenant_id
						})
					} else {
						// Use metadata for attempt tracking (PaymentIntent doesn't have attempt_count)
						const attemptCount = paymentIntent.metadata?.attempt_count
							? parseInt(paymentIntent.metadata.attempt_count, 10)
							: 1
						// Use latest_charge instead of deprecated charges.data
						const latestCharge = paymentIntent.latest_charge
						const invoiceUrl = typeof latestCharge === 'object' && latestCharge
							? (latestCharge as { receipt_url?: string }).receipt_url || null
							: null
						const isLastAttempt = attemptCount >= 3

						await this.emailService.sendPaymentFailedEmail({
							customerEmail: tenantEmail,
							amount: paymentIntent.amount,
							currency: paymentIntent.currency || 'usd',
							attemptCount,
							invoiceUrl,
							isLastAttempt
						})
					}
				}
			} else {
				this.logger.warn('No rent_payment record found for failed payment intent', {
					paymentIntentId: paymentIntent.id,
					leaseId
				})
			}
		} catch (error) {
			this.logger.error('Failed to handle payment_intent.payment_failed', {
				error: error instanceof Error ? error.message : String(error),
				paymentIntentId: paymentIntent.id
			})
			throw error
		}
	}
}
