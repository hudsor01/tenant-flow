/**
 * Stripe Test Fixtures - Real API Integration Testing
 *
 * This class provides factory methods for creating real Stripe resources in test mode.
 * All created resources are tracked and automatically cleaned up after tests.
 *
 * IMPORTANT: Uses real Stripe API calls - no mocking. Requires STRIPE_SECRET_KEY
 * to be a test mode key (sk_test_*).
 *
 * Rate Limiting: Stripe test mode allows 100 req/sec. This class adds 50ms delays
 * between API calls to stay safely under the limit during bulk operations.
 *
 * @see https://stripe.com/docs/testing
 */

import Stripe from 'stripe'

/**
 * Test card numbers for various scenarios
 * @see https://stripe.com/docs/testing#cards
 */
export const TEST_CARDS = {
	/** Always succeeds */
	SUCCESS: '4242424242424242',
	/** Always declines */
	DECLINE: '4000000000000002',
	/** Requires 3D Secure authentication */
	REQUIRES_3DS: '4000002500003155',
	/** Insufficient funds decline */
	INSUFFICIENT_FUNDS: '4000000000009995',
	/** Expired card decline */
	EXPIRED_CARD: '4000000000000069',
	/** Processing error */
	PROCESSING_ERROR: '4000000000000119'
} as const

/**
 * Singleton class for managing Stripe test resources with automatic cleanup.
 *
 * Usage:
 * ```typescript
 * const fixtures = StripeTestFixtures.getInstance()
 * const customer = await fixtures.createCustomer('test@example.com')
 * // ... run tests ...
 * await fixtures.cleanup() // Deletes all created resources
 * ```
 */
export class StripeTestFixtures {
	private static instance: StripeTestFixtures | null = null

	private stripe: Stripe
	private createdCustomers = new Set<string>()
	private createdPaymentMethods = new Set<string>()
	private createdSubscriptions = new Set<string>()
	private createdTestClocks = new Set<string>()
	private createdPrices = new Set<string>()
	private createdProducts = new Set<string>()
	private createdConnectedAccounts = new Set<string>()

	/** Delay between API calls to respect rate limits (50ms = 20 req/sec, well under 100 limit) */
	private readonly rateLimitDelay = 50

	private constructor() {
		const secretKey = process.env.STRIPE_SECRET_KEY

		if (!secretKey) {
			throw new Error(
				'STRIPE_SECRET_KEY not found. Cannot initialize Stripe test fixtures.'
			)
		}

		if (!secretKey.startsWith('sk_test_')) {
			throw new Error(
				'STRIPE_SECRET_KEY must be a test mode key (sk_test_*). ' +
					'Production keys are not allowed in test fixtures.'
			)
		}

		this.stripe = new Stripe(secretKey, {
			apiVersion: '2025-04-30.basil',
			typescript: true
		})
	}

	/**
	 * Get the singleton instance of StripeTestFixtures.
	 * Creates a new instance if one doesn't exist.
	 */
	static getInstance(): StripeTestFixtures {
		if (!StripeTestFixtures.instance) {
			StripeTestFixtures.instance = new StripeTestFixtures()
		}
		return StripeTestFixtures.instance
	}

	/**
	 * Reset the singleton instance (useful for testing the fixtures themselves)
	 */
	static resetInstance(): void {
		StripeTestFixtures.instance = null
	}

	/**
	 * Get the underlying Stripe client for advanced operations.
	 */
	getStripeClient(): Stripe {
		return this.stripe
	}

	/**
	 * Rate-limited delay between API calls
	 */
	private async rateLimit(): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay))
	}

	/**
	 * Create a test customer in Stripe.
	 *
	 * @param email - Customer email address
	 * @param metadata - Optional metadata to attach to customer
	 * @returns Created Stripe customer object
	 */
	async createCustomer(
		email: string,
		metadata?: Record<string, string>
	): Promise<Stripe.Customer> {
		await this.rateLimit()

		const customer = await this.stripe.customers.create({
			email,
			metadata: {
				test_fixture: 'true',
				created_at: new Date().toISOString(),
				...metadata
			}
		})

		this.createdCustomers.add(customer.id)
		return customer
	}

	/**
	 * Create and attach a test payment method to a customer.
	 * Uses pm_card_visa (4242424242424242) by default.
	 *
	 * @param customerId - Stripe customer ID to attach payment method to
	 * @param cardToken - Test card token (default: pm_card_visa)
	 * @returns Attached payment method object
	 */
	async createPaymentMethod(
		customerId: string,
		cardToken: string = 'pm_card_visa'
	): Promise<Stripe.PaymentMethod> {
		await this.rateLimit()

		// Attach the test payment method token to the customer
		const paymentMethod = await this.stripe.paymentMethods.attach(cardToken, {
			customer: customerId
		})

		this.createdPaymentMethods.add(paymentMethod.id)

		// Set as default payment method
		await this.rateLimit()
		await this.stripe.customers.update(customerId, {
			invoice_settings: {
				default_payment_method: paymentMethod.id
			}
		})

		return paymentMethod
	}

	/**
	 * Create a test clock for simulating time-based subscription events.
	 *
	 * Test clocks allow advancing time to trigger subscription renewals,
	 * trials ending, and other time-based events without waiting.
	 *
	 * @param name - Name for the test clock (for identification)
	 * @param frozenTime - Optional initial frozen time (default: now)
	 * @returns Created test clock object
	 *
	 * @see https://stripe.com/docs/billing/testing/test-clocks
	 */
	async createTestClock(
		name: string,
		frozenTime?: number
	): Promise<Stripe.TestHelpers.TestClock> {
		await this.rateLimit()

		const testClock = await this.stripe.testHelpers.testClocks.create({
			frozen_time: frozenTime ?? Math.floor(Date.now() / 1000),
			name: `test-fixture-${name}-${Date.now()}`
		})

		this.createdTestClocks.add(testClock.id)
		return testClock
	}

	/**
	 * Create a recurring price for subscription testing.
	 *
	 * @param unitAmount - Price in cents (e.g., 1500 = $15.00)
	 * @param currency - Currency code (default: 'usd')
	 * @param interval - Billing interval (default: 'month')
	 * @returns Created price object
	 */
	async createPrice(
		unitAmount: number,
		currency: string = 'usd',
		interval: 'day' | 'week' | 'month' | 'year' = 'month'
	): Promise<Stripe.Price> {
		await this.rateLimit()

		// Create a product first
		const product = await this.stripe.products.create({
			name: `Test Product ${Date.now()}`,
			metadata: {
				test_fixture: 'true'
			}
		})
		this.createdProducts.add(product.id)

		await this.rateLimit()

		const price = await this.stripe.prices.create({
			unit_amount: unitAmount,
			currency,
			recurring: { interval },
			product: product.id,
			metadata: {
				test_fixture: 'true'
			}
		})

		this.createdPrices.add(price.id)
		return price
	}

	/**
	 * Create a subscription for a customer.
	 *
	 * @param customerId - Stripe customer ID
	 * @param priceId - Stripe price ID
	 * @param testClockId - Optional test clock ID to attach subscription to
	 * @returns Created subscription object
	 */
	async createSubscription(
		customerId: string,
		priceId: string,
		testClockId?: string
	): Promise<Stripe.Subscription> {
		await this.rateLimit()

		const subscriptionParams: Stripe.SubscriptionCreateParams = {
			customer: customerId,
			items: [{ price: priceId }],
			metadata: {
				test_fixture: 'true'
			}
		}

		// If using a test clock, the customer must be associated with it
		// This is done when creating the customer, not here
		if (testClockId) {
			// Customer should already be attached to test clock
			// Just note it in metadata for debugging
			subscriptionParams.metadata!.test_clock_id = testClockId
		}

		const subscription = await this.stripe.subscriptions.create(
			subscriptionParams
		)

		this.createdSubscriptions.add(subscription.id)
		return subscription
	}

	/**
	 * Create a customer attached to a test clock.
	 * Required for subscription testing with time manipulation.
	 *
	 * @param email - Customer email
	 * @param testClockId - Test clock to attach customer to
	 * @param metadata - Optional additional metadata
	 * @returns Created customer attached to test clock
	 */
	async createCustomerWithTestClock(
		email: string,
		testClockId: string,
		metadata?: Record<string, string>
	): Promise<Stripe.Customer> {
		await this.rateLimit()

		const customer = await this.stripe.customers.create({
			email,
			test_clock: testClockId,
			metadata: {
				test_fixture: 'true',
				test_clock_id: testClockId,
				created_at: new Date().toISOString(),
				...metadata
			}
		})

		this.createdCustomers.add(customer.id)
		return customer
	}

	/**
	 * Create a test Express connected account.
	 *
	 * @param country - Country code (default: 'US')
	 * @param metadata - Optional metadata
	 * @returns Created connected account
	 */
	async createConnectedAccount(
		country: string = 'US',
		metadata?: Record<string, string>
	): Promise<Stripe.Account> {
		await this.rateLimit()

		const account = await this.stripe.accounts.create({
			type: 'express',
			country,
			metadata: {
				test_fixture: 'true',
				created_at: new Date().toISOString(),
				...metadata
			},
			capabilities: {
				card_payments: { requested: true },
				transfers: { requested: true }
			}
		})

		this.createdConnectedAccounts.add(account.id)
		return account
	}

	/**
	 * Advance a test clock to a future time.
	 *
	 * @param testClockId - Test clock ID to advance
	 * @param toTimestamp - Unix timestamp to advance to
	 * @returns Updated test clock object
	 */
	async advanceTestClock(
		testClockId: string,
		toTimestamp: number
	): Promise<Stripe.TestHelpers.TestClock> {
		await this.rateLimit()

		const testClock = await this.stripe.testHelpers.testClocks.advance(
			testClockId,
			{
				frozen_time: toTimestamp
			}
		)

		// Wait for Stripe to process time-based events
		// Test clocks can take 1-2 seconds to trigger webhooks
		await new Promise(resolve => setTimeout(resolve, 2000))

		return testClock
	}

	/**
	 * Get cleanup statistics without actually cleaning up.
	 */
	getStats(): {
		customers: number
		paymentMethods: number
		subscriptions: number
		testClocks: number
		prices: number
		products: number
		connectedAccounts: number
	} {
		return {
			customers: this.createdCustomers.size,
			paymentMethods: this.createdPaymentMethods.size,
			subscriptions: this.createdSubscriptions.size,
			testClocks: this.createdTestClocks.size,
			prices: this.createdPrices.size,
			products: this.createdProducts.size,
			connectedAccounts: this.createdConnectedAccounts.size
		}
	}

	/**
	 * Clean up all created resources in reverse dependency order.
	 *
	 * Order: subscriptions → payment methods → customers → test clocks → prices → products → connected accounts
	 *
	 * Errors are logged but don't stop cleanup of remaining resources.
	 */
	async cleanup(): Promise<{
		deleted: number
		errors: number
	}> {
		let deleted = 0
		let errors = 0

		// Cancel subscriptions first
		for (const id of this.createdSubscriptions) {
			try {
				await this.rateLimit()
				await this.stripe.subscriptions.cancel(id)
				deleted++
			} catch (error) {
				// Subscription may already be canceled or not exist
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(`Failed to cancel subscription ${id}:`, error.message)
					errors++
				}
			}
		}
		this.createdSubscriptions.clear()

		// Detach payment methods
		for (const id of this.createdPaymentMethods) {
			try {
				await this.rateLimit()
				await this.stripe.paymentMethods.detach(id)
				deleted++
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(`Failed to detach payment method ${id}:`, error.message)
					errors++
				}
			}
		}
		this.createdPaymentMethods.clear()

		// Delete customers
		for (const id of this.createdCustomers) {
			try {
				await this.rateLimit()
				await this.stripe.customers.del(id)
				deleted++
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(`Failed to delete customer ${id}:`, error.message)
					errors++
				}
			}
		}
		this.createdCustomers.clear()

		// Delete test clocks
		for (const id of this.createdTestClocks) {
			try {
				await this.rateLimit()
				await this.stripe.testHelpers.testClocks.del(id)
				deleted++
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(`Failed to delete test clock ${id}:`, error.message)
					errors++
				}
			}
		}
		this.createdTestClocks.clear()

		// Archive prices (can't delete, but can deactivate)
		for (const id of this.createdPrices) {
			try {
				await this.rateLimit()
				await this.stripe.prices.update(id, { active: false })
				deleted++
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(`Failed to archive price ${id}:`, error.message)
					errors++
				}
			}
		}
		this.createdPrices.clear()

		// Archive products
		for (const id of this.createdProducts) {
			try {
				await this.rateLimit()
				await this.stripe.products.update(id, { active: false })
				deleted++
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(`Failed to archive product ${id}:`, error.message)
					errors++
				}
			}
		}
		this.createdProducts.clear()

		// Delete connected accounts
		for (const id of this.createdConnectedAccounts) {
			try {
				await this.rateLimit()
				await this.stripe.accounts.del(id)
				deleted++
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeError &&
					error.code !== 'resource_missing'
				) {
					console.warn(
						`Failed to delete connected account ${id}:`,
						error.message
					)
					errors++
				}
			}
		}
		this.createdConnectedAccounts.clear()

		return { deleted, errors }
	}
}

/**
 * Singleton instance for convenient access.
 * Use this in tests instead of calling getInstance() repeatedly.
 */
export const stripeFixtures = StripeTestFixtures.getInstance()
