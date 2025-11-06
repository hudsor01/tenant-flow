/**
 * Stripe Constants
 * Centralized configuration values for Stripe integration
 */

/**
 * Maximum number of payment retry attempts before Stripe marks the invoice as uncollectible
 * Stripe default: 4 attempts over ~2 weeks
 * @see https://stripe.com/docs/billing/revenue-recovery/failed-payments
 */
export const MAX_STRIPE_PAYMENT_ATTEMPTS = 4

/**
 * Number of days before trial end to send warning email
 * Stripe webhook event: customer.subscription.trial_will_end
 */
export const TRIAL_ENDING_WARNING_DAYS = 3

/**
 * Default retry attempts for Supabase RPC calls
 * Used in StripeAccessControlService for fetching user data
 */
export const DEFAULT_RPC_RETRY_ATTEMPTS = 2

/**
 * Stripe webhook event types handled by the application
 */
export const STRIPE_WEBHOOK_EVENTS = {
	// Subscription lifecycle
	SUBSCRIPTION_CREATED: 'customer.subscription.created',
	SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
	SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
	SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',

	// Checkout events - CRITICAL for revenue tracking
	CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',

	// Invoice and payment events
	INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
	INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
	INVOICE_FINALIZED: 'invoice.finalized',

	// Payment intent events
	PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
	PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',

	// Payment method events
	PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
	PAYMENT_METHOD_DETACHED: 'payment_method.detached',

	// Customer events
	CUSTOMER_CREATED: 'customer.created',
	CUSTOMER_UPDATED: 'customer.updated',
	CUSTOMER_DELETED: 'customer.deleted'
} as const

/**
 * Subscription statuses that indicate active access
 */
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const

/**
 * Subscription statuses that indicate canceled/expired access
 */
export const INACTIVE_SUBSCRIPTION_STATUSES = [
	'canceled',
	'incomplete_expired',
	'unpaid',
	'past_due'
] as const
