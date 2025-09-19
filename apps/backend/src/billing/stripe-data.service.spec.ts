import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { StripeDataService } from './stripe-data.service'
import { SupabaseService } from '../database/supabase.service'
import { Logger } from '@nestjs/common'
import { InternalServerErrorException, BadRequestException } from '@nestjs/common'
import { SilentLogger } from '../__test__/silent-logger'

describe('StripeDataService - Production Tests', () => {
	let service: StripeDataService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockSupabaseClient: jest.Mocked<any>
	let mockLogger: jest.Mocked<Logger>

	beforeEach(async () => {
		// Mock Supabase client with RPC method (production uses RPC calls)
		mockSupabaseClient = {
			rpc: jest.fn()
		}

		// Mock SupabaseService
		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
		} as jest.Mocked<SupabaseService>

		// Mock Logger for optional injection (production pattern)
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn()
		} as jest.Mocked<Logger>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeDataService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: Logger, useValue: mockLogger }
			]
		})
		.setLogger(new SilentLogger())
		.compile()

		service = module.get<StripeDataService>(StripeDataService)
	})

	describe('getCustomerSubscriptions', () => {
		it('should call get_stripe_subscriptions RPC with customer_id parameter', async () => {
			// Arrange - Production RPC call pattern
			const customerId = 'cus_ProdCustomer123'
			const mockSubscriptions = [
				{
					id: 'sub_1234567890',
					customer_id: customerId,
					status: 'active',
					created_at: '2024-01-01T00:00:00Z',
					current_period_start: '2024-01-01T00:00:00Z',
					current_period_end: '2024-02-01T00:00:00Z'
				},
				{
					id: 'sub_0987654321',
					customer_id: customerId,
					status: 'canceled',
					created_at: '2023-12-01T00:00:00Z',
					current_period_start: '2023-12-01T00:00:00Z',
					current_period_end: '2024-01-01T00:00:00Z'
				}
			]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockSubscriptions,
				error: null
			})

			// Act
			const result = await service.getCustomerSubscriptions(customerId)

			// Assert - Production RPC call pattern
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_subscriptions', { customer_id: customerId })
			expect(result).toEqual(mockSubscriptions)
			expect(result).toHaveLength(2)
			expect(result[0].status).toBe('active')
			expect(result[1].status).toBe('canceled')
		})

		it('should handle RPC errors and log them like production', async () => {
			// Arrange
			const customerId = 'cus_Error123'
			const dbError = {
				message: 'Database connection failed',
				code: 'ECONNREFUSED'
			}

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: dbError
			})

			// Act & Assert
			await expect(service.getCustomerSubscriptions(customerId))
				.rejects.toThrow(InternalServerErrorException)

			// Production logging pattern: error object directly, not formatted string
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch customer subscriptions',
				{ error: dbError, customerId }
			)
		})

		it('should return empty array when no subscriptions exist', async () => {
			// Arrange
			const customerId = 'cus_NoSubs123'
			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: null
			})

			// Act
			const result = await service.getCustomerSubscriptions(customerId)

			// Assert
			expect(result).toEqual([])
		})

		it('should handle catch block errors like production', async () => {
			// Arrange
			const customerId = 'cus_Exception123'
			const thrownError = new Error('Network timeout')

			mockSupabaseClient.rpc.mockRejectedValue(thrownError)

			// Act & Assert
			await expect(service.getCustomerSubscriptions(customerId))
				.rejects.toThrow(InternalServerErrorException)

			// Production catch block logging pattern
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error fetching customer subscriptions:',
				thrownError
			)
		})
	})

	describe('getCustomer', () => {
		it('should call get_stripe_customer_by_id RPC with customer_id parameter', async () => {
			// Arrange - Production RPC call pattern
			const customerId = 'cus_Customer123'
			const mockCustomer = {
				id: customerId,
				email: 'customer@example.com',
				name: 'John Doe',
				created_at: '2024-01-01T00:00:00Z'
			}

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockCustomer,
				error: null
			})

			// Act
			const result = await service.getCustomer(customerId)

			// Assert - Production RPC call pattern
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_customer_by_id', { customer_id: customerId })
			expect(result).toEqual(mockCustomer)
		})

		it('should throw InternalServerErrorException for invalid customer ID due to catch block', async () => {
			// Arrange - Production behavior: catch block converts BadRequestException to InternalServerErrorException
			const invalidCustomerId = ''

			// Act & Assert
			await expect(service.getCustomer(invalidCustomerId))
				.rejects.toThrow(InternalServerErrorException)

			// Verify the BadRequestException was caught and re-thrown as InternalServerErrorException
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch customer',
				expect.any(BadRequestException)
			)
		})

		it('should return null when customer not found', async () => {
			// Arrange
			const customerId = 'cus_NotFound123'
			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: null
			})

			// Act
			const result = await service.getCustomer(customerId)

			// Assert
			expect(result).toBeNull()
		})

		it('should handle RPC errors when fetching customer', async () => {
			// Arrange
			const customerId = 'cus_Error123'
			const dbError = { message: 'Database error', code: 'DB001' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: dbError
			})

			// Act & Assert
			await expect(service.getCustomer(customerId))
				.rejects.toThrow(InternalServerErrorException)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch customer',
				{ error: dbError, customerId }
			)
		})
	})

	describe('getPrices', () => {
		it('should call get_stripe_prices RPC with active_only parameter', async () => {
			// Arrange - Production RPC call pattern
			const mockPrices = [
				{
					id: 'price_123',
					active: true,
					unit_amount: 2999,
					currency: 'usd',
					created_at: '2024-01-01T00:00:00Z'
				},
				{
					id: 'price_456',
					active: true,
					unit_amount: 5999,
					currency: 'usd',
					created_at: '2024-01-01T00:00:00Z'
				}
			]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockPrices,
				error: null
			})

			// Act
			const result = await service.getPrices(true)

			// Assert - Production RPC call pattern
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_prices', {
				active_only: true,
				limit_count: 1000
			})
			expect(result).toEqual(mockPrices)
		})

		it('should handle RPC errors when fetching prices', async () => {
			// Arrange
			const dbError = { message: 'Database error', code: 'DB001' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: dbError
			})

			// Act & Assert
			await expect(service.getPrices())
				.rejects.toThrow(InternalServerErrorException)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch prices',
				{ error: dbError, activeOnly: true }
			)
		})
	})

	describe('getProducts', () => {
		it('should call get_stripe_products RPC with active_only parameter', async () => {
			// Arrange - Production RPC call pattern
			const mockProducts = [
				{
					id: 'prod_123',
					active: true,
					name: 'Pro Plan',
					description: 'Professional plan',
					created_at: '2024-01-01T00:00:00Z'
				},
				{
					id: 'prod_456',
					active: true,
					name: 'Enterprise Plan',
					description: 'Enterprise plan',
					created_at: '2024-01-01T00:00:00Z'
				}
			]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockProducts,
				error: null
			})

			// Act
			const result = await service.getProducts(false)

			// Assert - Production RPC call pattern
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_products', {
				active_only: false,
				limit_count: 1000
			})
			expect(result).toEqual(mockProducts)
		})

		it('should handle RPC errors when fetching products', async () => {
			// Arrange
			const dbError = { message: 'Timeout error', code: 'TIMEOUT' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: dbError
			})

			// Act & Assert
			await expect(service.getProducts())
				.rejects.toThrow(InternalServerErrorException)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch products',
				{ error: dbError, activeOnly: true }
			)
		})
	})

	describe('isHealthy', () => {
		it('should return true when RPC call succeeds', async () => {
			// Arrange
			mockSupabaseClient.rpc.mockResolvedValue({
				data: [],
				error: null
			})

			// Act
			const result = await service.isHealthy()

			// Assert
			expect(result).toBe(true)
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_customers', { limit_count: 1 })
		})

		it('should return false when RPC call has error', async () => {
			// Arrange
			const dbError = { message: 'Connection failed', code: 'CONN_FAIL' }
			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: dbError
			})

			// Act
			const result = await service.isHealthy()

			// Assert
			expect(result).toBe(false)
		})

		it('should return false when RPC call throws exception', async () => {
			// Arrange
			mockSupabaseClient.rpc.mockRejectedValue(new Error('Network error'))

			// Act
			const result = await service.isHealthy()

			// Assert
			expect(result).toBe(false)
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Stripe data service health check failed:',
				expect.any(Error)
			)
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

				mockSupabaseClient.rpc.mockResolvedValue({
					data: mockPaymentIntents,
					error: null
				})

				// Act
				const result = await service.getRevenueAnalytics(startDate, endDate)

				// Assert
				expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_payment_intents', { limit_count: 1000 })
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

				mockSupabaseClient.rpc.mockResolvedValue({
					data: mockSubscriptions,
					error: null
				})

				// Act
				const result = await service.getChurnAnalytics()

				// Assert
				expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_subscriptions', { limit_count: 1000 })
				expect(Array.isArray(result)).toBe(true)
			})
		})

		describe('getCustomerLifetimeValue', () => {
			it('should call both customer and subscription RPCs for CLV calculation', async () => {
				// Arrange
				const mockCustomers = [{ id: 'cus_123', email: 'test@example.com' }]
				const mockSubscriptions = [{ id: 'sub_123', customer_id: 'cus_123', status: 'active', created_at: '2024-01-01T00:00:00Z' }]

				mockSupabaseClient.rpc
					.mockResolvedValueOnce({ data: mockCustomers, error: null })
					.mockResolvedValueOnce({ data: mockSubscriptions, error: null })

				// Act
				const result = await service.getCustomerLifetimeValue()

				// Assert
				expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_customers', { limit_count: 1000 })
				expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_subscriptions', { limit_count: 1000 })
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

				mockSupabaseClient.rpc.mockResolvedValue({
					data: mockSubscriptions,
					error: null
				})

				// Act
				const result = await service.getMRRTrend(months)

				// Assert
				expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_subscriptions', { limit_count: 600 })
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

				mockSupabaseClient.rpc.mockResolvedValue({
					data: mockSubscriptions,
					error: null
				})

				// Act
				const result = await service.getSubscriptionStatusBreakdown()

				// Assert
				expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_stripe_subscriptions', { limit_count: 1000 })
				expect(result).toEqual({ active: 2, canceled: 1 })
			})
		})
	})
})