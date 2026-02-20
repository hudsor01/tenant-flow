import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import {
	asStripeSchemaClient,
	type SupabaseError
} from '../../types/stripe-schema'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Billing Service - Handles all database operations for Stripe billing entities
 *
 * Manages customer linking, subscription tracking, and payment records
 * following official Stripe documentation patterns.
 */
@Injectable()
export class BillingService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Query Stripe customer from synced stripe schema (read-only)
	 * The Stripe Sync Engine automatically syncs all customers to stripe.customers table
	 */
	async getStripeCustomer(
		stripeCustomerId: string
	): Promise<Stripe.Customer | null> {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const result: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('customers')
				.select('id, object, address, description, email, metadata, name, phone, shipping, balance, created, currency, default_source, delinquent, discount, invoice_prefix, invoice_settings, livemode, next_invoice_sequence, preferred_locales, tax_exempt, updated_at, deleted, last_synced_at')
				.eq('id', stripeCustomerId)
				.single()

		if (result.error && result.error.code !== 'PGRST116') {
			this.logger.error('Failed to get customer:', { error: result.error })
			throw result.error
		}

		return result.data as Stripe.Customer | null
	}

	/**
	 * Find Stripe customer by owner ID
	 * Links owner_id to their Stripe customer via users table
	 */
	async findCustomerByOwnerId(
		ownerId: string
	): Promise<Stripe.Customer | null> {
		const { data: user, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('stripe_customer_id')
			.eq('id', ownerId)
			.single()

		if (error || !user?.stripe_customer_id) {
			this.logger.warn('No stripe customer found for owner:', ownerId)
			return null
		}

		return this.getStripeCustomer(user.stripe_customer_id as string)
	}

	/**
	 * Find Stripe customer by tenant ID
	 * Links tenant_id to their Stripe customer via tenants table
	 */
	async findCustomerByTenantId(
		tenantId: string
	): Promise<Stripe.Customer | null> {
		const { data: tenant, error } = await this.supabase
			.getAdminClient()
			.from('tenants')
			.select('stripe_customer_id')
			.eq('id', tenantId)
			.single()

		if (error || !tenant?.stripe_customer_id) {
			this.logger.warn('No stripe customer found for tenant:', tenantId)
			return null
		}

		return this.getStripeCustomer(tenant.stripe_customer_id as string)
	}

	/**
	 * Link owner to their Stripe customer
	 * Stores mapping in users table
	 */
	async linkCustomerToOwner(
		stripeCustomerId: string,
		ownerId: string
	): Promise<void> {
		const { error } = await this.supabase
			.getAdminClient()
			.from('users')
			.update({
				stripe_customer_id: stripeCustomerId,
				updated_at: new Date().toISOString()
			})
			.eq('id', ownerId)

		if (error) {
			this.logger.error('Failed to link customer to owner:', { error })
			throw error
		}
	}

	/**
	 * Link tenant to their Stripe customer
	 * Stores mapping in tenants table
	 */
	async linkCustomerToTenant(
		stripeCustomerId: string,
		tenantId: string
	): Promise<void> {
		const { error } = await this.supabase
			.getAdminClient()
			.from('tenants')
			.update({
				stripe_customer_id: stripeCustomerId,
				updated_at: new Date().toISOString()
			})
			.eq('id', tenantId)

		if (error) {
			this.logger.error('Failed to link customer to tenant:', { error })
			throw error
		}
	}

	/**
	 * Find subscription by Stripe subscription ID (read-only from stripe schema)
	 * The Stripe Sync Engine automatically syncs all subscriptions
	 */
	async findSubscriptionByStripeId(
		stripeSubscriptionId: string
	): Promise<Stripe.Subscription | null> {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const result: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('subscriptions')
				.select('id, object, cancel_at_period_end, current_period_end, current_period_start, default_payment_method, items, metadata, pending_setup_intent, pending_update, status, application_fee_percent, billing_cycle_anchor, billing_thresholds, cancel_at, canceled_at, collection_method, created, days_until_due, default_source, default_tax_rates, discount, ended_at, livemode, next_pending_invoice_item_invoice, pause_collection, pending_invoice_item_interval, start_date, transfer_data, trial_end, trial_start, schedule, customer, latest_invoice, plan, updated_at, last_synced_at')
				.eq('id', stripeSubscriptionId)
				.single()

		if (result.error && result.error.code !== 'PGRST116') {
			this.logger.error('Failed to find subscription:', { error: result.error })
			throw result.error
		}

		return result.data as Stripe.Subscription | null
	}

	/**
	 * Find all subscriptions for a customer (read-only)
	 * Returns all subscriptions synced by Stripe Sync Engine
	 */
	async findSubscriptionsByCustomerId(
		stripeCustomerId: string
	): Promise<Stripe.Subscription[]> {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const result: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('subscriptions')
				.select('id, object, cancel_at_period_end, current_period_end, current_period_start, default_payment_method, items, metadata, pending_setup_intent, pending_update, status, application_fee_percent, billing_cycle_anchor, billing_thresholds, cancel_at, canceled_at, collection_method, created, days_until_due, default_source, default_tax_rates, discount, ended_at, livemode, next_pending_invoice_item_invoice, pause_collection, pending_invoice_item_interval, start_date, transfer_data, trial_end, trial_start, schedule, customer, latest_invoice, plan, updated_at, last_synced_at')
				.eq('customer', stripeCustomerId)

		if (result.error) {
			this.logger.error('Failed to find subscriptions by customer:', {
				error: result.error
			})
			throw result.error
		}

		return (result.data as Stripe.Subscription[]) || []
	}

	/**
	 * Find active subscription for a user (RLS-enforced query)
	 * Returns the subscription record from stripe.subscriptions table
	 * Uses service client with user token to enforce RLS policies
	 *
	 * SECURITY: FAIL-CLOSED ERROR HANDLING
	 * - User not found (PGRST116): Returns null (expected for users without subscriptions)
	 * - Database error: Throws exception (fail-closed - denies access)
	 * - RLS denial: Throws exception (fail-closed - denies access)
	 */
	async findSubscriptionByUserId(
		userId: string,
		userToken: string
	): Promise<{
		stripe_subscription_id: string | null
		stripe_customer_id: string | null
	} | null> {
		// Use user client to enforce RLS - only returns subscriptions user has access to
		const client = this.supabase.getUserClient(userToken)
		const stripeClient = asStripeSchemaClient(client)

		const { data, error } = (await stripeClient
			.schema('stripe')
			.from('subscriptions')
			.select('id, customer')
			.order('created', { ascending: false })
			.limit(1)
			.single()) as {
			data: { id: string; customer: string | null } | null
			error: SupabaseError | null
		}

		if (error) {
			// Not found is expected for users without subscriptions
			if (error.code === 'PGRST116') {
				return null
			}
			// All other errors throw (fail-closed security)
			this.logger.error('Failed to find subscription by user ID:', {
				error,
				userId
			})
			throw error
		}

		if (!data) {
			return null
		}

		return {
			stripe_subscription_id: data.id ?? null,
			stripe_customer_id: data.customer ?? null
		}
	}

	/**
	 * Find payment intent by Stripe payment intent ID (read-only)
	 * The Stripe Sync Engine automatically syncs all payment intents
	 */
	async findPaymentIntentByStripeId(
		stripePaymentIntentId: string
	): Promise<Stripe.PaymentIntent | null> {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const result: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('id, object, amount, amount_capturable, amount_details, amount_received, application, application_fee_amount, automatic_payment_methods, canceled_at, cancellation_reason, capture_method, client_secret, confirmation_method, created, currency, customer, description, invoice, last_payment_error, livemode, metadata, next_action, on_behalf_of, payment_method, payment_method_options, payment_method_types, processing, receipt_email, review, setup_future_usage, shipping, statement_descriptor, statement_descriptor_suffix, status, transfer_data, transfer_group, last_synced_at')
				.eq('id', stripePaymentIntentId)
				.single()

		if (result.error && result.error.code !== 'PGRST116') {
			this.logger.error('Failed to find payment intent:', {
				error: result.error
			})
			throw result.error
		}

		return result.data as Stripe.PaymentIntent | null
	}
}
