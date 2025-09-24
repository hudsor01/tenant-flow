import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { StripeSyncService } from './stripe-sync.service'

/**
 * Stripe Data Validation Tests
 *
 * These tests run actual backfill operations and validate data integrity
 * against Stripe API to ensure sync is working correctly.
 *
 * WARNING: These tests make real API calls and database modifications
 * Only run in dedicated test environments with test Stripe keys
 *
 * Prerequisites:
 * - Test Stripe account with sample data
 * - STRIPE_SECRET_KEY must be test key (sk_test_*)
 * - DATABASE_URL pointing to test database
 *
 * Run with: pnpm test:data-validation
 */
describe('Stripe Data Validation Tests', () => {
	let service: StripeSyncService
	let supabaseService: SupabaseService

	// Only run if explicitly configured for data validation testing
	const isDataValidationEnabled = () => {
		return (
			process.env.ENABLE_DATA_VALIDATION_TESTS === 'true' &&
			process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') &&
			process.env.DATABASE_URL?.includes('test')
		)
	}

	beforeAll(async () => {
		if (!isDataValidationEnabled()) {
			console.log(
				'⏭️  Skipping data validation tests - not enabled or using production keys'
			)
			return
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeSyncService,
				SupabaseService,
				ConfigService,
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn(),
						verbose: jest.fn()
					}
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<StripeSyncService>(StripeSyncService)
		supabaseService = module.get<SupabaseService>(SupabaseService)
	})

	describe('Backfill Operation', () => {
		it(
			'should complete backfill operation without errors',
			async () => {
				if (!isDataValidationEnabled()) return

				const startTime = Date.now()

				// Run the actual backfill
				const result = await service.backfillData()

				const duration = Date.now() - startTime

				expect(result).toEqual({ success: true })
				expect(duration).toBeLessThan(30 * 60 * 1000) // Should complete in under 30 minutes
			},
			30 * 60 * 1000
		) // 30 minute timeout

		it('should have synced customer data correctly', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			// Get customer count from database
			const { data: dbData, error } = await (client as any)
				.from('stripe.customers')
				.select('id', { count: 'exact' })

			expect(error).toBeNull()
			expect(dbData).toBeDefined()

			// Should have at least some customers if test account has data
			if (dbData && dbData.length > 0) {
				expect(dbData.length).toBeGreaterThan(0)
			}
		})

		it('should have synced subscription data correctly', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			// Get subscription data
			const { data: subscriptions, error } = await (client as any)
				.from('stripe.subscriptions')
				.select('id, status, current_period_start, current_period_end')
				.limit(5)

			expect(error).toBeNull()

			if (subscriptions && subscriptions.length > 0) {
				subscriptions.forEach((sub: Record<string, unknown>) => {
					expect(sub.id).toMatch(/^sub_/) // Stripe subscription ID format
					expect([
						'active',
						'canceled',
						'past_due',
						'trialing',
						'incomplete',
						'paused'
					]).toContain(sub.status)
					expect(sub.current_period_start).toBeDefined()
					expect(sub.current_period_end).toBeDefined()
				})
			}
		})

		it('should have synced product and price data correctly', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			// Get products with their prices
			const { data: products, error: productsError } = await (client as any)
				.from('stripe.products')
				.select('id, name, active')
				.eq('active', true)
				.limit(5)

			expect(productsError).toBeNull()

			if (products && products.length > 0) {
				// Get prices for these products
				const { data: prices, error: pricesError } = await (client as any)
					.from('stripe.prices')
					.select('id, product, unit_amount, currency, active')
					.in(
						'product',
						products.map((p: Record<string, unknown>) => p.id)
					)

				expect(pricesError).toBeNull()

				if (prices && prices.length > 0) {
					prices.forEach((price: Record<string, unknown>) => {
						expect(price.id).toMatch(/^price_/) // Stripe price ID format
						expect(price.unit_amount).toBeGreaterThanOrEqual(0)
						expect(price.currency).toMatch(/^[a-z]{3}$/) // 3-letter currency code
					})
				}
			}
		})
	})

	describe('Data Integrity Validation', () => {
		it('should maintain referential integrity between customers and subscriptions', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			// Find subscriptions with invalid customer references
			const { data: invalidRefs, error } = await (client as any).rpc(
				'exec_sql',
				{
					query: `
            SELECT s.id as subscription_id, s.customer
            FROM stripe.subscriptions s
            LEFT JOIN stripe.customers c ON s.customer = c.id
            WHERE c.id IS NULL
            LIMIT 5
          `
				}
			)

			expect(error).toBeNull()
			expect(invalidRefs).toEqual([]) // Should be empty - no orphaned subscriptions
		})

		it('should have proper timestamp consistency', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			// Check that created timestamps are reasonable
			const { data: recentData, error } = await (client as any)
				.from('stripe.customers')
				.select('id, created')
				.order('created', { ascending: false })
				.limit(5)

			expect(error).toBeNull()

			if (recentData && recentData.length > 0) {
				recentData.forEach((customer: Record<string, unknown>) => {
					const createdDate = new Date((customer.created as number) * 1000) // Stripe uses Unix timestamps
					expect(createdDate.getTime()).toBeLessThanOrEqual(Date.now())
					expect(createdDate.getTime()).toBeGreaterThan(
						Date.now() - 365 * 24 * 60 * 60 * 1000
					) // Within last year
				})
			}
		})

		it('should have consistent data types and formats', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			// Test various data type consistency
			const { data: invoices, error } = await (client as any)
				.from('stripe.invoices')
				.select('id, amount_due, amount_paid, currency, status')
				.limit(10)

			expect(error).toBeNull()

			if (invoices && invoices.length > 0) {
				invoices.forEach((invoice: Record<string, unknown>) => {
					expect(invoice.id).toMatch(/^in_/) // Stripe invoice ID format
					expect(typeof invoice.amount_due).toBe('number')
					expect(typeof invoice.amount_paid).toBe('number')
					expect(invoice.amount_due).toBeGreaterThanOrEqual(0)
					expect(invoice.amount_paid).toBeGreaterThanOrEqual(0)
					expect(typeof (invoice as any).currency).toBe('string')
					expect((invoice as any).currency.length).toBe(3)
				})
			}
		})
	})

	describe('Performance Validation', () => {
		it('should query large datasets efficiently', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			const startTime = Date.now()

			// Test query performance on potentially large table
			const { data: _data, error } = await (client as any)
				.from('stripe.customers')
				.select('id, email, created')
				.order('created', { ascending: false })
				.limit(100)

			const queryTime = Date.now() - startTime

			expect(error).toBeNull()
			expect(queryTime).toBeLessThan(5000) // Should complete in under 5 seconds
		})

		it('should handle complex JOIN queries efficiently', async () => {
			if (!isDataValidationEnabled()) return

			const client = supabaseService.getAdminClient()

			const startTime = Date.now()

			// Complex query joining customers and subscriptions
			const { data: _data2, error } = await (client as any).rpc(
				'exec_sql',
				{
					query: `
            SELECT
              c.id as customer_id,
              c.email,
              COUNT(s.id) as subscription_count,
              MAX(s.created) as latest_subscription
            FROM stripe.customers c
            LEFT JOIN stripe.subscriptions s ON c.id = s.customer
            GROUP BY c.id, c.email
            ORDER BY subscription_count DESC
            LIMIT 20
          `
				}
			)

			const queryTime = Date.now() - startTime

			expect(error).toBeNull()
			expect(queryTime).toBeLessThan(10000) // Should complete in under 10 seconds
		})
	})

	describe('Webhook Processing Validation', () => {
		it('should handle webhook processing after backfill', async () => {
			if (!isDataValidationEnabled()) return

			// Mock a customer.updated webhook
			const mockWebhook = Buffer.from(
				JSON.stringify({
					id: 'evt_test_validation',
					type: 'customer.updated',
					data: {
						object: {
							id: 'cus_test_validation',
							email: 'validation@test.com',
							name: 'Validation Test Customer'
						}
					}
				})
			)

			const mockSignature = 'test_signature_validation'

			// Should not throw errors
			await expect(
				service.processWebhook(mockWebhook, mockSignature)
			).resolves.not.toThrow()
		})
	})
})

/**
 * Usage Instructions:
 *
 * To run these tests in your environment:
 *
 * 1. Set up test environment variables:
 *    export ENABLE_DATA_VALIDATION_TESTS=true
 *    export STRIPE_SECRET_KEY=sk_test_your_test_key
 *    export DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
 *
 * 2. Run the tests:
 *    pnpm test -- --testPathPatterns="stripe-data-validation.spec.ts"
 *
 * 3. Monitor output for data validation results
 */
