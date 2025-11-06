import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionsService } from './subscriptions.service'

describe('SubscriptionsService', () => {
	let service: SubscriptionsService

	const mockSupabaseClient = () => {
		const mock: any = {}
		mock.from = jest.fn().mockReturnValue(mock)
		mock.select = jest.fn().mockReturnValue(mock)
		mock.insert = jest.fn().mockReturnValue(mock)
		mock.update = jest.fn().mockReturnValue(mock)
		mock.eq = jest.fn().mockReturnValue(mock)
		mock.or = jest.fn().mockReturnValue(mock)
		mock.order = jest.fn().mockReturnValue(mock)
		mock.single = jest.fn().mockResolvedValue({ data: null, error: null })
		return mock
	}

	let supabaseClient = mockSupabaseClient()

	const mockSupabaseService = {
		getAdminClient: jest.fn(() => supabaseClient)
	}

	const mockStripe = {
		products: { create: jest.fn() },
		prices: { create: jest.fn(), list: jest.fn() },
		subscriptions: {
			create: jest.fn(),
			update: jest.fn(),
			cancel: jest.fn(),
			retrieve: jest.fn()
		},
		customers: { update: jest.fn() }
	}

	const mockStripeClientService = {
		getClient: jest.fn(() => mockStripe)
	}

	beforeEach(async () => {
		supabaseClient = mockSupabaseClient()
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SubscriptionsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: StripeClientService,
					useValue: mockStripeClientService
				}
			]
		}).compile()

		service = module.get<SubscriptionsService>(SubscriptionsService)

		// Mock Stripe SDK
		mockStripe.products.create.mockResolvedValue({
			id: 'prod_test123'
		} as Stripe.Response<Stripe.Product>)

		mockStripe.prices.create.mockResolvedValue({
			id: 'price_test123'
		} as Stripe.Response<Stripe.Price>)

		jest.spyOn(service['stripe'].subscriptions, 'create').mockResolvedValue({
			id: 'sub_test123',
			status: 'active'
		} as Stripe.Response<Stripe.Subscription>)

		jest.spyOn(service['stripe'].subscriptions, 'update').mockResolvedValue({
			id: 'sub_test123',
			status: 'active'
		} as Stripe.Response<Stripe.Subscription>)

		jest.spyOn(service['stripe'].subscriptions, 'cancel').mockResolvedValue({
			id: 'sub_test123',
			status: 'canceled'
		} as Stripe.Response<Stripe.Subscription>)

		jest.spyOn(service['stripe'].subscriptions, 'retrieve').mockResolvedValue({
			id: 'sub_test123',
			items: {
				data: [
					{
						id: 'si_test123',
						price: {
							id: 'price_test123',
							product: 'prod_test123'
						}
					}
				]
			}
		} as Stripe.Response<Stripe.Subscription>)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('createSubscription', () => {
		beforeEach(() => {
			// Mock lease query - property and unit are now separate fields (unitId nullable)
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'lease123',
					tenantId: 'tenant123',
					propertyId: 'property123',
					unitId: 'unit123',
					rentAmount: 100000,
					startDate: '2024-01-01',
					endDate: '2025-01-01',
					property: {
						id: 'property123',
						name: 'Test Property',
						ownerId: 'owner123'
					},
					unit: {
						id: 'unit123',
						unitNumber: '101'
					}
				},
				error: null
			})

			// Mock connected account query
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					stripeAccountId: 'acct_test123',
					chargesEnabled: true
				},
				error: null
			})

			// Mock payment method query
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					stripePaymentMethodId: 'pm_test123',
					stripeCustomerId: 'cus_test123'
				},
				error: null
			})

			// Mock subscription insert
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					leaseId: 'lease123',
					tenantId: 'tenant123',
					ownerId: 'owner123',
					stripeSubscriptionId: 'sub_test123',
					stripeCustomerId: 'cus_test123',
					amount: 100000,
					currency: 'usd',
					dueDay: 1,
					status: 'active',
					platformFeePercent: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				error: null
			})
		})

		it('should create subscription with destination charges', async () => {
			const result = await service.createSubscription('tenant123', {
				leaseId: 'lease123',
				paymentMethodId: 'pm_db_test123',
				amount: 1000,
				billingDayOfMonth: 1,
				currency: 'usd'
			})

			expect(result.status).toBe('active')
			expect(service['stripe'].subscriptions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: 'cus_test123',
					default_payment_method: 'pm_test123',
					transfer_data: {
						destination: 'acct_test123'
					}
				})
			)
		})

		it('should store subscription with currency and pausedAt', async () => {
			await service.createSubscription('tenant123', {
				leaseId: 'lease123',
				paymentMethodId: 'pm_db_test123',
				amount: 1000,
				billingDayOfMonth: 1,
				currency: 'usd'
			})

			expect(supabaseClient.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					currency: 'usd',
					amount: 100000, // Stored in cents
					dueDay: 1,
					platformFeePercent: 0
				})
			)
		})

		it('should throw error if lease not found', async () => {
			supabaseClient.single.mockReset()
			supabaseClient.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Not found' }
			})

			await expect(
				service.createSubscription('tenant123', {
					leaseId: 'invalid',
					paymentMethodId: 'pm_test123',
					amount: 1000,
					billingDayOfMonth: 1
				})
			).rejects.toThrow(NotFoundException)
		})

		it('should throw error if connected account not found', async () => {
			supabaseClient.single.mockReset()

			// Lease found - property and unit are separate fields
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'lease123',
					tenantId: 'tenant123',
					propertyId: 'property123',
					unitId: 'unit123',
					property: {
						id: 'property123',
						name: 'Test Property',
						ownerId: 'owner123'
					},
					unit: {
						id: 'unit123',
						unitNumber: '101'
					}
				},
				error: null
			})

			// No connected account
			supabaseClient.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Not found' }
			})

			await expect(
				service.createSubscription('tenant123', {
					leaseId: 'lease123',
					paymentMethodId: 'pm_test123',
					amount: 1000,
					billingDayOfMonth: 1
				})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('pauseSubscription', () => {
		beforeEach(() => {
			// Mock get subscription - .or() returns mock, .single() resolves
			supabaseClient.or.mockReturnValueOnce(supabaseClient)
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					stripeSubscriptionId: 'sub_test123',
					status: 'active',
					amount: 100000,
					currency: 'usd',
					dueDay: 1,
					platformFeePercent: 0
				},
				error: null
			})

			// Mock update
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					status: 'paused',
					pausedAt: new Date().toISOString()
				},
				error: null
			})
		})

		it('should pause active subscription', async () => {
			const result = await service.pauseSubscription(
				'subscription123',
				'user123'
			)

			expect(result.success).toBe(true)
			expect(service['stripe'].subscriptions.update).toHaveBeenCalledWith(
				'sub_test123',
				{
					pause_collection: {
						behavior: 'keep_as_draft'
					}
				}
			)
		})

		it('should set pausedAt timestamp in database', async () => {
			await service.pauseSubscription('subscription123', 'user123')

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'paused',
					pausedAt: expect.any(String)
				})
			)
		})
	})

	describe('resumeSubscription', () => {
		beforeEach(() => {
			// Mock get subscription - .or() returns mock, .single() resolves
			supabaseClient.or.mockReturnValueOnce(supabaseClient)
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					stripeSubscriptionId: 'sub_test123',
					status: 'paused',
					amount: 100000,
					currency: 'usd',
					dueDay: 1,
					platformFeePercent: 0
				},
				error: null
			})

			// Mock update
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					status: 'active',
					pausedAt: null
				},
				error: null
			})
		})

		it('should resume paused subscription', async () => {
			const result = await service.resumeSubscription(
				'subscription123',
				'user123'
			)

			expect(result.success).toBe(true)
			expect(service['stripe'].subscriptions.update).toHaveBeenCalledWith(
				'sub_test123',
				{
					pause_collection: null
				}
			)
		})

		it('should clear pausedAt timestamp in database', async () => {
			await service.resumeSubscription('subscription123', 'user123')

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'active',
					pausedAt: null
				})
			)
		})
	})

	describe('cancelSubscription', () => {
		beforeEach(() => {
			// Mock get subscription - .or() returns mock, .single() resolves
			supabaseClient.or.mockReturnValueOnce(supabaseClient)
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					stripeSubscriptionId: 'sub_test123',
					status: 'active',
					amount: 100000,
					currency: 'usd',
					dueDay: 1,
					platformFeePercent: 0
				},
				error: null
			})

			// Mock update
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					status: 'canceled',
					canceledAt: new Date().toISOString()
				},
				error: null
			})
		})

		it('should cancel subscription at period end', async () => {
			const result = await service.cancelSubscription(
				'subscription123',
				'user123'
			)

			expect(result.success).toBe(true)
			expect(service['stripe'].subscriptions.update).toHaveBeenCalledWith(
				'sub_test123',
				{
					cancel_at_period_end: true
				}
			)
		})

		it('should set canceledAt timestamp in database', async () => {
			await service.cancelSubscription('subscription123', 'user123')

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'canceled',
					canceledAt: expect.any(String)
				})
			)
		})
	})

	describe('listSubscriptions', () => {
		it('should list subscriptions for user', async () => {
			supabaseClient.order.mockResolvedValueOnce({
				data: [
					{
						id: 'sub1',
						status: 'active',
						amount: 100000
					},
					{
						id: 'sub2',
						status: 'paused',
						amount: 150000
					}
				],
				error: null
			})

			const result = await service.listSubscriptions('user123')

			expect(result).toHaveLength(2)
			expect(supabaseClient.or).toHaveBeenCalledWith(
				'tenantId.eq.user123,ownerId.eq.user123'
			)
		})
	})
})
