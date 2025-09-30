import {
	BadRequestException,
	InternalServerErrorException
} from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import type { IBillingRepository } from '../repositories/interfaces/billing-repository.interface'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import { StripeDataService } from './stripe-data.service'

describe('StripeDataService - Production Tests', () => {
	let service: StripeDataService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockSupabaseClient: jest.Mocked<
		ReturnType<SupabaseService['getAdminClient']>
	>
	let mockBillingRepository: jest.Mocked<IBillingRepository>

	beforeEach(async () => {
		// Create chainable mock query with mockResolvedValue
		const createMockQuery = () => ({
			select: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			mockResolvedValue: jest.fn()
		})

		mockSupabaseClient = {
			rpc: jest.fn(),
			from: jest.fn().mockImplementation(() => createMockQuery())
		} as any

		// Mock SupabaseService
		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
		} as unknown as jest.Mocked<SupabaseService>

		mockBillingRepository = {
			getCustomer: jest.fn(),
			getCustomers: jest.fn(),
			getCustomerSubscriptions: jest.fn(),
			getSubscriptions: jest.fn(),
			getSubscription: jest.fn(),
			getProducts: jest.fn(),
			getProduct: jest.fn(),
			getPrices: jest.fn(),
			getPrice: jest.fn(),
			getProductPrices: jest.fn(),
			getPaymentIntents: jest.fn(),
			getPaymentIntent: jest.fn(),
			getCustomerPayments: jest.fn(),
			isHealthy: jest.fn(),
			countCustomers: jest.fn(),
			countSubscriptions: jest.fn(),
			countPayments: jest.fn()
		} as unknown as jest.Mocked<IBillingRepository>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeDataService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: REPOSITORY_TOKENS.BILLING, useValue: mockBillingRepository }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<StripeDataService>(StripeDataService)

		// Spy on the actual logger instance created by the service
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
	})

	describe('getCustomerSubscriptions', () => {
		it('returns subscriptions via billing repository', async () => {
			const customerId = 'cus_ProdCustomer123'
			const mockSubscriptions = [
				{
					id: 'sub_1234567890',
					customer_id: customerId,
					status: 'active'
				},
				{
					id: 'sub_0987654321',
					customer_id: customerId,
					status: 'canceled'
				}
			] as any

			mockBillingRepository.getCustomerSubscriptions.mockResolvedValue(
				mockSubscriptions
			)

			const result = await service.getCustomerSubscriptions(customerId)

			expect(mockBillingRepository.getCustomerSubscriptions).toHaveBeenCalledWith(
				customerId
			)
			expect(result).toEqual(mockSubscriptions)
		})

		it('wraps repository errors with InternalServerErrorException', async () => {
			const customerId = 'cus_Error123'
			const repoError = new Error('Repository failure')
			mockBillingRepository.getCustomerSubscriptions.mockRejectedValue(repoError)

			await expect(
				service.getCustomerSubscriptions(customerId)
			).rejects.toThrow(InternalServerErrorException)

			expect(service['logger'].error).toHaveBeenCalledWith(
				'Error fetching customer subscriptions:',
				repoError
			)
		})

		it('returns empty array when repository yields no data', async () => {
			const customerId = 'cus_NoSubs123'
			mockBillingRepository.getCustomerSubscriptions.mockResolvedValue([])

			const result = await service.getCustomerSubscriptions(customerId)

			expect(result).toEqual([])
		})
	})

	describe('getCustomer', () => {
		it('returns customer from billing repository', async () => {
			const customerId = 'cus_Customer123'
			const mockCustomer = {
				id: customerId,
				email: 'customer@example.com',
				name: 'John Doe'
			} as any

			mockBillingRepository.getCustomer.mockResolvedValue(mockCustomer)

			const result = await service.getCustomer(customerId)

			expect(mockBillingRepository.getCustomer).toHaveBeenCalledWith(customerId)
			expect(result).toEqual(mockCustomer)
		})

		it('throws BadRequestException when customerId missing', async () => {
			await expect(service.getCustomer('')).rejects.toThrow(BadRequestException)
		})

		it('throws InternalServerErrorException when customer missing', async () => {
			mockBillingRepository.getCustomer.mockResolvedValue(null)

			await expect(service.getCustomer('cus_NotFound123')).rejects.toThrow(
				InternalServerErrorException
			)
		})

		it('wraps repository errors', async () => {
			const customerId = 'cus_Error123'
			const repoError = new Error('Database error')
			mockBillingRepository.getCustomer.mockRejectedValue(repoError)

			await expect(service.getCustomer(customerId)).rejects.toThrow(
				InternalServerErrorException
			)

			expect(service['logger'].error).toHaveBeenCalledWith(
				'Error fetching customer:',
				repoError
			)
		})
	})

	describe('getPrices', () => {
		it('delegates to billing repository', async () => {
			const mockPrices = [
				{ id: 'price_123', active: true }
			] as any

			mockBillingRepository.getPrices.mockResolvedValue(mockPrices)

			const result = await service.getPrices(true)

			expect(mockBillingRepository.getPrices).toHaveBeenCalledWith({
				active: true,
				limit: 1000
			})
			expect(result).toEqual(mockPrices)
		})

		it('wraps repository errors', async () => {
			mockBillingRepository.getPrices.mockRejectedValue(
				new Error('database error')
			)

			await expect(service.getPrices()).rejects.toThrow(
				InternalServerErrorException
			)

			expect(service['logger'].error).toHaveBeenCalledWith(
				'Error fetching prices:',
				expect.any(Error)
			)
		})
	})

	describe('getProducts', () => {
		it('delegates to billing repository', async () => {
			const mockProducts = [{ id: 'prod_123', active: true }] as any

			mockBillingRepository.getProducts.mockResolvedValue(mockProducts)

			const result = await service.getProducts(false)

			expect(mockBillingRepository.getProducts).toHaveBeenCalledWith({
				active: false,
				limit: 1000
			})
			expect(result).toEqual(mockProducts)
		})

		it('wraps repository errors', async () => {
			mockBillingRepository.getProducts.mockRejectedValue(
				new Error('Timeout error')
			)

			await expect(service.getProducts()).rejects.toThrow(
				InternalServerErrorException
			)

			expect(service['logger'].error).toHaveBeenCalledWith(
				'Error fetching products:',
				expect.any(Error)
			)
		})
	})

	describe('isHealthy', () => {
		it('returns repository health result', async () => {
			mockBillingRepository.isHealthy.mockResolvedValue(true)

			await expect(service.isHealthy()).resolves.toBe(true)
			expect(mockBillingRepository.isHealthy).toHaveBeenCalled()
		})

		it('returns false when repository throws', async () => {
			mockBillingRepository.isHealthy.mockRejectedValue(
				new Error('Connection failed')
			)

			await expect(service.isHealthy()).resolves.toBe(false)
		})
	})

	describe('Analytics Methods', () => {
		describe('getRevenueAnalytics', () => {
			it('should call get_stripe_payment_intents RPC and calculate analytics', async () => {
				// Arrange
				const startDate = new Date('2024-01-01')
				const endDate = new Date('2024-01-31')
				const mockPaymentIntents = [
					{
						id: 'pi_123',
						amount: 2999,
						created_at: '2024-01-15T00:00:00Z',
						description: 'subscription payment'
					},
					{
						id: 'pi_456',
						amount: 1999,
						created_at: '2024-01-20T00:00:00Z',
						description: 'one-time payment'
					}
				]

				// Mock the query chain response
				const mockChain = {
					select: jest.fn().mockReturnThis(),
					gte: jest.fn().mockReturnThis(),
					lte: jest.fn().mockReturnThis(),
					limit: jest.fn().mockResolvedValue({
						data: mockPaymentIntents,
						error: null
					})
				}
				mockSupabaseClient.from = jest.fn().mockReturnValue(mockChain)

				// Act
				const result = await service.getRevenueAnalytics(startDate, endDate)

				// Assert
				expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_payment_intents')
				expect(Array.isArray(result)).toBe(true)
			})
		})

		describe('getChurnAnalytics', () => {
			it('should call get_stripe_subscriptions RPC and calculate churn', async () => {
				// Arrange
				const mockSubscriptions = [
					{
						id: 'sub_123',
						status: 'active',
						created_at: '2024-01-01T00:00:00Z'
					},
					{
						id: 'sub_456',
						status: 'canceled',
						created_at: '2024-01-01T00:00:00Z'
					}
				]

				// Mock the query chain response
				const mockChain = {
					select: jest.fn().mockReturnThis(),
					limit: jest.fn().mockResolvedValue({
						data: mockSubscriptions,
						error: null
					})
				}
				mockSupabaseClient.from = jest.fn().mockReturnValue(mockChain)

				// Act
				const result = await service.getChurnAnalytics()

				// Assert
				expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_subscriptions')
				expect(Array.isArray(result)).toBe(true)
			})
		})

		describe('getCustomerLifetimeValue', () => {
			it('should call both customer and subscription RPCs for CLV calculation', async () => {
				// Arrange
				const mockCustomers = [{ id: 'cus_123', email: 'test@example.com' }]
				const mockSubscriptions = [
					{
						id: 'sub_123',
						customer_id: 'cus_123',
						status: 'active',
						created_at: '2024-01-01T00:00:00Z'
					}
				]

				// Mock both query chains for Promise.all
				mockSupabaseClient.from = jest.fn()
					.mockReturnValueOnce({
						select: jest.fn().mockReturnValue({
							limit: jest.fn().mockResolvedValue({
								data: mockCustomers,
								error: null
							})
						})
					})
					.mockReturnValueOnce({
						select: jest.fn().mockReturnValue({
							limit: jest.fn().mockResolvedValue({
								data: mockSubscriptions,
								error: null
							})
						})
					})

				// Act
				const result = await service.getCustomerLifetimeValue()

				// Assert
				expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_customers')
				expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_subscriptions')
				expect(Array.isArray(result)).toBe(true)
			})
		})

		describe('getMRRTrend', () => {
			it('should call get_stripe_subscriptions RPC and calculate MRR trend', async () => {
				// Arrange
				const months = 6
				const mockSubscriptions = [
					{
						id: 'sub_123',
						status: 'active',
						created_at: '2024-01-01T00:00:00Z'
					}
				]

				// Mock the query chain response
				const mockChain = {
					select: jest.fn().mockReturnThis(),
					limit: jest.fn().mockResolvedValue({
						data: mockSubscriptions,
						error: null
					})
				}
				mockSupabaseClient.from = jest.fn().mockReturnValue(mockChain)

				// Act
				const result = await service.getMRRTrend(months)

				// Assert
				expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_subscriptions')
				expect(Array.isArray(result)).toBe(true)
			})
		})

		describe('getSubscriptionStatusBreakdown', () => {
			it('should call get_stripe_subscriptions RPC and calculate status breakdown', async () => {
				// Arrange
				const mockSubscriptions = [
					{ id: 'sub_1', status: 'active' },
					{ id: 'sub_2', status: 'active' },
					{ id: 'sub_3', status: 'canceled' }
				]

				// Mock the query chain response
				const mockChain = {
					select: jest.fn().mockReturnThis(),
					limit: jest.fn().mockResolvedValue({
						data: mockSubscriptions,
						error: null
					})
				}
				mockSupabaseClient.from = jest.fn().mockReturnValue(mockChain)

				// Act
				const result = await service.getSubscriptionStatusBreakdown()

				// Assert
				expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_subscriptions')
				expect(result).toEqual({ active: 2, canceled: 1 })
			})
		})
	})
})
