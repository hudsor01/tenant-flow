/**
 * Stripe Sync Engine Schema Types
 *
 * TypeScript interfaces for tables in the `stripe` schema managed by
 * @supabase/stripe-sync-engine. These tables are not included in the
 * generated Supabase types (which only cover the `public` schema).
 *
 * Types are derived from: docs/tf_sb-stripe-schema.csv
 * Reference: https://github.com/supabase/stripe-sync-engine
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Stripe customer table (stripe.customers)
 * Synced from Stripe Customer objects
 * Note: `id` is the Stripe customer ID (e.g., cus_xxx)
 */
export interface StripeCustomer {
	id: string // Stripe customer ID (primary key)
	object: string | null
	address: Record<string, unknown> | null
	description: string | null
	email: string | null
	metadata: Record<string, unknown> | null
	name: string | null
	phone: string | null
	shipping: Record<string, unknown> | null
	balance: number | null
	created: number | null
	currency: string | null
	default_source: string | null
	delinquent: boolean | null
	discount: Record<string, unknown> | null
	invoice_prefix: string | null
	invoice_settings: Record<string, unknown> | null
	livemode: boolean | null
	next_invoice_sequence: number | null
	preferred_locales: unknown[] | null
	tax_exempt: string | null
	updated_at: string
	deleted: boolean
	last_synced_at: string | null
}

/**
 * Stripe subscription table (stripe.subscriptions)
 * Synced from Stripe Subscription objects
 * Note: `id` is the Stripe subscription ID (e.g., sub_xxx)
 */
export interface StripeSubscription {
	id: string // Stripe subscription ID (primary key)
	object: string | null
	cancel_at_period_end: boolean | null
	current_period_end: number | null
	current_period_start: number | null
	default_payment_method: string | null
	items: Record<string, unknown> | null
	metadata: Record<string, unknown> | null
	pending_setup_intent: string | null
	pending_update: Record<string, unknown> | null
	status: string | null // 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing' | etc.
	application_fee_percent: number | null
	billing_cycle_anchor: number | null
	billing_thresholds: Record<string, unknown> | null
	cancel_at: number | null
	canceled_at: number | null
	collection_method: string | null
	created: number | null
	days_until_due: number | null
	default_source: string | null
	default_tax_rates: unknown[] | null
	discount: Record<string, unknown> | null
	ended_at: number | null
	livemode: boolean | null
	next_pending_invoice_item_invoice: number | null
	pause_collection: Record<string, unknown> | null
	pending_invoice_item_interval: Record<string, unknown> | null
	start_date: number | null
	transfer_data: Record<string, unknown> | null
	trial_end: Record<string, unknown> | null
	trial_start: Record<string, unknown> | null
	schedule: string | null
	customer: string | null // FK to stripe.customers.id
	latest_invoice: string | null
	plan: string | null
	updated_at: string
	last_synced_at: string | null
}

/**
 * Stripe payment intent table (stripe.payment_intents)
 * Synced from Stripe PaymentIntent objects
 * Note: `id` is the Stripe payment intent ID (e.g., pi_xxx)
 */
export interface StripePaymentIntent {
	id: string // Stripe payment intent ID (primary key)
	object: string | null
	amount: number | null
	amount_capturable: number | null
	amount_details: Record<string, unknown> | null
	amount_received: number | null
	application: string | null
	application_fee_amount: number | null
	automatic_payment_methods: string | null
	canceled_at: number | null
	cancellation_reason: string | null
	capture_method: string | null
	client_secret: string | null
	confirmation_method: string | null
	created: number | null
	currency: string | null
	customer: string | null // FK to stripe.customers.id
	description: string | null
	invoice: string | null
	last_payment_error: string | null
	livemode: boolean | null
	metadata: Record<string, unknown> | null
	next_action: string | null
	on_behalf_of: string | null
	payment_method: string | null
	payment_method_options: Record<string, unknown> | null
	payment_method_types: unknown[] | null
	processing: string | null
	receipt_email: string | null
	review: string | null
	setup_future_usage: string | null
	shipping: Record<string, unknown> | null
	statement_descriptor: string | null
	statement_descriptor_suffix: string | null
	status: string | null
	transfer_data: Record<string, unknown> | null
	transfer_group: string | null
	last_synced_at: string | null
}

/**
 * Stripe checkout session table (stripe.checkout_sessions)
 * Synced from Stripe Checkout Session objects
 * Note: `id` is the Stripe checkout session ID (e.g., cs_xxx)
 */
export interface StripeCheckoutSession {
	id: string // Stripe checkout session ID (primary key)
	object: string | null
	adaptive_pricing: Record<string, unknown> | null
	after_expiration: Record<string, unknown> | null
	allow_promotion_codes: boolean | null
	amount_subtotal: number | null
	amount_total: number | null
	automatic_tax: Record<string, unknown> | null
	billing_address_collection: string | null
	cancel_url: string | null
	client_reference_id: string | null
	client_secret: string | null
	collected_information: Record<string, unknown> | null
	consent: Record<string, unknown> | null
	consent_collection: Record<string, unknown> | null
	created: number | null
	currency: string | null
	currency_conversion: Record<string, unknown> | null
	custom_fields: Record<string, unknown> | null
	custom_text: Record<string, unknown> | null
	customer: string | null // FK to stripe.customers.id
	customer_creation: string | null
	customer_details: Record<string, unknown> | null
	customer_email: string | null
	discounts: Record<string, unknown> | null
	expires_at: number | null
	invoice: string | null
	invoice_creation: Record<string, unknown> | null
	livemode: boolean | null
	locale: string | null
	metadata: Record<string, unknown> | null
	mode: string | null // 'payment' | 'setup' | 'subscription'
	optional_items: Record<string, unknown> | null
	payment_intent: string | null
	payment_link: string | null
	payment_method_collection: string | null
	payment_method_configuration_details: Record<string, unknown> | null
	payment_method_options: Record<string, unknown> | null
	payment_method_types: unknown[] | null
	payment_status: string | null // 'succeeded' | 'unpaid' | 'no_payment_required'
	permissions: Record<string, unknown> | null
	phone_number_collection: Record<string, unknown> | null
	presentment_details: Record<string, unknown> | null
	recovered_from: string | null
	redirect_on_completion: string | null
	return_url: string | null
	saved_payment_method_options: Record<string, unknown> | null
	setup_intent: string | null
	shipping_address_collection: Record<string, unknown> | null
	shipping_cost: Record<string, unknown> | null
	shipping_details: Record<string, unknown> | null
	shipping_options: Record<string, unknown> | null
	status: string | null // 'open' | 'complete' | 'expired'
	submit_type: string | null
	subscription: string | null // FK to stripe.subscriptions.id
	success_url: string | null
	tax_id_collection: Record<string, unknown> | null
	total_details: Record<string, unknown> | null
	ui_mode: string | null
	url: string | null
	wallet_options: Record<string, unknown> | null
	updated_at: string
	last_synced_at: string | null
}

/**
 * Stripe invoice table (stripe.invoices)
 * Synced from Stripe Invoice objects
 */
export interface StripeInvoice {
	id: string // Stripe invoice ID (primary key)
	object: string | null
	auto_advance: boolean | null
	collection_method: string | null
	currency: string | null
	description: string | null
	hosted_invoice_url: string | null
	lines: Record<string, unknown> | null
	metadata: Record<string, unknown> | null
	period_end: number | null
	period_start: number | null
	status: string | null // 'draft' | 'open' | 'succeeded' | 'uncollectible' | 'void'
	total: number | null
	amount_due: number | null
	amount_paid: number | null
	amount_remaining: number | null
	attempt_count: number | null
	attempted: boolean | null
	billing_reason: string | null
	created: number | null
	customer: string | null // FK to stripe.customers.id
	subscription: string | null // FK to stripe.subscriptions.id
	payment_intent: string | null
	livemode: boolean | null
	paid: boolean | null
	updated_at: string
	last_synced_at: string | null
}

/**
 * Stripe product table (stripe.products)
 * Synced from Stripe Product objects
 */
export interface StripeProduct {
	id: string // Stripe product ID (primary key)
	object: string | null
	active: boolean | null
	description: string | null
	metadata: Record<string, unknown> | null
	name: string | null
	created: number | null
	images: unknown[] | null
	livemode: boolean | null
	package_dimensions: Record<string, unknown> | null
	shippable: boolean | null
	statement_descriptor: string | null
	unit_label: string | null
	updated: number | null
	url: string | null
	updated_at: string
	marketing_features: Record<string, unknown> | null
	default_price: string | null
	last_synced_at: string | null
}

/**
 * Stripe price table (stripe.prices)
 * Synced from Stripe Price objects
 */
export interface StripePrice {
	id: string // Stripe price ID (primary key)
	object: string | null
	active: boolean | null
	currency: string | null
	metadata: Record<string, unknown> | null
	nickname: string | null
	recurring: Record<string, unknown> | null
	type: string | null // 'one_time' | 'recurring'
	unit_amount: number | null
	billing_scheme: string | null
	created: number | null
	livemode: boolean | null
	lookup_key: string | null
	tiers_mode: string | null
	transform_quantity: Record<string, unknown> | null
	unit_amount_decimal: string | null
	product: string | null // FK to stripe.products.id
	updated_at: string
	last_synced_at: string | null
}

/**
 * Supabase error response
 * Standard error format from Supabase client
 */
export interface SupabaseError {
	code: string
	message: string
	details?: string
	hint?: string
}

/**
 * Generic Supabase query result for Stripe schema tables
 */
export interface StripeSchemaQueryResult<T> {
	data: T | null
	error: SupabaseError | null
	count?: number | null
}

/**
 * Stripe schema table names
 */
export type StripeSchemaTable =
	| 'customers'
	| 'subscriptions'
	| 'payment_intents'
	| 'checkout_sessions'
	| 'invoices'
	| 'products'
	| 'prices'

/**
 * Type-safe stripe schema client interface
 * Use this instead of casting to `any` when accessing stripe schema
 */
export interface StripeSchemaClient {
	schema(name: 'stripe'): {
		from<T extends StripeSchemaTable>(
			table: T
		): StripeTableQueryBuilder<StripeTableRowType<T>>
	}
}

/**
 * Map table names to their row types
 */
export type StripeTableRowType<T extends StripeSchemaTable> =
	T extends 'customers'
		? StripeCustomer
		: T extends 'subscriptions'
			? StripeSubscription
			: T extends 'payment_intents'
				? StripePaymentIntent
				: T extends 'checkout_sessions'
					? StripeCheckoutSession
					: T extends 'invoices'
						? StripeInvoice
						: T extends 'products'
							? StripeProduct
							: T extends 'prices'
								? StripePrice
								: never

/**
 * Simplified query builder interface for stripe schema
 */
export interface StripeTableQueryBuilder<T> {
	select(
		columns?: string,
		options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }
	): StripeTableQueryBuilder<T>
	eq(
		column: string,
		value: string | number | boolean
	): StripeTableQueryBuilder<T>
	contains(
		column: string,
		value: Record<string, unknown>
	): StripeTableQueryBuilder<T>
	order(
		column: string,
		options?: { ascending?: boolean }
	): StripeTableQueryBuilder<T>
	limit(count: number): StripeTableQueryBuilder<T>
	single(): Promise<StripeSchemaQueryResult<T>>
	maybeSingle(): Promise<StripeSchemaQueryResult<T | null>>
	then<TResult>(
		onfulfilled?: (value: StripeSchemaQueryResult<T[]>) => TResult
	): Promise<TResult>
}

/**
 * Helper to cast Supabase client to stripe schema client
 * Use this instead of unsafe casts for type-safe stripe schema access
 *
 * @example
 * const stripeClient = asStripeSchemaClient(client)
 * const { data, error } = await stripeClient
 *   .schema('stripe')
 *   .from('customers')
 *   .select('*')
 *   .eq('id', customerId)
 *   .single()
 */
export function asStripeSchemaClient<T>(
	client: SupabaseClient<T>
): SupabaseClient<T> & StripeSchemaClient {
	return client as SupabaseClient<T> & StripeSchemaClient
}
