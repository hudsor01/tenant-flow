import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantRelationService } from './tenant-relation.service'

describe('TenantRelationService', () => {
	let service: TenantRelationService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockAuthUserId = 'user-123'
	const mockOwnerId = 'owner-456'
	const mockTenantId = 'tenant-789'

	beforeEach(async () => {
		const mockAdminClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				TenantRelationService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantRelationService>(TenantRelationService)
	})

	describe('getOwnerPropertyIds', () => {
		it('returns property IDs for an owner', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			// Mock property_owners query
			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			// Mock properties query
			const propertiesBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({
					data: [{ id: 'prop-1' }, { id: 'prop-2' }],
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(ownerBuilder)
				.mockReturnValueOnce(propertiesBuilder)

			const result = await service.getOwnerPropertyIds(mockAuthUserId)

			expect(result).toEqual(['prop-1', 'prop-2'])
		})

		it('returns empty array when user is not an owner', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			;(mockClient.from as jest.Mock).mockReturnValueOnce(ownerBuilder)

			const result = await service.getOwnerPropertyIds(mockAuthUserId)

			expect(result).toEqual([])
		})

		it('throws BadRequestException when auth user ID is missing', async () => {
			await expect(service.getOwnerPropertyIds('')).rejects.toThrow(
				BadRequestException
			)
		})

		it('returns empty array on query error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			const propertiesBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error' }
				})
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(ownerBuilder)
				.mockReturnValueOnce(propertiesBuilder)

			const result = await service.getOwnerPropertyIds(mockAuthUserId)

			expect(result).toEqual([])
		})
	})

	describe('getTenantIdsForOwner', () => {
		it('returns tenant IDs for an owner', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			// Mock property_owners query
			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			// Mock properties query with nested units and leases (optimized query)
			const propertiesBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({
					data: [
						{
							id: 'prop-1',
							units: [
								{
									id: 'unit-1',
									leases: [
										{ primary_tenant_id: 'tenant-1' },
										{ primary_tenant_id: 'tenant-1' } // Duplicate
									]
								},
								{
									id: 'unit-2',
									leases: [{ primary_tenant_id: 'tenant-2' }]
								}
							]
						}
					],
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(ownerBuilder)
				.mockReturnValueOnce(propertiesBuilder)

			const result = await service.getTenantIdsForOwner(mockAuthUserId)

			// Should deduplicate
			expect(result).toEqual(['tenant-1', 'tenant-2'])
		})

		it('returns empty array when user is not an owner', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			;(mockClient.from as jest.Mock).mockReturnValueOnce(ownerBuilder)

			const result = await service.getTenantIdsForOwner(mockAuthUserId)

			expect(result).toEqual([])
		})

		it('throws BadRequestException when auth user ID is missing', async () => {
			await expect(service.getTenantIdsForOwner('')).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('getTenantPaymentHistory', () => {
		it('returns payment history for a tenant', async () => {
			const mockPayments = [
				{
					id: 'payment-1',
					lease_id: 'lease-1',
					tenant_id: mockTenantId,
					stripe_payment_intent_id: 'pi_123',
					amount: 1500,
					currency: 'usd',
					status: 'succeeded',
					payment_method_type: 'card',
					period_start: '2024-01-01',
					period_end: '2024-01-31',
					due_date: '2024-01-01',
					paid_date: '2024-01-01',
					application_fee_amount: 45,
					late_fee_amount: 0,
					created_at: '2024-01-01T00:00:00Z',
					updated_at: '2024-01-01T00:00:00Z'
				}
			]

			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: mockPayments, error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.getTenantPaymentHistory(mockTenantId)

			expect(result).toEqual(mockPayments)
			expect(mockClient.from).toHaveBeenCalledWith('rent_payments')
			expect(mockBuilder.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
		})

		it('throws BadRequestException when tenant ID is missing', async () => {
			await expect(service.getTenantPaymentHistory('')).rejects.toThrow(
				BadRequestException
			)
		})

		it('applies custom limit', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: [], error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			await service.getTenantPaymentHistory(mockTenantId, 10)

			expect(mockBuilder.limit).toHaveBeenCalledWith(10)
		})

		it('throws BadRequestException on query error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error' }
				})
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			await expect(
				service.getTenantPaymentHistory(mockTenantId)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('batchFetchPaymentStatuses', () => {
		it('returns empty map when no tenant IDs provided', async () => {
			const result = await service.batchFetchPaymentStatuses([])
			expect(result).toEqual(new Map())
		})

		it('returns payment statuses mapped by tenant ID', async () => {
			const mockPayments = [
				{
					id: 'payment-1',
					tenant_id: 'tenant-1',
					status: 'succeeded',
					created_at: '2024-01-01T00:00:00Z'
				},
				{
					id: 'payment-2',
					tenant_id: 'tenant-2',
					status: 'pending',
					created_at: '2024-01-01T00:00:00Z'
				}
			]

			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: mockPayments, error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.batchFetchPaymentStatuses([
				'tenant-1',
				'tenant-2'
			])

			expect(result.size).toBe(2)
			expect(result.get('tenant-1')?.id).toBe('payment-1')
			expect(result.get('tenant-2')?.id).toBe('payment-2')
		})

		it('keeps only most recent payment per tenant', async () => {
			const mockPayments = [
				{
					id: 'payment-1',
					tenant_id: 'tenant-1',
					status: 'succeeded',
					created_at: '2024-02-01T00:00:00Z'
				},
				{
					id: 'payment-2',
					tenant_id: 'tenant-1',
					status: 'pending',
					created_at: '2024-01-01T00:00:00Z'
				}
			]

			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: mockPayments, error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.batchFetchPaymentStatuses(['tenant-1'])

			expect(result.size).toBe(1)
			expect(result.get('tenant-1')?.id).toBe('payment-1')
		})

		it('returns empty map on query error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error' }
				})
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.batchFetchPaymentStatuses(['tenant-1'])

			expect(result).toEqual(new Map())
		})
	})
})
