/**
 * RentPaymentQueryService Tests (TDD Red Phase)
 * Tests written BEFORE implementation
 */

import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { RentPaymentQueryService } from './rent-payment-query.service'
import type { RentPayment, Lease } from './types'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


describe('RentPaymentQueryService', () => {
	let service: RentPaymentQueryService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	// Test data
	const mockToken = 'valid-token'
	const mockLeaseId = 'lease-123'
	const mockTenantId = 'tenant-456'
	const mockSubscriptionId = 'sub_test123'

	const mockRentPayment: Partial<RentPayment> = {
		id: 'payment-789',
		lease_id: mockLeaseId,
		tenant_id: mockTenantId,
		amount: 150000,
		status: 'succeeded',
		created_at: '2025-01-01T00:00:00Z'
	}

	const mockFailedPayment: Partial<RentPayment> = {
		...mockRentPayment,
		id: 'payment-failed-001',
		status: 'failed'
	}

	const mockLease: Partial<Lease> = {
		id: mockLeaseId,
		stripe_subscription_id: mockSubscriptionId,
		primary_tenant_id: mockTenantId,
		rent_amount: 150000
	}

	// Helper to create query builder mock
	const createQueryBuilder = (returnData: any, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		maybeSingle: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Error' } : null
		}),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Error' } : null
		}),
		then: jest.fn((cb) =>
			cb({
				data: shouldError ? null : returnData,
				error: shouldError ? { message: 'Error' } : null
			})
		)
	})

	const createListQueryBuilder = (returnData: any[], shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		order: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Error' } : null
		})
	})

	beforeEach(async () => {
		const mockUserClient = {
			from: jest.fn()
		}

		const mockAdminClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient),
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				RentPaymentQueryService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<RentPaymentQueryService>(RentPaymentQueryService)
	})

	describe('getPaymentHistory', () => {
		it('should return payment history for authenticated user', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createListQueryBuilder([mockRentPayment])
			)

			const result = await service.getPaymentHistory(mockToken)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject(mockRentPayment)
			expect(mockClient.from).toHaveBeenCalledWith('rent_payments')
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.getPaymentHistory('')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should return empty array when no payments found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createListQueryBuilder([])
			)

			const result = await service.getPaymentHistory(mockToken)

			expect(result).toEqual([])
		})
	})

	describe('getSubscriptionPaymentHistory', () => {
		it('should return payment history for subscription', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(mockLease))
				.mockReturnValueOnce(createListQueryBuilder([mockRentPayment]))

			const result = await service.getSubscriptionPaymentHistory(
				mockSubscriptionId,
				mockToken
			)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject(mockRentPayment)
		})

		it('should throw NotFoundException when subscription not found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createQueryBuilder(null, true)
			)

			await expect(
				service.getSubscriptionPaymentHistory('nonexistent', mockToken)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('getFailedPaymentAttempts', () => {
		it('should return failed payment attempts', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createListQueryBuilder([mockFailedPayment])
			)

			const result = await service.getFailedPaymentAttempts(mockToken)

			expect(result).toHaveLength(1)
			expect(result[0]!.status).toBe('failed')
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.getFailedPaymentAttempts('')).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('getSubscriptionFailedAttempts', () => {
		it('should return failed attempts for subscription', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(mockLease))
				.mockReturnValueOnce(createListQueryBuilder([mockFailedPayment]))

			const result = await service.getSubscriptionFailedAttempts(
				mockSubscriptionId,
				mockToken
			)

			expect(result).toHaveLength(1)
			expect(result[0]!.status).toBe('failed')
		})
	})

	describe('findLeaseBySubscription', () => {
		it('should find lease by subscription ID', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createQueryBuilder(mockLease)
			)

			const result = await service.findLeaseBySubscription(
				mockSubscriptionId,
				mockToken
			)

			expect(result.id).toBe(mockLeaseId)
			expect(result.stripe_subscription_id).toBe(mockSubscriptionId)
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(
				service.findLeaseBySubscription(mockSubscriptionId, '')
			).rejects.toThrow(BadRequestException)
		})

		it('should throw NotFoundException when subscription not found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createQueryBuilder(null, true)
			)

			await expect(
				service.findLeaseBySubscription('nonexistent', mockToken)
			).rejects.toThrow(NotFoundException)
		})
	})
})
