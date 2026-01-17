import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { BillingService } from './billing.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('BillingService', () => {
	let service: BillingService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	// Mock query builders
	let stripeSchemaSelect: jest.Mock
	let stripeSchemaEq: jest.Mock
	let stripeSchemaSingle: jest.Mock
	let publicSelect: jest.Mock
	let publicEq: jest.Mock
	let publicSingle: jest.Mock
	let publicUpdate: jest.Mock
	let publicUpdateEq: jest.Mock
	let userSchemaSelect: jest.Mock
	let userSchemaOrder: jest.Mock
	let userSchemaLimit: jest.Mock
	let userSchemaSingle: jest.Mock

	beforeEach(async () => {
		// Reset all mocks
		stripeSchemaSelect = jest.fn().mockReturnThis()
		stripeSchemaEq = jest.fn().mockReturnThis()
		stripeSchemaSingle = jest.fn()

		publicSelect = jest.fn().mockReturnThis()
		publicEq = jest.fn().mockReturnThis()
		publicSingle = jest.fn()
		publicUpdateEq = jest.fn()
		publicUpdate = jest.fn().mockReturnValue({ eq: publicUpdateEq })

		userSchemaSelect = jest.fn().mockReturnThis()
		userSchemaOrder = jest.fn().mockReturnThis()
		userSchemaLimit = jest.fn().mockReturnThis()
		userSchemaSingle = jest.fn()

		const mockStripeSchemaFrom = jest.fn().mockReturnValue({
			select: stripeSchemaSelect,
			eq: stripeSchemaEq,
			single: stripeSchemaSingle
		})

		const mockAdminClient = {
			schema: jest.fn().mockReturnValue({
				from: mockStripeSchemaFrom
			}),
			from: jest.fn((table: string) => {
				if (table === 'users' || table === 'tenants') {
					return {
						select: publicSelect,
						eq: publicEq,
						single: publicSingle,
						update: publicUpdate
					}
				}
				return {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest.fn()
				}
			})
		}

		const mockUserClient = {
			schema: jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue({
					select: userSchemaSelect,
					order: userSchemaOrder,
					limit: userSchemaLimit,
					single: userSchemaSingle
				})
			})
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => mockAdminClient),
			getUserClient: jest.fn(() => mockUserClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				BillingService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<BillingService>(BillingService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('getStripeCustomer', () => {
		const mockCustomer = {
			id: 'cus_123',
			email: 'test@example.com',
			name: 'Test Customer'
		} as Stripe.Customer

		it('returns customer from stripe schema', async () => {
			stripeSchemaSingle.mockResolvedValue({ data: mockCustomer, error: null })

			const result = await service.getStripeCustomer('cus_123')

			expect(result).toEqual(mockCustomer)
			expect(stripeSchemaEq).toHaveBeenCalledWith('id', 'cus_123')
		})

		it('returns null when customer not found (PGRST116)', async () => {
			stripeSchemaSingle.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116', message: 'not found' }
			})

			const result = await service.getStripeCustomer('cus_nonexistent')

			expect(result).toBeNull()
		})

		it('throws on other database errors', async () => {
			stripeSchemaSingle.mockResolvedValue({
				data: null,
				error: { code: 'PGRST500', message: 'Database error' }
			})

			await expect(service.getStripeCustomer('cus_123')).rejects.toEqual({
				code: 'PGRST500',
				message: 'Database error'
			})
		})
	})

	describe('findCustomerByOwnerId', () => {
		it('returns customer when owner has stripe_customer_id', async () => {
			publicSingle.mockResolvedValue({
				data: { stripe_customer_id: 'cus_owner' },
				error: null
			})
			stripeSchemaSingle.mockResolvedValue({
				data: { id: 'cus_owner', email: 'owner@example.com' },
				error: null
			})

			const result = await service.findCustomerByOwnerId('owner-123')

			expect(result).toEqual({ id: 'cus_owner', email: 'owner@example.com' })
			expect(publicEq).toHaveBeenCalledWith('id', 'owner-123')
		})

		it('returns null when owner not found', async () => {
			publicSingle.mockResolvedValue({
				data: null,
				error: { message: 'not found' }
			})

			const result = await service.findCustomerByOwnerId('missing-owner')

			expect(result).toBeNull()
		})

		it('returns null when owner has no stripe_customer_id', async () => {
			publicSingle.mockResolvedValue({
				data: { stripe_customer_id: null },
				error: null
			})

			const result = await service.findCustomerByOwnerId('owner-no-stripe')

			expect(result).toBeNull()
		})
	})

	describe('findCustomerByTenantId', () => {
		it('returns customer when tenant has stripe_customer_id', async () => {
			publicSingle.mockResolvedValue({
				data: { stripe_customer_id: 'cus_tenant' },
				error: null
			})
			stripeSchemaSingle.mockResolvedValue({
				data: { id: 'cus_tenant', email: 'tenant@example.com' },
				error: null
			})

			const result = await service.findCustomerByTenantId('tenant-123')

			expect(result).toEqual({ id: 'cus_tenant', email: 'tenant@example.com' })
			expect(publicEq).toHaveBeenCalledWith('id', 'tenant-123')
		})

		it('returns null when tenant not found', async () => {
			publicSingle.mockResolvedValue({
				data: null,
				error: { message: 'not found' }
			})

			const result = await service.findCustomerByTenantId('missing-tenant')

			expect(result).toBeNull()
		})
	})

	describe('linkCustomerToOwner', () => {
		it('updates user record with stripe_customer_id', async () => {
			publicUpdateEq.mockResolvedValue({ error: null })

			await service.linkCustomerToOwner('cus_123', 'owner-456')

			expect(publicUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					stripe_customer_id: 'cus_123'
				})
			)
			expect(publicUpdateEq).toHaveBeenCalledWith('id', 'owner-456')
		})

		it('throws on database error', async () => {
			publicUpdateEq.mockResolvedValue({
				error: { message: 'Update failed' }
			})

			await expect(
				service.linkCustomerToOwner('cus_123', 'owner-456')
			).rejects.toEqual({ message: 'Update failed' })
		})
	})

	describe('linkCustomerToTenant', () => {
		it('updates tenant record with stripe_customer_id', async () => {
			publicUpdateEq.mockResolvedValue({ error: null })

			await service.linkCustomerToTenant('cus_123', 'tenant-456')

			expect(publicUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					stripe_customer_id: 'cus_123'
				})
			)
			expect(publicUpdateEq).toHaveBeenCalledWith('id', 'tenant-456')
		})

		it('throws on database error', async () => {
			publicUpdateEq.mockResolvedValue({
				error: { message: 'Update failed' }
			})

			await expect(
				service.linkCustomerToTenant('cus_123', 'tenant-456')
			).rejects.toEqual({ message: 'Update failed' })
		})
	})

	describe('findSubscriptionByStripeId', () => {
		const mockSubscription = {
			id: 'sub_123',
			customer: 'cus_123',
			status: 'active'
		} as Stripe.Subscription

		it('returns subscription from stripe schema', async () => {
			stripeSchemaSingle.mockResolvedValue({
				data: mockSubscription,
				error: null
			})

			const result = await service.findSubscriptionByStripeId('sub_123')

			expect(result).toEqual(mockSubscription)
			expect(stripeSchemaEq).toHaveBeenCalledWith('id', 'sub_123')
		})

		it('returns null when subscription not found', async () => {
			stripeSchemaSingle.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116', message: 'not found' }
			})

			const result = await service.findSubscriptionByStripeId('sub_nonexistent')

			expect(result).toBeNull()
		})
	})

	describe('findSubscriptionsByCustomerId', () => {
		const mockSubscriptions = [
			{ id: 'sub_1', customer: 'cus_123', status: 'active' },
			{ id: 'sub_2', customer: 'cus_123', status: 'canceled' }
		] as Stripe.Subscription[]

		it('returns array of subscriptions', async () => {
			// For list queries, we need to mock the chain differently
			const mockFrom = jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({
						data: mockSubscriptions,
						error: null
					})
				})
			})

			const mockAdminClient = mockSupabaseService.getAdminClient()
			;(mockAdminClient.schema as jest.Mock).mockReturnValue({
				from: mockFrom
			})

			const result = await service.findSubscriptionsByCustomerId('cus_123')

			expect(result).toEqual(mockSubscriptions)
		})

		it('returns empty array when none found', async () => {
			const mockFrom = jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			})

			const mockAdminClient = mockSupabaseService.getAdminClient()
			;(mockAdminClient.schema as jest.Mock).mockReturnValue({
				from: mockFrom
			})

			const result = await service.findSubscriptionsByCustomerId('cus_no_subs')

			expect(result).toEqual([])
		})

		it('throws on database error', async () => {
			const mockFrom = jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockResolvedValue({
						data: null,
						error: { message: 'Database error' }
					})
				})
			})

			const mockAdminClient = mockSupabaseService.getAdminClient()
			;(mockAdminClient.schema as jest.Mock).mockReturnValue({
				from: mockFrom
			})

			await expect(
				service.findSubscriptionsByCustomerId('cus_123')
			).rejects.toEqual({ message: 'Database error' })
		})
	})

	describe('findSubscriptionByUserId', () => {
		it('returns subscription with RLS-enforced query', async () => {
			userSchemaSingle.mockResolvedValue({
				data: { id: 'sub_123', customer: 'cus_456' },
				error: null
			})

			const result = await service.findSubscriptionByUserId(
				'user-123',
				'user-token'
			)

			expect(result).toEqual({
				stripe_subscription_id: 'sub_123',
				stripe_customer_id: 'cus_456'
			})
			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith('user-token')
		})

		it('returns null when not found (PGRST116)', async () => {
			userSchemaSingle.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116', message: 'not found' }
			})

			const result = await service.findSubscriptionByUserId(
				'user-no-sub',
				'user-token'
			)

			expect(result).toBeNull()
		})

		it('throws on other errors (fail-closed security)', async () => {
			userSchemaSingle.mockResolvedValue({
				data: null,
				error: { code: 'PGRST403', message: 'RLS denied' }
			})

			await expect(
				service.findSubscriptionByUserId('user-123', 'user-token')
			).rejects.toEqual({ code: 'PGRST403', message: 'RLS denied' })
		})

		it('returns null when data is null without error', async () => {
			userSchemaSingle.mockResolvedValue({
				data: null,
				error: null
			})

			const result = await service.findSubscriptionByUserId(
				'user-123',
				'user-token'
			)

			expect(result).toBeNull()
		})
	})

	describe('findPaymentIntentByStripeId', () => {
		const mockPaymentIntent = {
			id: 'pi_123',
			amount: 10000,
			status: 'succeeded'
		} as Stripe.PaymentIntent

		it('returns payment intent from stripe schema', async () => {
			stripeSchemaSingle.mockResolvedValue({
				data: mockPaymentIntent,
				error: null
			})

			const result = await service.findPaymentIntentByStripeId('pi_123')

			expect(result).toEqual(mockPaymentIntent)
			expect(stripeSchemaEq).toHaveBeenCalledWith('id', 'pi_123')
		})

		it('returns null when payment intent not found', async () => {
			stripeSchemaSingle.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116', message: 'not found' }
			})

			const result = await service.findPaymentIntentByStripeId('pi_nonexistent')

			expect(result).toBeNull()
		})
	})
})
