/**
 * Checkout Webhook Handler
 *
 * Handles Stripe checkout events:
 * - checkout.session.completed
 */

import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { SupabaseService } from '../../../../database/supabase.service'
import { AppLogger } from '../../../../logger/app-logger.service'
import {
	asStripeSchemaClient,
	type SupabaseError,
	type StripeCheckoutSession,
	type StripeCustomer,
	type StripeSubscription
} from '../../../../types/stripe-schema'

@Injectable()
export class CheckoutWebhookHandler {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	async handleCheckoutCompleted(
		session: Stripe.Checkout.Session
	): Promise<void> {
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
				.select('id, customer, subscription, payment_intent, payment_status, status, metadata, customer_email, client_reference_id, mode, created, updated_at, last_synced_at')
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

			const stripeCustomerId =
				typeof session.customer === 'string'
					? session.customer
					: session.customer?.id

			if (!stripeCustomerId) {
				this.logger.error('No customer ID in checkout session', {
					sessionId: session.id
				})
				return
			}

			const { data: stripeCustomer, error: customerError } = (await stripeClient
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

			const customerName =
				stripeCustomer.name || customerEmail.split('@')[0] || 'Owner'

			const { data: authUser, error: authError } =
				await client.auth.admin.createUser({
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

			// Idempotent upsert - handles webhook retries safely
			const { error: usersError } = await client.from('users').upsert(
				{
					id: authUser.user.id,
					email: customerEmail.toLowerCase(),
					full_name: customerName,
					user_type: 'OWNER',
					stripe_customer_id: stripeCustomerId,
					status: 'active',
					created_at: new Date().toISOString()
				},
				{ onConflict: 'email', ignoreDuplicates: true }
			)

			if (usersError) {
				this.logger.error('Failed to upsert users table row', {
					error: usersError.message,
					userId: authUser.user.id,
					sessionId: session.id
				})
				throw new Error(`Failed to upsert users row: ${usersError.message}`)
			}

			this.logger.log('User creation completed', {
				userId: authUser.user.id,
				email: customerEmail,
				stripeCustomerDbId: stripeCustomer.id,
				stripeCustomerId,
				sessionId: session.id
			})

			const stripeSubscriptionId =
				typeof session.subscription === 'string'
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
					this.logger.warn('Subscription not synced yet', {
						stripeSubscriptionId
					})
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
