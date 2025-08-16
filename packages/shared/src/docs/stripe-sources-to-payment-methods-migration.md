# Stripe Sources API to Payment Methods API Migration Guide

## Overview

The Stripe Sources API has been deprecated and should be replaced with the modern Payment Methods API. This guide documents the migration process for TenantFlow's codebase.

## What Changed

### Deprecated: Sources API

- `Customer.default_source` field
- `Invoice.default_source` field
- `Subscription.default_source` field
- Sources API endpoints and objects

### Modern: Payment Methods API

- `Customer.invoice_settings.default_payment_method` field
- `Invoice.default_payment_method` field
- `Subscription.default_payment_method` field
- Payment Methods API endpoints and objects

## Migration Steps

### 1. Customer Payment Method Checking

**Before (deprecated):**

```typescript
const hasPaymentMethod =
	customer && !customer.deleted && customer.default_source
```

**After (modern):**

```typescript
const hasPaymentMethod =
	customer &&
	!customer.deleted &&
	customer.invoice_settings?.default_payment_method

// Or check for any available payment methods
const paymentMethods = await stripe.paymentMethods.list({
	customer: customer.id,
	limit: 1
})
const hasPaymentMethod = paymentMethods.data.length > 0
```

### 2. Setting Default Payment Method

**Before (deprecated):**

```typescript
await stripe.customers.update(customerId, {
	default_source: sourceId
})
```

**After (modern):**

```typescript
await stripe.customers.update(customerId, {
	invoice_settings: {
		default_payment_method: paymentMethodId
	}
})
```

### 3. Retrieving Customer Payment Methods

**Before (deprecated):**

```typescript
const customer = await stripe.customers.retrieve(customerId, {
	expand: ['default_source']
})
```

**After (modern):**

```typescript
const customer = await stripe.customers.retrieve(customerId)
const paymentMethods = await stripe.paymentMethods.list({
	customer: customerId,
	type: 'card'
})
```

### 4. Creating Payment Methods

**Before (deprecated):**

```typescript
const source = await stripe.sources.create({
	type: 'card',
	token: tokenId
})

await stripe.customers.update(customerId, {
	default_source: source.id
})
```

**After (modern):**

```typescript
const paymentMethod = await stripe.paymentMethods.create({
	type: 'card',
	card: {
		token: tokenId
	}
})

await stripe.paymentMethods.attach(paymentMethod.id, {
	customer: customerId
})

await stripe.customers.update(customerId, {
	invoice_settings: {
		default_payment_method: paymentMethod.id
	}
})
```

## TenantFlow-Specific Changes

### 1. Webhook Service Updates

The webhook service in `/apps/backend/src/stripe/webhook.service.ts` has been updated to use the modern Payment Methods API:

```typescript
// Modern implementation
let hasPaymentMethod = false
if (customer && !customer.deleted) {
	if ((customer as StripeCustomer).invoice_settings?.default_payment_method) {
		hasPaymentMethod = true
	} else {
		try {
			const paymentMethods =
				await this.stripeService.client.paymentMethods.list({
					customer: customer.id,
					limit: 1
				})
			hasPaymentMethod = paymentMethods.data.length > 0
		} catch (error) {
			this.logger.warn(
				`Failed to check payment methods for customer ${customer.id}:`,
				error
			)
			hasPaymentMethod = false
		}
	}
}
```

### 2. Type Definition Updates

All deprecated `default_source` fields in type definitions now include deprecation warnings:

```typescript
/** @deprecated Use default_payment_method instead. Sources API is deprecated. */
readonly default_source?: string | null
```

### 3. Expansion Pattern Updates

Customer expansion patterns have been updated to remove deprecated fields:

```typescript
// Updated patterns
CUSTOMER_BASIC: [], // removed 'default_source'
CUSTOMER_SUBSCRIPTIONS: ['subscriptions'], // removed 'default_source'
CUSTOMER_DETAILED: ['subscriptions', 'tax_ids'], // removed 'default_source'
```

## Type Safety

The TenantFlow type definitions now properly mark deprecated fields:

```typescript
export interface StripeCustomer {
	// ... other fields

	/** @deprecated Use invoice_settings.default_payment_method instead. Sources API is deprecated. */
	readonly default_source?: string | null

	readonly invoice_settings?: {
		readonly default_payment_method?: string | null
		// ... other settings
	} | null
}
```

## Best Practices

### 1. Always Check Both Fields During Transition

```typescript
function getCustomerDefaultPaymentMethod(
	customer: StripeCustomer
): string | null {
	// Check modern field first
	if (customer.invoice_settings?.default_payment_method) {
		return customer.invoice_settings.default_payment_method
	}

	// Fallback to deprecated field for backward compatibility
	if (customer.default_source) {
		console.warn(
			'Using deprecated default_source field. Migrate to default_payment_method.'
		)
		return customer.default_source
	}

	return null
}
```

### 2. Use Payment Methods List for Comprehensive Checking

```typescript
async function hasAnyPaymentMethod(customerId: string): Promise<boolean> {
	try {
		const paymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			limit: 1
		})
		return paymentMethods.data.length > 0
	} catch (error) {
		console.error('Failed to check payment methods:', error)
		return false
	}
}
```

### 3. Handle Errors Gracefully

```typescript
async function ensurePaymentMethod(customerId: string): Promise<boolean> {
	try {
		const customer = await stripe.customers.retrieve(customerId)

		// Check if customer has default payment method
		if (customer.invoice_settings?.default_payment_method) {
			return true
		}

		// Check for any payment methods
		const paymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			limit: 1
		})

		return paymentMethods.data.length > 0
	} catch (error) {
		console.error(
			`Failed to check payment methods for customer ${customerId}:`,
			error
		)
		return false
	}
}
```

## Migration Checklist

- [x] ✅ Update webhook service to use Payment Methods API
- [x] ✅ Add deprecation warnings to type definitions
- [x] ✅ Update expansion patterns to remove deprecated fields
- [ ] 🔄 Update frontend code to use new payment method flow
- [ ] 🔄 Update subscription creation logic
- [ ] 🔄 Update customer update logic
- [ ] 🔄 Test payment method attachment flow
- [ ] 🔄 Update error handling for payment method operations

## Testing

### 1. Verify Payment Method Detection

```typescript
// Test that payment method detection works correctly
const customer = await stripe.customers.retrieve(customerId)
const hasPayment = await hasAnyPaymentMethod(customerId)
console.log('Customer has payment method:', hasPayment)
```

### 2. Test Subscription Creation

```typescript
// Ensure subscriptions work with Payment Methods API
const subscription = await StripeSubscriptions.create({
	customer: customerId,
	items: [{ price: priceId }],
	default_payment_method: paymentMethodId // Use this instead of default_source
})
```

### 3. Verify Webhook Processing

Test that webhook events process correctly with the updated payment method logic.

## Resources

- [Stripe Payment Methods API Documentation](https://docs.stripe.com/api/payment_methods)
- [Stripe Sources API Deprecation Notice](https://docs.stripe.com/sources)
- [Payment Methods vs Sources Comparison](https://docs.stripe.com/payments/payment-methods/migration-from-sources)

## Support

For questions about this migration, check:

1. TenantFlow's updated type definitions in `/packages/shared/src/types/stripe-*`
2. Updated webhook service in `/apps/backend/src/stripe/webhook.service.ts`
3. This migration guide for implementation patterns

This migration ensures TenantFlow uses modern, supported Stripe APIs while maintaining backward compatibility during the transition period.
