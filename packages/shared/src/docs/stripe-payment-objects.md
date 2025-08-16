# TenantFlow Stripe Payment Objects Documentation

This documentation covers additional Stripe objects used in TenantFlow for payment processing, checkout flows, and customer portal functionality.

## Payment Method Object

The Payment Method object represents a customer's payment credentials for collecting payments in the future.

### Key Properties for TenantFlow

```typescript
interface StripePaymentMethod {
	id: string // Unique payment method identifier
	object: 'payment_method' // Object type
	type: PaymentMethodType // Payment method type (card, us_bank_account, etc.)
	created: number // Creation timestamp
	customer?: string | null // Associated customer ID
	livemode: boolean // Live/test mode indicator
	metadata: Record<string, string> // Custom metadata

	// Billing details
	billing_details: {
		address?: {
			city?: string | null
			country?: string | null
			line1?: string | null
			line2?: string | null
			postal_code?: string | null
			state?: string | null
		} | null
		email?: string | null
		name?: string | null
		phone?: string | null
	}

	// Payment method specific data
	card?: {
		brand: string // Card brand (visa, mastercard, etc.)
		checks: {
			address_line1_check?: string | null
			address_postal_code_check?: string | null
			cvc_check?: string | null
		}
		country: string // Two-letter country code
		exp_month: number // Expiration month
		exp_year: number // Expiration year
		funding: string // Funding type (credit, debit, prepaid)
		last4: string // Last 4 digits
		networks?: {
			available: string[] // Available card networks
			preferred?: string | null // Preferred network
		}
		three_d_secure_usage?: {
			supported: boolean // 3D Secure support
		}
		wallet?: {
			// Digital wallet info
			type: string
			// Wallet-specific data
		} | null
	} | null

	us_bank_account?: {
		account_holder_type?: string | null
		account_type?: string | null
		bank_name?: string | null
		fingerprint?: string | null
		last4: string
		networks: {
			preferred?: string | null
			supported: string[]
		}
		routing_number: string
		status_details?: {
			blocked?: {
				network_code?: string | null
				reason?: string | null
			} | null
		} | null
	} | null
}
```

### Payment Method Types

```typescript
export const PAYMENT_METHOD_TYPES = {
	// Cards
	CARD: 'card',

	// Bank Transfers
	US_BANK_ACCOUNT: 'us_bank_account',
	SEPA_DEBIT: 'sepa_debit',
	BACS_DEBIT: 'bacs_debit',
	AU_BECS_DEBIT: 'au_becs_debit',

	// Digital Wallets
	ALIPAY: 'alipay',
	WECHAT_PAY: 'wechat_pay',

	// Buy Now Pay Later
	KLARNA: 'klarna',
	AFTERPAY_CLEARPAY: 'afterpay_clearpay',

	// Other
	ACSS_DEBIT: 'acss_debit',
	BANCONTACT: 'bancontact',
	EPS: 'eps',
	GIROPAY: 'giropay',
	IDEAL: 'ideal',
	P24: 'p24',
	SOFORT: 'sofort'
} as const

export type PaymentMethodType =
	(typeof PAYMENT_METHOD_TYPES)[keyof typeof PAYMENT_METHOD_TYPES]
```

### TenantFlow Implementation Example

```typescript
// List customer's payment methods
const paymentMethods = await stripe.paymentMethods.list({
	customer: customerId,
	type: 'card',
	limit: 10
})

// Attach payment method to customer
await stripe.paymentMethods.attach(paymentMethodId, {
	customer: customerId
})

// Update payment method billing details
await stripe.paymentMethods.update(paymentMethodId, {
	billing_details: {
		name: customerName,
		email: customerEmail,
		address: {
			line1: address.street,
			city: address.city,
			state: address.state,
			postal_code: address.zipCode,
			country: 'US'
		}
	}
})
```

## Checkout Session Object

Checkout Sessions enable you to create a customized payment page that accepts multiple payment methods.

### Key Properties for TenantFlow

```typescript
interface StripeCheckoutSession {
	id: string // Unique session identifier
	object: 'checkout.session' // Object type
	mode: CheckoutMode // Payment mode
	url?: string | null // Checkout URL
	success_url: string // Redirect URL on success
	cancel_url: string // Redirect URL on cancellation

	// Payment configuration
	amount_subtotal?: number | null // Subtotal amount
	amount_total?: number | null // Total amount
	currency?: string | null // Currency code
	customer?: string | null // Associated customer
	customer_email?: string | null // Customer email

	// Line items
	line_items?: {
		object: 'list'
		data: Array<{
			id: string
			object: 'item'
			amount_subtotal: number
			amount_total: number
			currency: string
			description: string
			price: StripePrice
			quantity?: number | null
		}>
		has_more: boolean
		url: string
	} | null

	// Payment status
	payment_status: PaymentStatus
	payment_intent?: string | null
	subscription?: string | null

	// Customer details
	customer_details?: {
		address?: StripeAddress | null
		email?: string | null
		name?: string | null
		phone?: string | null
		tax_exempt?: 'exempt' | 'none' | 'reverse' | null
		tax_ids?: Array<{
			type: string
			value: string
		}> | null
	} | null

	// Timestamps
	created: number
	expires_at: number

	// Metadata
	metadata: Record<string, string>
	livemode: boolean
}

export const CHECKOUT_MODES = {
	PAYMENT: 'payment', // One-time payment
	SETUP: 'setup', // Save payment method
	SUBSCRIPTION: 'subscription' // Recurring subscription
} as const

export type CheckoutMode = (typeof CHECKOUT_MODES)[keyof typeof CHECKOUT_MODES]

export const PAYMENT_STATUSES = {
	NO_PAYMENT_REQUIRED: 'no_payment_required',
	PAID: 'paid',
	UNPAID: 'unpaid'
} as const

export type PaymentStatus =
	(typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]
```

### TenantFlow Implementation Example

```typescript
// Create subscription checkout session
const session = await stripe.checkout.sessions.create({
	mode: 'subscription',
	customer: stripeCustomerId,
	line_items: [
		{
			price: priceId,
			quantity: 1
		}
	],
	success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
	cancel_url: `${baseUrl}/billing/cancelled`,
	subscription_data: {
		trial_period_days: 14,
		metadata: {
			tenantflow_user_id: userId,
			tenantflow_plan_type: planType
		}
	},
	metadata: {
		tenantflow_user_id: userId,
		tenantflow_organization_id: organizationId
	}
})

// Retrieve session with line items
const retrievedSession = await stripe.checkout.sessions.retrieve(sessionId, {
	expand: ['line_items']
})
```

## Customer Portal Session Object

Customer Portal Sessions provide secure access to the billing portal for customer self-service.

### Key Properties for TenantFlow

```typescript
interface StripeCustomerPortalSession {
	id: string // Unique session identifier
	object: 'billing_portal.session' // Object type
	customer: string // Customer ID
	url: string // Portal access URL
	return_url?: string | null // Return URL after portal use
	livemode: boolean // Live/test mode

	// Configuration
	configuration: string // Portal configuration ID

	// Flow configuration (optional)
	flow?: {
		type: PortalFlowType
		after_completion: {
			type: 'hosted_confirmation' | 'redirect'
			hosted_confirmation?: {
				custom_message?: string | null
			}
			redirect?: {
				return_url: string
			}
		}
		subscription_cancel?: {
			retention?: {
				coupon_offer: {
					coupon: string
				}
			}
			subscription: string
		}
		subscription_update?: {
			subscription: string
		}
		subscription_update_confirm?: {
			discounts?: Array<{
				coupon?: string
				promotion_code?: string
			}> | null
			items: Array<{
				id: string
				price?: string | null
				quantity?: number | null
			}>
			subscription: string
		}
	} | null

	// Timestamps
	created: number
}

export const PORTAL_FLOW_TYPES = {
	PAYMENT_METHOD_UPDATE: 'payment_method_update',
	SUBSCRIPTION_CANCEL: 'subscription_cancel',
	SUBSCRIPTION_UPDATE: 'subscription_update',
	SUBSCRIPTION_UPDATE_CONFIRM: 'subscription_update_confirm'
} as const

export type PortalFlowType =
	(typeof PORTAL_FLOW_TYPES)[keyof typeof PORTAL_FLOW_TYPES]
```

### TenantFlow Implementation Example

```typescript
// Create basic portal session
const portalSession = await stripe.billingPortal.sessions.create({
	customer: stripeCustomerId,
	return_url: 'https://tenantflow.app/billing'
})

// Create portal session with specific flow
const portalSession = await stripe.billingPortal.sessions.create({
	customer: stripeCustomerId,
	return_url: 'https://tenantflow.app/billing',
	flow: {
		type: 'subscription_cancel',
		after_completion: {
			type: 'hosted_confirmation',
			hosted_confirmation: {
				custom_message:
					"We're sorry to see you go! Your cancellation has been processed."
			}
		},
		subscription_cancel: {
			subscription: subscriptionId,
			retention: {
				coupon_offer: {
					coupon: 'comeback-discount-50'
				}
			}
		}
	}
})
```

## Payment Intent Object

Payment Intents represent an intent to collect payment from a customer, tracking the payment lifecycle.

### Key Properties for TenantFlow

```typescript
interface StripePaymentIntent {
	id: string // Unique payment intent identifier
	object: 'payment_intent' // Object type
	status: PaymentIntentStatus // Current status

	// Amount details
	amount: number // Amount to charge (in cents)
	amount_capturable?: number | null // Amount that can be captured
	amount_received: number // Amount received
	currency: string // Currency code

	// Payment method
	payment_method?: string | null // Payment method ID
	payment_method_types: string[] // Allowed payment method types

	// Customer details
	customer?: string | null // Customer ID
	description?: string | null // Payment description
	receipt_email?: string | null // Receipt email

	// Confirmation
	confirmation_method: ConfirmationMethod
	client_secret?: string | null // Client-side secret

	// Status tracking
	canceled_at?: number | null
	cancellation_reason?: CancellationReason | null

	// Capture configuration
	capture_method: CaptureMethod

	// Next action required
	next_action?: {
		type: string
		// Action-specific data
	} | null

	// Timestamps
	created: number

	// Metadata
	metadata: Record<string, string>
	livemode: boolean
}

export const PAYMENT_INTENT_STATUSES = {
	REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
	REQUIRES_CONFIRMATION: 'requires_confirmation',
	REQUIRES_ACTION: 'requires_action',
	PROCESSING: 'processing',
	REQUIRES_CAPTURE: 'requires_capture',
	CANCELED: 'canceled',
	SUCCEEDED: 'succeeded'
} as const

export type PaymentIntentStatus =
	(typeof PAYMENT_INTENT_STATUSES)[keyof typeof PAYMENT_INTENT_STATUSES]

export const CONFIRMATION_METHODS = {
	AUTOMATIC: 'automatic',
	MANUAL: 'manual'
} as const

export type ConfirmationMethod =
	(typeof CONFIRMATION_METHODS)[keyof typeof CONFIRMATION_METHODS]

export const CAPTURE_METHODS = {
	AUTOMATIC: 'automatic',
	AUTOMATIC_ASYNC: 'automatic_async',
	MANUAL: 'manual'
} as const

export type CaptureMethod =
	(typeof CAPTURE_METHODS)[keyof typeof CAPTURE_METHODS]

export const CANCELLATION_REASONS = {
	ABANDONED: 'abandoned',
	DUPLICATE: 'duplicate',
	FRAUDULENT: 'fraudulent',
	REQUESTED_BY_CUSTOMER: 'requested_by_customer',
	VOID_INVOICE: 'void_invoice'
} as const

export type CancellationReason =
	(typeof CANCELLATION_REASONS)[keyof typeof CANCELLATION_REASONS]
```

## Setup Intent Object

Setup Intents represent an intent to set up a payment method for future payments.

### Key Properties for TenantFlow

```typescript
interface StripeSetupIntent {
	id: string // Unique setup intent identifier
	object: 'setup_intent' // Object type
	status: SetupIntentStatus // Current status

	// Payment method configuration
	payment_method?: string | null // Payment method ID
	payment_method_types: string[] // Allowed payment method types
	usage: UsageType // Usage type

	// Customer details
	customer?: string | null // Customer ID
	description?: string | null // Setup description

	// Confirmation
	client_secret?: string | null // Client-side secret

	// Status tracking
	canceled_at?: number | null
	cancellation_reason?: SetupCancellationReason | null

	// Next action required
	next_action?: {
		type: string
		// Action-specific data
	} | null

	// Timestamps
	created: number

	// Metadata
	metadata: Record<string, string>
	livemode: boolean
}

export const SETUP_INTENT_STATUSES = {
	REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
	REQUIRES_CONFIRMATION: 'requires_confirmation',
	REQUIRES_ACTION: 'requires_action',
	PROCESSING: 'processing',
	CANCELED: 'canceled',
	SUCCEEDED: 'succeeded'
} as const

export type SetupIntentStatus =
	(typeof SETUP_INTENT_STATUSES)[keyof typeof SETUP_INTENT_STATUSES]

export const USAGE_TYPES = {
	ON_SESSION: 'on_session',
	OFF_SESSION: 'off_session'
} as const

export type UsageType = (typeof USAGE_TYPES)[keyof typeof USAGE_TYPES]

export const SETUP_CANCELLATION_REASONS = {
	ABANDONED: 'abandoned',
	DUPLICATE: 'duplicate',
	REQUESTED_BY_CUSTOMER: 'requested_by_customer'
} as const

export type SetupCancellationReason =
	(typeof SETUP_CANCELLATION_REASONS)[keyof typeof SETUP_CANCELLATION_REASONS]
```

## Webhook Event Handling

TenantFlow processes these additional webhook events for payment objects:

### Payment Method Events

- `payment_method.attached` - Payment method attached to customer
- `payment_method.detached` - Payment method detached from customer
- `payment_method.updated` - Payment method updated

### Payment Intent Events

- `payment_intent.created` - Payment intent created
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.requires_action` - Additional authentication required
- `payment_intent.canceled` - Payment canceled

### Setup Intent Events

- `setup_intent.created` - Setup intent created
- `setup_intent.succeeded` - Setup completed successfully
- `setup_intent.setup_failed` - Setup failed
- `setup_intent.requires_action` - Additional authentication required
- `setup_intent.canceled` - Setup canceled

### Checkout Session Events

- `checkout.session.completed` - Checkout session completed
- `checkout.session.expired` - Checkout session expired
- `checkout.session.async_payment_succeeded` - Async payment succeeded
- `checkout.session.async_payment_failed` - Async payment failed

## Implementation Examples

### Payment Method Management

```typescript
// List customer payment methods
const listPaymentMethods = async (customerId: string) => {
	return await stripe.paymentMethods.list({
		customer: customerId,
		type: 'card',
		limit: 10
	})
}

// Set default payment method
const setDefaultPaymentMethod = async (
	customerId: string,
	paymentMethodId: string
) => {
	await stripe.customers.update(customerId, {
		invoice_settings: {
			default_payment_method: paymentMethodId
		}
	})
}
```

### Checkout Flow Management

```typescript
// Create subscription checkout
const createSubscriptionCheckout = async (params: {
	customerId: string
	priceId: string
	successUrl: string
	cancelUrl: string
}) => {
	return await stripe.checkout.sessions.create({
		mode: 'subscription',
		customer: params.customerId,
		line_items: [
			{
				price: params.priceId,
				quantity: 1
			}
		],
		success_url: params.successUrl,
		cancel_url: params.cancelUrl,
		allow_promotion_codes: true,
		billing_address_collection: 'auto',
		customer_update: {
			address: 'auto',
			name: 'auto'
		}
	})
}
```

### Portal Session Management

```typescript
// Create customer portal session
const createPortalSession = async (customerId: string, returnUrl: string) => {
	return await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: returnUrl
	})
}
```

## Utility Functions

```typescript
// Payment method utilities
export function isCardPaymentMethod(pm: StripePaymentMethod): boolean {
	return pm.type === 'card' && pm.card !== null
}

export function getPaymentMethodDisplayName(pm: StripePaymentMethod): string {
	if (pm.type === 'card' && pm.card) {
		return `**** **** **** ${pm.card.last4}`
	}
	if (pm.type === 'us_bank_account' && pm.us_bank_account) {
		return `${pm.us_bank_account.bank_name} ****${pm.us_bank_account.last4}`
	}
	return pm.type
}

// Checkout session utilities
export function isCheckoutSessionCompleted(
	session: StripeCheckoutSession
): boolean {
	return session.payment_status === 'paid'
}

// Payment intent utilities
export function isPaymentIntentSucceeded(intent: StripePaymentIntent): boolean {
	return intent.status === 'succeeded'
}

export function requiresAction(intent: StripePaymentIntent): boolean {
	return intent.status === 'requires_action'
}
```

## Event Object

Event objects represent activity happening in your Stripe account, delivered via webhooks.

### Key Properties for TenantFlow

```typescript
interface StripeEvent {
	id: string // Unique event identifier
	object: 'event' // Object type
	api_version: string // API version when event created
	created: number // Creation timestamp
	type: WebhookEventType // Event type (e.g., 'customer.subscription.created')
	livemode: boolean // Live/test mode indicator

	// Event data
	data: {
		object: any // The object that triggered the event
		previous_attributes?: Record<string, any> // Previous values for updated objects
	}

	// Event metadata
	pending_webhooks: number // Number of pending webhook deliveries
	request?: {
		id?: string | null // API request ID that created the event
		idempotency_key?: string | null // Idempotency key used
	} | null
}
```

### Event Types Used in TenantFlow

```typescript
export const WEBHOOK_EVENT_TYPES = {
	// Customer events
	CUSTOMER_CREATED: 'customer.created',
	CUSTOMER_UPDATED: 'customer.updated',
	CUSTOMER_DELETED: 'customer.deleted',

	// Subscription events
	SUBSCRIPTION_CREATED: 'customer.subscription.created',
	SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
	SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
	SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
	SUBSCRIPTION_PAUSED: 'customer.subscription.paused',
	SUBSCRIPTION_RESUMED: 'customer.subscription.resumed',

	// Invoice events
	INVOICE_CREATED: 'invoice.created',
	INVOICE_FINALIZED: 'invoice.finalized',
	INVOICE_PAID: 'invoice.paid',
	INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
	INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
	INVOICE_UPDATED: 'invoice.updated',
	INVOICE_VOIDED: 'invoice.voided',
	INVOICE_MARKED_UNCOLLECTIBLE: 'invoice.marked_uncollectible',
	INVOICE_UPCOMING: 'invoice.upcoming',

	// Payment events
	PAYMENT_INTENT_CREATED: 'payment_intent.created',
	PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
	PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
	PAYMENT_INTENT_REQUIRES_ACTION: 'payment_intent.requires_action',
	PAYMENT_INTENT_CANCELED: 'payment_intent.canceled',

	// Setup Intent events
	SETUP_INTENT_CREATED: 'setup_intent.created',
	SETUP_INTENT_SUCCEEDED: 'setup_intent.succeeded',
	SETUP_INTENT_SETUP_FAILED: 'setup_intent.setup_failed',
	SETUP_INTENT_REQUIRES_ACTION: 'setup_intent.requires_action',
	SETUP_INTENT_CANCELED: 'setup_intent.canceled',

	// Payment Method events
	PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
	PAYMENT_METHOD_DETACHED: 'payment_method.detached',
	PAYMENT_METHOD_UPDATED: 'payment_method.updated',

	// Checkout events
	CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
	CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired',
	CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED:
		'checkout.session.async_payment_succeeded',
	CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED:
		'checkout.session.async_payment_failed',

	// Charge events
	CHARGE_SUCCEEDED: 'charge.succeeded',
	CHARGE_FAILED: 'charge.failed',
	CHARGE_CAPTURED: 'charge.captured',
	CHARGE_REFUNDED: 'charge.refunded',
	CHARGE_UPDATED: 'charge.updated',
	CHARGE_DISPUTE_CREATED: 'charge.dispute.created'
} as const

export type WebhookEventType =
	(typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES]
```

### TenantFlow Event Processing

```typescript
// Webhook event handler signature
interface WebhookEventHandler {
	(event: StripeEvent, context: RequestContext): Promise<void>
}

// Event processing with type safety
async function processWebhookEvent(event: StripeEvent): Promise<void> {
	switch (event.type) {
		case 'customer.subscription.created':
			const subscription = event.data.object as StripeSubscription
			await handleSubscriptionCreated(subscription, event)
			break

		case 'invoice.payment_succeeded':
			const invoice = event.data.object as Stripe.Invoice
			await handleInvoicePaymentSucceeded(invoice, event)
			break

		case 'payment_intent.succeeded':
			const paymentIntent = event.data.object as Stripe.PaymentIntent
			await handlePaymentIntentSucceeded(paymentIntent, event)
			break

		default:
			console.warn(`Unhandled webhook event type: ${event.type}`)
	}
}
```

### Event Validation and Security

```typescript
// Webhook signature validation
function validateWebhookSignature(
	payload: string,
	signature: string,
	secret: string
): StripeEvent {
	try {
		return stripe.webhooks.constructEvent(payload, signature, secret)
	} catch (error) {
		throw new Error(`Webhook signature validation failed: ${error.message}`)
	}
}

// Event idempotency checking
async function isEventProcessed(eventId: string): Promise<boolean> {
	const existingEvent = await database.webhookEvent.findUnique({
		where: { stripeEventId: eventId }
	})
	return existingEvent?.processed || false
}
```

## Related Documentation

- [Stripe Subscriptions Documentation](./stripe-subscription-docs.md)
- [Stripe API Patterns](./stripe-api-patterns.md) - Pagination, error handling, object expansion
- [Stripe API Best Practices](./stripe-api-best-practices.md) - Idempotency, metadata, security
- [Core Stripe Objects](../types/stripe-core-objects.ts)
- [Payment Objects Types](../types/stripe-payment-objects.ts)
- [API Patterns Types](../types/stripe-api-patterns.ts)
- [TenantFlow Billing Types](../types/billing.ts)
