import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantStatsService } from './tenant-stats.service'

describe('TenantStatsService', () => {
	let service: TenantStatsService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUserId = 'user-123'
	const mockToken = 'token-123'

	beforeEach(async () => {
		const mockAdminClient = {
			from: jest.fn()
		}
		const mockUserClient = {
			from: jest.fn(),
			rpc: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
			getUserClient: jest.fn().mockReturnValue(mockUserClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				TenantStatsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantStatsService>(TenantStatsService)
	})

	describe('getStats', () => {
		it('returns tenant statistics for user', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const mockTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest
					.fn()
					.mockResolvedValue({ data: { id: 'tenant-1' }, error: null })
			}
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: ['tenant-2', 'tenant-3'],
				error: null
			})
			;(mockClient.from as jest.Mock).mockReturnValue(mockTenantBuilder)

			const result = await service.getStats(mockUserId, mockToken)

			expect(result.total).toBe(3)
			expect(result.active).toBe(3)
			expect(result.inactive).toBe(0)
			expect(result.totalTenants).toBe(3)
			expect(result.activeTenants).toBe(3)
			expect(mockClient.from).toHaveBeenCalledWith('tenants')
		})

		it('throws BadRequestException when user ID is missing', async () => {
			await expect(service.getStats('', mockToken)).rejects.toThrow(
				BadRequestException
			)
		})

		it('throws BadRequestException on query error', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})
			const mockTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockTenantBuilder)

			await expect(service.getStats(mockUserId, mockToken)).rejects.toThrow(
				BadRequestException
			)
		})

		it('returns zero counts when no tenants found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const mockTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})
			;(mockClient.from as jest.Mock).mockReturnValue(mockTenantBuilder)

			const result = await service.getStats(mockUserId, mockToken)

			expect(result.total).toBe(0)
			expect(result.active).toBe(0)
		})
	})

	describe('getSummary', () => {
		it('returns tenant summary for user', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const mockTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest
					.fn()
					.mockResolvedValue({ data: { id: 'tenant-1' }, error: null })
			}
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: ['tenant-2'],
				error: null
			})
			;(mockClient.from as jest.Mock).mockReturnValue(mockTenantBuilder)

			const result = await service.getSummary(mockUserId, mockToken)

			expect(result.total).toBe(2)
			expect(result.active).toBe(2)
			expect(result.invited).toBe(0)
			expect(result.overdueBalanceCents).toBe(0)
			expect(result.upcomingDueCents).toBe(0)
			expect(result.timestamp).toBeDefined()
		})

		it('throws BadRequestException when user ID is missing', async () => {
			await expect(service.getSummary('', mockToken)).rejects.toThrow(
				BadRequestException
			)
		})

		it('returns zero counts when no tenants found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const mockTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})
			;(mockClient.from as jest.Mock).mockReturnValue(mockTenantBuilder)

			const result = await service.getSummary(mockUserId, mockToken)

			expect(result.total).toBe(0)
			expect(result.active).toBe(0)
		})
	})

	describe('fetchPaymentStatuses', () => {
		it('returns empty array when no tenant IDs provided', async () => {
			const result = await service.fetchPaymentStatuses([])
			expect(result).toEqual([])
		})

		it('returns payment statuses for multiple tenants', async () => {
			const mockPayments = [
				{
					id: 'payment-1',
					tenant_id: 'tenant-1',
					status: 'succeeded',
					amount: 1500,
					currency: 'usd',
					created_at: '2024-01-01T00:00:00Z'
				},
				{
					id: 'payment-2',
					tenant_id: 'tenant-2',
					status: 'pending',
					amount: 1200,
					currency: 'usd',
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

			const result = await service.fetchPaymentStatuses([
				'tenant-1',
				'tenant-2'
			])

			expect(result).toHaveLength(2)
			expect(result[0]?.tenant_id).toBe('tenant-1')
			expect(result[1]?.tenant_id).toBe('tenant-2')
		})

		it('keeps only most recent payment per tenant', async () => {
			const mockPayments = [
				{
					id: 'payment-1',
					tenant_id: 'tenant-1',
					status: 'succeeded',
					amount: 1500,
					currency: 'usd',
					created_at: '2024-02-01T00:00:00Z' // More recent
				},
				{
					id: 'payment-2',
					tenant_id: 'tenant-1',
					status: 'pending',
					amount: 1200,
					currency: 'usd',
					created_at: '2024-01-01T00:00:00Z' // Older
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

			const result = await service.fetchPaymentStatuses(['tenant-1'])

			// Should only return the most recent payment
			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe('payment-1')
		})

		it('returns empty array on query error', async () => {
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

			const result = await service.fetchPaymentStatuses(['tenant-1'])

			expect(result).toEqual([])
		})
	})
})
