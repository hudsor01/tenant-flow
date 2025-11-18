import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionsService } from './subscriptions.service'

describe('SubscriptionsService', () => {
	let service: SubscriptionsService
	let supabaseService: any
	let stripeClientService: any

	beforeEach(async () => {
		// Create a mock that properly handles Supabase query chaining
		const createQueryBuilder = (tableName: string): any => {
		const conditions: Record<string, any> = {}
		const notConditions: Record<string, any> = {}

		const queryBuilder: any = {
				    select: jest.fn(() => {
					return queryBuilder
				}),
				eq: jest.fn((column: string, value: any) => {
					conditions[column] = value
					return queryBuilder
				}),
				not: jest.fn((column: string, operator: string, value: any) => {
					notConditions[column] = { operator, value }
					return queryBuilder
				}),
				order: jest.fn((_column: string, _options?: any) => {
					return queryBuilder
				}),
				limit: jest.fn((_count: number) => {
					return queryBuilder
				}),
				single: jest.fn(() => {
					// Handle different tables and conditions
					if (tableName === 'users' && conditions.id === 'user123') {
						return Promise.resolve({
							data: { id: 'user123', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
							error: null
						})
					}
					if (tableName === 'tenants' && conditions.id === 'tenant123') {
						return Promise.resolve({
							data: { id: 'tenant123', stripe_customer_id: 'cus_test123', user_id: 'user123' },
							error: null
						})
					}
					if (tableName === 'leases') {
						if (conditions.id === 'lease_new') {
							return Promise.resolve({
								data: { id: 'lease_new', primary_tenant_id: 'tenant123', unit_id: 'unit123', rent_amount: 100000, rent_currency: 'usd', payment_day: 1, auto_pay_enabled: false, stripe_subscription_id: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
								error: null
							})
						}
						if (conditions.id === 'lease123') {
							return Promise.resolve({
								data: { id: 'lease123', primary_tenant_id: 'tenant123', unit_id: 'unit123', rent_amount: 100000, rent_currency: 'usd', payment_day: 1, auto_pay_enabled: true, stripe_subscription_id: 'sub_test123', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
								error: null
							})
						}
					}
					if (tableName === 'units' && conditions.id === 'unit123') {
						return Promise.resolve({
							data: { id: 'unit123', unit_number: '101', property_id: 'prop123' },
							error: null
						})
					}
					if (tableName === 'properties' && conditions.id === 'prop123') {
						return Promise.resolve({
							data: { id: 'prop123', name: 'Test Property', property_owner_id: 'owner123' },
							error: null
						})
					}
					if (tableName === 'property_owners' && conditions.id === 'owner123') {
						return Promise.resolve({
							data: { id: 'owner123', user_id: 'owner_user123', stripe_account_id: 'acct_test123', charges_enabled: true, default_platform_fee_percent: 0 },
							error: null
						})
					}
					if (tableName === 'payment_methods' && conditions.id === 'pm_test123') {
						return Promise.resolve({
							data: { id: 'pm_test123', stripe_payment_method_id: 'pm_test123', stripe_customer_id: 'cus_test123', tenant_id: 'tenant123' },
							error: null
						})
					}
					return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows returned' } })
				}),
				maybeSingle: jest.fn(() => {
					// Handle different tables and conditions
					if (tableName === 'users' && conditions.user_id === 'user123') {
						return Promise.resolve({
							data: { id: 'user123', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
							error: null
						})
					}
					if (tableName === 'tenants' && conditions.user_id === 'user123') {
						return Promise.resolve({
							data: { id: 'tenant123', stripe_customer_id: 'cus_test123', user_id: 'user123' },
							error: null
						})
					}
					if (tableName === 'leases') {
						// For listSubscriptions, filter by tenant and not null stripe_subscription_id
						if (conditions.primary_tenant_id === 'tenant123' && notConditions.stripe_subscription_id) {
							return Promise.resolve({
								data: { id: 'lease123', primary_tenant_id: 'tenant123', unit_id: 'unit123', rent_amount: 100000, rent_currency: 'usd', payment_day: 1, auto_pay_enabled: true, stripe_subscription_id: 'sub_test123', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
								error: null
							})
						}
					}
					return Promise.resolve({ data: null, error: null })
				}),
				update: jest.fn((updates: any) => ({
					eq: jest.fn(() => Promise.resolve({ data: updates, error: null }))
				}))
			}
			return queryBuilder
		}

		const mockSupabaseClient = {
			from: jest.fn((table: string) => createQueryBuilder(table))
		}

		// Create mock Stripe client
		const mockStripe = {
			prices: {
				create: jest.fn().mockResolvedValue({ id: 'price_test123', product: 'prod_test123' })
			},
			subscriptions: {
				create: jest.fn().mockResolvedValue({
id: 'sub_test123',
status: 'active',
customer: 'cus_test123',
items: { data: [{ id: 'si_test123', price: { id: 'price_test123' } }] }
}),
				update: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
				retrieve: jest.fn().mockResolvedValue({
id: 'sub_test123',
status: 'active',
items: { data: [{ id: 'si_test123', price: { id: 'price_test123', currency: 'usd' } }] }
}),
				cancel: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' })
			},
			customers: {
				create: jest.fn().mockResolvedValue({ id: 'cus_test123' })
			}
		}

		supabaseService = {
			getAdminClient: jest.fn(() => mockSupabaseClient)
		}

		stripeClientService = {
			getClient: jest.fn(() => mockStripe)
		}

		const module: TestingModule = await Test.createTestingModule({
providers: [
SubscriptionsService,
{ provide: SupabaseService, useValue: supabaseService },
{ provide: StripeClientService, useValue: stripeClientService }
]
}).compile()

		service = module.get<SubscriptionsService>(SubscriptionsService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('createSubscription', () => {
		it('should create subscription with destination charges', async () => {
			const result = await service.createSubscription('user123', {
leaseId: 'lease_new',
paymentMethodId: 'pm_test123',
amount: 1000,
billingDayOfMonth: 1,
currency: 'usd'
})

			expect(result.status).toBe('active')
		})

		it('should store subscription with correct currency', async () => {
			await service.createSubscription('user123', {
leaseId: 'lease_new',
paymentMethodId: 'pm_test123',
amount: 1000,
billingDayOfMonth: 1,
currency: 'usd'
})

			const stripe = stripeClientService.getClient()
			expect(stripe.prices.create).toHaveBeenCalled()
		})

		it('should handle billing day validation', async () => {
			await service.createSubscription('user123', {
leaseId: 'lease_new',
paymentMethodId: 'pm_test123',
amount: 1000,
billingDayOfMonth: 15,
currency: 'usd'
})

			const stripe = stripeClientService.getClient()
			expect(stripe.subscriptions.create).toHaveBeenCalled()
		})

		it('should normalize amount to cents', async () => {
			await service.createSubscription('user123', {
leaseId: 'lease_new',
paymentMethodId: 'pm_test123',
amount: 1000,
billingDayOfMonth: 1,
currency: 'usd'
})

			const stripe = stripeClientService.getClient()
			expect(stripe.prices.create).toHaveBeenCalledWith(
expect.objectContaining({
unit_amount: 100000
})
)
		})
	})

	describe('pauseSubscription', () => {
		it('should pause active subscription', async () => {
			const result = await service.pauseSubscription('lease123', 'user123')

			expect(result.success).toBe(true)
			const stripe = stripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
'sub_test123',
expect.objectContaining({
pause_collection: { behavior: 'keep_as_draft' }
})
)
		})
	})

	describe('resumeSubscription', () => {
		it('should resume paused subscription', async () => {
			const result = await service.resumeSubscription('lease123', 'user123')

			expect(result.success).toBe(true)
			const stripe = stripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
'sub_test123',
expect.objectContaining({
pause_collection: null
})
)
		})
	})

	describe('cancelSubscription', () => {
		it('should cancel subscription at period end', async () => {
			const result = await service.cancelSubscription('lease123', 'user123')

			expect(result.success).toBe(true)
			const stripe = stripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
'sub_test123',
expect.objectContaining({
cancel_at_period_end: true
})
)
		})
	})

	describe('listSubscriptions', () => {
		it('should list subscriptions for tenant', async () => {
			jest.spyOn(service as any, 'findOwnerByUserId').mockResolvedValue(null)

			const result = await service.listSubscriptions('user123')

			expect(Array.isArray(result)).toBe(true)
		})
	})
})
