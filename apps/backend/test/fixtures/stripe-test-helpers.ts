/**
 * Stripe Test Helpers - High-Level Testing Utilities
 *
 * Provides convenient wrapper functions for common test scenarios using StripeTestFixtures.
 * These helpers handle setup, teardown, and resource management automatically.
 *
 * @example
 * ```typescript
 * await withStripeTestCustomer('test@example.com', async (customer) => {
 *   // Test with real Stripe customer
 *   expect(customer.email).toBe('test@example.com')
 * }) // Customer automatically cleaned up
 * ```
 */

import Stripe from 'stripe'
import {
	StripeTestFixtures,
	stripeFixtures,
	TEST_CARDS
} from './stripe-test-fixtures'

export { stripeFixtures, TEST_CARDS }

/**
 * Run a test with a real Stripe customer, handling cleanup automatically.
 *
 * @param email - Email for the test customer
 * @param fn - Test function receiving the created customer
 *
 * @example
 * ```typescript
 * await withStripeTestCustomer('user@test.com', async (customer) => {
 *   expect(customer.id).toMatch(/^cus_/)
 *   // Customer will be deleted after this block
 * })
 * ```
 */
export async function withStripeTestCustomer(
	email: string,
	fn: (customer: Stripe.Customer) => Promise<void>
): Promise<void> {
	const customer = await stripeFixtures.createCustomer(email)
	try {
		await fn(customer)
	} finally {
		// Cleanup will happen via globalTeardown, but we can also do it here
		// for tests that need immediate cleanup
		try {
			await stripeFixtures.getStripeClient().customers.del(customer.id)
		} catch {
			// Ignore - globalTeardown will handle it
		}
	}
}

/**
 * Run a test with a full subscription setup including test clock.
 * Creates: test clock → customer → payment method → price → subscription
 *
 * @param email - Email for the test customer
 * @param fn - Test function receiving subscription and test clock
 *
 * @example
 * ```typescript
 * await withStripeSubscription('user@test.com', async (sub, testClock) => {
 *   expect(sub.status).toBe('active')
 *
 *   // Advance time by 1 month to trigger renewal
 *   await advanceTestClock(testClock.id, testClock.frozen_time + 30 * 24 * 60 * 60)
 * })
 * ```
 */
export async function withStripeSubscription(
	email: string,
	fn: (
		subscription: Stripe.Subscription,
		testClock: Stripe.TestHelpers.TestClock,
		customer: Stripe.Customer
	) => Promise<void>
): Promise<void> {
	// Create test clock first
	const testClock = await stripeFixtures.createTestClock(`sub-test-${email}`)

	// Create customer attached to test clock
	const customer = await stripeFixtures.createCustomerWithTestClock(
		email,
		testClock.id
	)

	// Attach payment method
	await stripeFixtures.createPaymentMethod(customer.id)

	// Create price (reusable, will be archived on cleanup)
	const price = await stripeFixtures.createPrice(1500, 'usd', 'month')

	// Create subscription
	const subscription = await stripeFixtures.createSubscription(
		customer.id,
		price.id,
		testClock.id
	)

	try {
		await fn(subscription, testClock, customer)
	} finally {
		// Cleanup handled by globalTeardown
	}
}

/**
 * Advance a test clock to a future timestamp.
 * Includes a 2-second wait for Stripe to process time-based events.
 *
 * @param testClockId - Test clock ID to advance
 * @param toTimestamp - Unix timestamp to advance to
 * @returns Updated test clock
 *
 * @example
 * ```typescript
 * // Advance 30 days
 * const futureTime = testClock.frozen_time + 30 * 24 * 60 * 60
 * await advanceTestClock(testClock.id, futureTime)
 * // Subscription renewal webhook should now be triggered
 * ```
 */
export async function advanceTestClock(
	testClockId: string,
	toTimestamp: number
): Promise<Stripe.TestHelpers.TestClock> {
	return stripeFixtures.advanceTestClock(testClockId, toTimestamp)
}

/**
 * Generate a signed webhook payload for testing webhook handlers.
 *
 * @param eventType - Stripe event type (e.g., 'customer.created')
 * @param data - Event data object
 * @param secret - Webhook signing secret (uses env var if not provided)
 * @returns Object with payload string and signature header
 *
 * @example
 * ```typescript
 * const { payload, signature } = simulateWebhookEvent('customer.created', {
 *   object: customer
 * })
 *
 * const response = await request(app)
 *   .post('/api/v1/billing/webhook')
 *   .set('stripe-signature', signature)
 *   .send(payload)
 * ```
 */
export function simulateWebhookEvent(
	eventType: string,
	data: { object: unknown; previous_attributes?: unknown },
	secret?: string
): { payload: string; signature: string } {
	const stripe = stripeFixtures.getStripeClient()
	const webhookSecret = secret ?? process.env.STRIPE_WEBHOOK_SECRET

	if (!webhookSecret) {
		throw new Error(
			'STRIPE_WEBHOOK_SECRET not found. Required for webhook simulation.'
		)
	}

	const timestamp = Math.floor(Date.now() / 1000)

	const event: Stripe.Event = {
		id: `evt_test_${Date.now()}`,
		object: 'event',
		api_version: '2025-04-30.basil',
		created: timestamp,
		type: eventType as Stripe.Event['type'],
		data: {
			object: data.object as Stripe.Event.Data['object'],
			previous_attributes: data.previous_attributes
		},
		livemode: false,
		pending_webhooks: 0,
		request: {
			id: `req_test_${Date.now()}`,
			idempotency_key: null
		}
	}

	const payload = JSON.stringify(event)

	// Generate signature using Stripe's webhook signature scheme
	const signature = stripe.webhooks.generateTestHeaderString({
		payload,
		secret: webhookSecret,
		timestamp
	})

	return { payload, signature }
}

/**
 * Create a webhook event object for direct handler testing.
 * Use this when testing webhook processor directly without HTTP layer.
 *
 * @param eventType - Stripe event type
 * @param data - Event data object
 * @returns Stripe.Event object
 */
export function createWebhookEvent(
	eventType: string,
	data: { object: unknown; previous_attributes?: unknown }
): Stripe.Event {
	return {
		id: `evt_test_${Date.now()}`,
		object: 'event',
		api_version: '2025-04-30.basil',
		created: Math.floor(Date.now() / 1000),
		type: eventType as Stripe.Event['type'],
		data: {
			object: data.object as Stripe.Event.Data['object'],
			previous_attributes: data.previous_attributes
		},
		livemode: false,
		pending_webhooks: 0,
		request: {
			id: `req_test_${Date.now()}`,
			idempotency_key: null
		}
	}
}

/**
 * Wait for a condition to be true, useful for async webhook processing.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait (default: 10000ms)
 * @param intervalMs - Check interval (default: 500ms)
 * @throws Error if timeout reached before condition is true
 *
 * @example
 * ```typescript
 * // Wait for database to be updated by webhook
 * await waitForCondition(async () => {
 *   const { data } = await supabase.from('customers').select().eq('stripe_id', customer.id)
 *   return data !== null && data.length > 0
 * })
 * ```
 */
export async function waitForCondition(
	condition: () => Promise<boolean>,
	timeoutMs: number = 10000,
	intervalMs: number = 500
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeoutMs) {
		if (await condition()) {
			return
		}
		await new Promise(resolve => setTimeout(resolve, intervalMs))
	}

	throw new Error(`Condition not met within ${timeoutMs}ms timeout`)
}

/**
 * Helper to check if Stripe test mode is available.
 * Use this in describe.skipIf() to skip tests when Stripe not configured.
 */
export function isStripeTestModeAvailable(): boolean {
	const secretKey = process.env.STRIPE_SECRET_KEY
	return Boolean(secretKey && secretKey.startsWith('sk_test_'))
}

/**
 * Skip message for tests requiring Stripe test mode.
 */
export const STRIPE_SKIP_MESSAGE =
	'Skipping: STRIPE_SECRET_KEY not available or not in test mode'
