# Stripe API Best Practices for TenantFlow

This documentation covers essential Stripe API concepts and best practices that ensure reliable, production-ready integration.

## Idempotent Requests

Idempotency allows you to safely retry requests without duplicating operations, crucial for handling network errors and preventing accidental double-creation of objects.

### How Idempotency Works

- Stripe saves the resulting status code and body of the first request
- Subsequent requests with the same key return identical results
- Keys are automatically removed after 24 hours
- Prevents duplicate operations by comparing original request parameters

### Implementation Guidelines

**Use idempotency keys for:**

- All `POST` requests (creating objects)
- Critical `PUT`/`PATCH` requests (updating important data)

**Do NOT use for:**

- `GET` requests (already idempotent)
- `DELETE` requests (already idempotent)

### Best Practices

```typescript
import { v4 as uuidv4 } from 'uuid'

// Generate unique idempotency keys
const createCustomer = async (userData: CustomerData) => {
	const idempotencyKey = uuidv4() // Recommended: UUID v4

	return await stripe.customers.create(
		{
			email: userData.email,
			name: userData.name,
			metadata: {
				tenantflow_user_id: userData.id,
				tenantflow_environment: process.env.NODE_ENV
			}
		},
		{
			idempotencyKey
		}
	)
}

// Alternative: Use operation-specific keys
const createSubscription = async (userId: string, priceId: string) => {
	const idempotencyKey = `subscription_${userId}_${priceId}_${Date.now()}`

	return await StripeSubscriptions.create(
		{
			customer: customerId,
			items: [{ price: priceId }],
			metadata: {
				tenantflow_user_id: userId,
				tenantflow_operation: 'subscription_creation'
			}
		},
		{
			idempotencyKey
		}
	)
}
```

### Key Constraints

- **Length**: Up to 255 characters
- **Uniqueness**: Must have enough entropy to avoid collisions
- **Timing**: Keys expire after 24 hours
- **Validation**: Keys are not saved if request fails validation

## Metadata Management

Metadata allows you to store additional structured information on Stripe objects for tracking and integration purposes.

### Constraints

- **Keys**: Up to 50 metadata keys per object
- **Key names**: Maximum 40 characters
- **Key values**: Maximum 500 characters
- **Storage**: All keys and values stored as strings
- **Prohibited**: Square brackets `[` and `]` in key names

### Security Guidelines

**✅ Safe to store:**

- Internal user IDs
- Order numbers
- Plan types and billing cycles
- Feature flags
- Environment indicators
- Correlation IDs for debugging

**❌ NEVER store:**

- Bank account details
- Credit card numbers
- Social security numbers
- Passwords or API keys
- Personal identification numbers

### TenantFlow Metadata Standards

```typescript
// Standard metadata interface for TenantFlow
interface TenantFlowMetadata {
	// Core identifiers
	tenantflow_user_id: string // TenantFlow user ID
	tenantflow_organization_id: string // Organization ID
	tenantflow_environment: 'development' | 'staging' | 'production'

	// Business context
	tenantflow_plan_type?: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
	tenantflow_billing_cycle?: 'monthly' | 'annual'
	tenantflow_operation?: string // Operation that triggered creation

	// Tracking and debugging
	tenantflow_correlation_id?: string // Request correlation ID
	tenantflow_created_by?: string // User who initiated action
	tenantflow_source?: string // Source system or feature
	tenantflow_version?: string // Application version
	tenantflow_feature_flag?: string // Active feature flags
}

// Usage example
const createStripeCustomer = async (user: User) => {
	return await stripe.customers.create({
		email: user.email,
		name: user.name,
		metadata: {
			tenantflow_user_id: user.id,
			tenantflow_organization_id: user.organizationId,
			tenantflow_environment: process.env.NODE_ENV as
				| 'development'
				| 'staging'
				| 'production',
			tenantflow_created_by: user.id,
			tenantflow_source: 'user_registration',
			tenantflow_version: process.env.APP_VERSION || 'unknown'
		}
	})
}
```

## Request IDs

Every Stripe API request receives a unique Request ID that helps with debugging and support.

### Accessing Request IDs

```typescript
// TypeScript/Node.js example
try {
	const customer = await stripe.customers.create({
		email: 'customer@example.com',
		metadata: {
			tenantflow_user_id: 'user_123'
		}
	})

	// Access request ID from the response
	const requestId = customer.lastResponse?.requestId
	console.log('Request ID:', requestId)
} catch (error) {
	// Log request ID for failed requests
	if (error.requestId) {
		console.error('Failed request ID:', error.requestId)
		// Include in error reporting
		await logError({
			error,
			stripeRequestId: error.requestId,
			operation: 'customer_creation'
		})
	}
}
```

### Request ID Best Practices

1. **Always log Request IDs** for failed operations
2. **Include in error reports** for debugging
3. **Store with critical operations** for audit trails
4. **Provide to Stripe Support** when requesting help

```typescript
// Enhanced error handling with Request IDs
class StripeErrorHandler {
	static async handleError(error: Stripe.StripeError, operation: string) {
		const errorDetails = {
			operation,
			stripeRequestId: error.requestId,
			errorType: error.type,
			errorCode: error.code,
			message: error.message,
			timestamp: new Date().toISOString()
		}

		// Log for debugging
		console.error('Stripe operation failed:', errorDetails)

		// Send to monitoring service
		await this.sendToMonitoring(errorDetails)

		// Store in database for audit
		await this.auditStripeError(errorDetails)

		return errorDetails
	}

	private static async sendToMonitoring(details: any) {
		// Send to Sentry, DataDog, etc.
	}

	private static async auditStripeError(details: any) {
		// Store in audit log table
	}
}
```

## Customer Sessions

Customer Sessions provide secure, limited access for client-side operations without exposing sensitive customer data.

### Use Cases

- **Client-side payment forms** - Secure payment element integration
- **Self-service portals** - Limited customer operations
- **Pricing tables** - Dynamic pricing display
- **Buy buttons** - One-click purchase flows

### Implementation

```typescript
// Create customer session for payment element
const createPaymentSession = async (customerId: string) => {
	return await stripe.customerSessions.create({
		customer: customerId,
		components: {
			payment_element: {
				enabled: true,
				features: {
					payment_method_save: 'enabled',
					payment_method_remove: 'enabled',
					payment_method_redisplay: 'enabled'
				}
			}
		}
	})
}

// Create session for pricing table
const createPricingSession = async (customerId: string) => {
	return await stripe.customerSessions.create({
		customer: customerId,
		components: {
			pricing_table: {
				enabled: true
			}
		}
	})
}

// Frontend usage
const initializePaymentElement = async (clientSecret: string) => {
	const stripe = await loadStripe(
		process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
	)

	const elements = stripe.elements({
		clientSecret, // From customer session
		appearance: {
			theme: 'stripe'
		}
	})

	const paymentElement = elements.create('payment')
	paymentElement.mount('#payment-element')
}
```

### Security Considerations

- **Client secrets expire** - Generate new sessions as needed
- **Limited scope** - Sessions only access specified components
- **No sensitive data** - Customer data remains on Stripe's servers
- **Production keys** - Always use live keys in production

## Error Handling & Retry Logic

Implement robust error handling for production reliability.

```typescript
class StripeService {
	private async retryWithBackoff<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000
	): Promise<T> {
		let lastError: Error

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error

				// Don't retry on certain errors
				if (
					error.type === 'card_error' ||
					error.type === 'invalid_request_error'
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

		throw lastError!
	}

	async createCustomerWithRetry(customerData: any, idempotencyKey: string) {
		return this.retryWithBackoff(async () => {
			return await stripe.customers.create(customerData, {
				idempotencyKey
			})
		})
	}
}
```

## Production Checklist

### Before Going Live

- [ ] **Environment variables** - All keys properly configured
- [ ] **Webhook endpoints** - Properly secured and tested
- [ ] **Error handling** - Comprehensive error catching and logging
- [ ] **Idempotency keys** - Implemented for all critical operations
- [ ] **Request ID logging** - Included in all error reports
- [ ] **Metadata standards** - Consistent across all objects
- [ ] **Rate limiting** - Proper backoff and retry logic
- [ ] **Security review** - No sensitive data in metadata
- [ ] **Test coverage** - All payment flows thoroughly tested

### Monitoring & Alerting

- **Failed webhook processing**
- **Subscription status changes**
- **Payment failures and retries**
- **API error rates and patterns**
- **Customer churn indicators**

## Related Documentation

- [Stripe API Reference](https://stripe.com/docs/api)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing](https://stripe.com/docs/testing)
- [Error Codes](https://stripe.com/docs/error-codes)
