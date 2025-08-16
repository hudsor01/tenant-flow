# Stripe API Patterns for TenantFlow

This documentation covers essential Stripe API patterns for pagination, object expansion, error handling, and response optimization that are crucial for production-ready integration.

## Pagination

Stripe uses cursor-based pagination for all list endpoints, providing efficient navigation through large datasets.

### List Object Structure

```typescript
interface StripeList<T> {
	object: 'list' // Always "list"
	data: T[] // Array of objects
	has_more: boolean // More data available
	url: string // Endpoint URL
	total_count?: number | null // Total count (if available)
}

// Common list responses in TenantFlow
type CustomerList = StripeList<StripeCustomer>
type SubscriptionList = StripeList<StripeSubscription>
type InvoiceList = StripeList<StripeInvoice>
type PaymentMethodList = StripeList<StripePaymentMethod>
```

### Pagination Parameters

```typescript
interface PaginationParams {
	limit?: number // Number of objects (1-100, default 10)
	starting_after?: string // Object ID cursor for forward pagination
	ending_before?: string // Object ID cursor for backward pagination
}

// NEVER use both starting_after and ending_before together
// Use only one cursor parameter per request
```

### TenantFlow Pagination Implementation

```typescript
// Paginate through all customer subscriptions
async function getAllCustomerSubscriptions(
	customerId: string
): Promise<StripeSubscription[]> {
	const allSubscriptions: StripeSubscription[] = []
	let hasMore = true
	let startingAfter: string | undefined

	while (hasMore) {
		const response = await StripeSubscriptions.list({
			customer: customerId,
			limit: 100,
			starting_after: startingAfter,
			status: 'all'
		})

		allSubscriptions.push(...response.data)
		hasMore = response.has_more

		if (hasMore && response.data.length > 0) {
			startingAfter = response.data[response.data.length - 1].id
		}
	}

	return allSubscriptions
}

// Paginated invoice retrieval with date filtering
async function getRecentInvoices(
	customerId: string,
	sinceDate: Date
): Promise<StripeInvoice[]> {
	const invoices: StripeInvoice[] = []
	const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000)

	for await (const invoice of stripe.invoices.list({
		customer: customerId,
		created: { gte: sinceTimestamp },
		limit: 100
	})) {
		invoices.push(invoice)
	}

	return invoices
}

// Auto-pagination with Stripe client libraries
async function getFilteredCustomers(
	planType: string
): Promise<StripeCustomer[]> {
	const customers: StripeCustomer[] = []

	// Stripe's auto-pagination iterator
	for await (const customer of stripe.customers.list({
		limit: 100,
		expand: ['subscriptions']
	})) {
		// Filter customers by plan type in metadata
		if (customer.metadata.tenantflow_plan_type === planType) {
			customers.push(customer)
		}
	}

	return customers
}
```

### Pagination Best Practices

```typescript
// 1. Use reasonable page sizes
const OPTIMAL_PAGE_SIZE = 100 // Maximum for best performance

// 2. Handle pagination errors gracefully
async function safePaginatedRequest<T>(
	listFunction: () => Promise<StripeList<T>>,
	maxRetries: number = 3
): Promise<T[]> {
	let attempt = 0

	while (attempt < maxRetries) {
		try {
			const response = await listFunction()
			return response.data
		} catch (error) {
			attempt++
			if (attempt >= maxRetries) throw error

			// Exponential backoff
			const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}

	return []
}

// 3. Use created timestamp for time-based pagination
async function getInvoicesSince(timestamp: number): Promise<StripeInvoice[]> {
	return await stripe.invoices
		.list({
			created: { gte: timestamp },
			limit: 100
		})
		.then(response => response.data)
}
```

## Object Expansion

Object expansion allows you to retrieve related objects in a single API request, reducing round trips and improving performance.

### Expansion Syntax

```typescript
// Single expansion
const subscription = await StripeSubscriptions.retrieve(subscriptionId, {
	expand: ['customer']
})

// Multiple expansions
const subscription = await StripeSubscriptions.retrieve(subscriptionId, {
	expand: ['customer', 'default_payment_method', 'latest_invoice']
})

// Nested expansion (up to 4 levels deep)
const subscription = await StripeSubscriptions.retrieve(subscriptionId, {
	expand: [
		'customer',
		'latest_invoice.payment_intent',
		'latest_invoice.payment_intent.payment_method'
	]
})

// List expansion starts with 'data'
const subscriptions = await StripeSubscriptions.list({
	customer: customerId,
	expand: [
		'data.customer',
		'data.latest_invoice',
		'data.default_payment_method'
	]
})
```

### TenantFlow Expansion Patterns

```typescript
// Get subscription with full customer and payment details
async function getSubscriptionDetails(subscriptionId: string) {
	return await StripeSubscriptions.retrieve(subscriptionId, {
		expand: [
			'customer', // Customer object
			'default_payment_method', // Payment method details
			'latest_invoice', // Latest invoice
			'latest_invoice.payment_intent', // Payment intent
			'items.data.price', // Price details for items
			'schedule' // Subscription schedule if exists
		]
	})
}

// Get invoice with comprehensive payment information
async function getInvoiceWithPaymentDetails(invoiceId: string) {
	return await stripe.invoices.retrieve(invoiceId, {
		expand: [
			'customer', // Customer details
			'payment_intent', // Associated payment intent
			'payment_intent.payment_method', // Payment method used
			'subscription', // Associated subscription
			'charge', // Charge details
			'lines.data.price' // Line item prices
		]
	})
}

// Checkout session with full context
async function getCheckoutSessionDetails(sessionId: string) {
	return await stripe.checkout.sessions.retrieve(sessionId, {
		expand: [
			'customer', // Customer information
			'payment_intent', // Payment intent
			'payment_intent.payment_method', // Payment method
			'subscription', // Created subscription
			'subscription.items.data.price', // Subscription price details
			'line_items' // Line items
		]
	})
}
```

### Expansion Performance Considerations

```typescript
// DO: Expand only what you need
const subscription = await StripeSubscriptions.retrieve(subscriptionId, {
	expand: ['customer', 'default_payment_method'] // Only essential data
})

// DON'T: Over-expand unless necessary
const subscription = await StripeSubscriptions.retrieve(subscriptionId, {
	expand: [
		'customer',
		'default_payment_method',
		'latest_invoice',
		'latest_invoice.payment_intent',
		'latest_invoice.payment_intent.payment_method',
		'items.data.price',
		'items.data.price.product' // This might be excessive
	]
})

// For list requests, be especially cautious with expansions
const subscriptions = await StripeSubscriptions.list({
	customer: customerId,
	limit: 10, // Lower limit when using expansions
	expand: ['data.latest_invoice'] // Only expand critical fields
})
```

## Error Handling

Comprehensive error handling is essential for robust Stripe integration.

### Error Types and Structure

```typescript
// Stripe error object structure
interface StripeError {
	type: StripeErrorType
	code?: string
	message: string
	param?: string
	doc_url?: string
	request_log_url?: string
	charge?: string
	decline_code?: string
	payment_intent?: StripePaymentIntent
	payment_method?: StripePaymentMethod
	source?: any
}

export const STRIPE_ERROR_TYPES = {
	CARD_ERROR: 'card_error', // Card issues (most common)
	INVALID_REQUEST_ERROR: 'invalid_request_error', // Bad request parameters
	API_ERROR: 'api_error', // Stripe server issues
	AUTHENTICATION_ERROR: 'authentication_error', // API key issues
	RATE_LIMIT_ERROR: 'rate_limit_error', // Too many requests
	IDEMPOTENCY_ERROR: 'idempotency_error' // Idempotency key conflicts
} as const

export type StripeErrorType =
	(typeof STRIPE_ERROR_TYPES)[keyof typeof STRIPE_ERROR_TYPES]

// HTTP Status codes mapping
export const HTTP_STATUS_MEANINGS = {
	200: 'OK - Request succeeded',
	201: 'Created - Resource created successfully',
	202: 'Accepted - Request accepted for processing',
	400: 'Bad Request - Invalid parameters',
	401: 'Unauthorized - Invalid API key',
	402: 'Request Failed - Parameters valid but request failed',
	403: 'Forbidden - No permission',
	404: 'Not Found - Resource not found',
	409: 'Conflict - Request conflicts with server state',
	429: 'Too Many Requests - Rate limited',
	500: 'Internal Server Error - Stripe server error',
	502: 'Bad Gateway - Server error',
	503: 'Service Unavailable - Server overloaded',
	504: 'Gateway Timeout - Server timeout'
} as const
```

### TenantFlow Error Handling Implementation

```typescript
// Comprehensive error handler
class StripeErrorHandler {
	static async handleStripeError(
		error: any,
		operation: string,
		context?: any
	): Promise<never> {
		const errorDetails = {
			operation,
			timestamp: new Date().toISOString(),
			context,
			stripeRequestId: error.requestId,
			errorType: error.type,
			errorCode: error.code,
			message: error.message,
			httpStatus: error.statusCode
		}

		// Log error details
		console.error('Stripe operation failed:', errorDetails)

		// Send to monitoring (Sentry, DataDog, etc.)
		await this.sendToMonitoring(errorDetails)

		// Store in audit log
		await this.auditStripeError(errorDetails)

		// Handle specific error types
		switch (error.type) {
			case STRIPE_ERROR_TYPES.CARD_ERROR:
				throw new PaymentFailedError(
					this.getCardErrorMessage(error),
					error.code
				)

			case STRIPE_ERROR_TYPES.INVALID_REQUEST_ERROR:
				throw new ValidationError(
					`Invalid request: ${error.message}`,
					error.param
				)

			case STRIPE_ERROR_TYPES.RATE_LIMIT_ERROR:
				throw new RateLimitError(
					'Too many requests, please try again later'
				)

			case STRIPE_ERROR_TYPES.AUTHENTICATION_ERROR:
				throw new AuthenticationError('Stripe authentication failed')

			case STRIPE_ERROR_TYPES.API_ERROR:
				throw new StripeServerError(
					'Stripe server error, please try again'
				)

			default:
				throw new UnknownStripeError(
					`Unexpected Stripe error: ${error.message}`
				)
		}
	}

	private static getCardErrorMessage(error: StripeError): string {
		switch (error.code) {
			case 'card_declined':
				return 'Your card was declined. Please try a different payment method.'
			case 'expired_card':
				return 'Your card has expired. Please use a different payment method.'
			case 'insufficient_funds':
				return 'Insufficient funds. Please use a different payment method.'
			case 'incorrect_cvc':
				return "Your card's security code is incorrect."
			case 'processing_error':
				return 'An error occurred while processing your card. Please try again.'
			default:
				return error.message || 'Your payment could not be processed.'
		}
	}

	// Retry logic with exponential backoff
	static async withRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000
	): Promise<T> {
		let lastError: any

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error

				// Don't retry on certain error types
				if (
					error.type === STRIPE_ERROR_TYPES.CARD_ERROR ||
					error.type === STRIPE_ERROR_TYPES.INVALID_REQUEST_ERROR ||
					error.type === STRIPE_ERROR_TYPES.AUTHENTICATION_ERROR
				) {
					throw error
				}

				// Don't retry on last attempt
				if (attempt === maxRetries) {
					throw error
				}

				// Exponential backoff with jitter
				const delay =
					baseDelay * Math.pow(2, attempt) + Math.random() * 1000
				await new Promise(resolve => setTimeout(resolve, delay))
			}
		}

		throw lastError
	}
}

// Usage in TenantFlow services
async function createSubscriptionSafely(params: CreateSubscriptionParams) {
	try {
		return await StripeErrorHandler.withRetry(async () => {
			return await StripeSubscriptions.create({
				customer: params.customerId,
				items: [{ price: params.priceId }],
				trial_period_days: params.trialDays,
				metadata: {
					tenantflow_user_id: params.userId,
					tenantflow_plan_type: params.planType
				}
			})
		})
	} catch (error) {
		await StripeErrorHandler.handleStripeError(
			error,
			'create_subscription',
			params
		)
	}
}
```

### Error Response Patterns

```typescript
// User-friendly error responses
class PaymentErrorResponseHandler {
	static formatErrorForUser(error: StripeError): UserErrorResponse {
		switch (error.type) {
			case STRIPE_ERROR_TYPES.CARD_ERROR:
				return {
					success: false,
					error: {
						type: 'payment_failed',
						message: this.getCardErrorMessage(error),
						code: error.code,
						canRetry: this.canRetryCardError(error.code)
					}
				}

			case STRIPE_ERROR_TYPES.RATE_LIMIT_ERROR:
				return {
					success: false,
					error: {
						type: 'rate_limit',
						message:
							'Too many requests. Please wait a moment and try again.',
						retryAfter: 60 // seconds
					}
				}

			default:
				return {
					success: false,
					error: {
						type: 'system_error',
						message:
							'An unexpected error occurred. Please try again or contact support.',
						supportContact: 'support@tenantflow.app'
					}
				}
		}
	}

	private static canRetryCardError(code?: string): boolean {
		const retryableCodes = [
			'processing_error',
			'try_again_later',
			'temporary_failure'
		]
		return code ? retryableCodes.includes(code) : false
	}
}
```

## Response Optimization

Optimize API responses by including only necessary data and using dependent response values.

### Include Dependent Response Values (API v2)

```typescript
// Some API v2 endpoints return null values by default
// Use 'include' parameter to get actual values

interface IncludeParams {
	include?: string[] // Array of properties to include
}

// Example: Account creation with specific inclusions
async function createAccountWithIncludes() {
	return await fetch('https://api.stripe.com/v2/core/accounts', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			include: [
				'identity',
				'configuration.customer',
				'configuration.payments'
			]
		})
	})
}
```

### Response Optimization Patterns

```typescript
// Optimize for different use cases
class StripeResponseOptimizer {
	// Minimal subscription data for lists
	static async getSubscriptionsList(customerId: string) {
		return await StripeSubscriptions.list({
			customer: customerId,
			limit: 50,
			// Don't expand anything for list view
			status: 'active'
		})
	}

	// Full subscription data for detail view
	static async getSubscriptionDetails(subscriptionId: string) {
		return await StripeSubscriptions.retrieve(subscriptionId, {
			expand: [
				'customer',
				'default_payment_method',
				'latest_invoice',
				'items.data.price'
			]
		})
	}

	// Billing-focused invoice data
	static async getInvoiceForBilling(invoiceId: string) {
		return await stripe.invoices.retrieve(invoiceId, {
			expand: ['customer', 'payment_intent', 'subscription']
		})
	}
}
```

## Production Best Practices

### Combined Implementation Example

```typescript
// Production-ready service combining all patterns
export class TenantFlowStripeService {
	private stripe: Stripe

	constructor(apiKey: string) {
		this.stripe = new Stripe(apiKey, {
			apiVersion: '2023-10-16',
			typescript: true
		})
	}

	// Get customer with paginated subscriptions and error handling
	async getCustomerWithSubscriptions(customerId: string) {
		try {
			return await StripeErrorHandler.withRetry(async () => {
				// Get customer with basic expansion
				const customer = await this.stripe.customers.retrieve(
					customerId,
					{
						expand: ['default_source']
					}
				)

				// Get all subscriptions with pagination
				const subscriptions =
					await this.getAllSubscriptionsForCustomer(customerId)

				return {
					customer,
					subscriptions,
					hasActiveSubscription: subscriptions.some(
						sub => sub.status === 'active'
					)
				}
			})
		} catch (error) {
			await StripeErrorHandler.handleStripeError(
				error,
				'get_customer_with_subscriptions',
				{ customerId }
			)
		}
	}

	private async getAllSubscriptionsForCustomer(
		customerId: string
	): Promise<StripeSubscription[]> {
		const subscriptions: StripeSubscription[] = []
		let hasMore = true
		let startingAfter: string | undefined

		while (hasMore) {
			const response = await this.StripeSubscriptions.list({
				customer: customerId,
				limit: 100,
				starting_after: startingAfter,
				expand: ['data.items.data.price'],
				status: 'all'
			})

			subscriptions.push(...response.data)
			hasMore = response.has_more

			if (hasMore && response.data.length > 0) {
				startingAfter = response.data[response.data.length - 1].id
			}
		}

		return subscriptions
	}
}
```

## Related Documentation

- [Stripe Subscriptions Documentation](./stripe-subscription-docs.md)
- [Stripe Payment Objects](./stripe-payment-objects.md)
- [Stripe API Best Practices](./stripe-api-best-practices.md)
- [Core Stripe Objects](../types/stripe-core-objects.ts)
- [Payment Objects Types](../types/stripe-payment-objects.ts)
