import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { LeaseFinancialService } from './lease-financial.service'

describe('LeaseFinancialService', () => {
	let service: LeaseFinancialService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockToken = 'mock-jwt-token'

	// Mock Supabase query builder
	const createMockQueryBuilder = (
		data: unknown[] | null,
		error: Error | null = null
	) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			neq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
			then: jest.fn(resolve => resolve({ data, error }))
		}
		return {
			...builder,
			[Symbol.toStringTag]: 'Promise',
			then: (
				resolve: (value: {
					data: unknown[] | null
					error: Error | null
				}) => void
			) => Promise.resolve({ data, error }).then(resolve),
			catch: jest.fn(),
			finally: jest.fn()
		}
	}

	beforeEach(async () => {
		const mockUserClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				LeaseFinancialService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LeaseFinancialService>(LeaseFinancialService)
	})

	describe('getStats', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(service.getStats('')).rejects.toThrow(BadRequestException)
		})

		it('returns empty stats when no leases exist', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder([])
			)

			const result = await service.getStats(mockToken)

			expect(result).toEqual({
				totalLeases: 0,
				activeLeases: 0,
				expiredLeases: 0,
				terminatedLeases: 0,
				totalMonthlyRent: 0,
				averageRent: 0,
				totalsecurity_deposits: 0,
				expiringLeases: 0
			})
		})

		it('calculates stats correctly from leases', async () => {
			const now = new Date()
			const thirtyDaysFromNow = new Date(
				now.getTime() + 30 * 24 * 60 * 60 * 1000
			)

			const mockLeases = [
				{
					lease_status: 'active',
					rent_amount: 1000,
					security_deposit: 500,
					end_date: thirtyDaysFromNow.toISOString()
				},
				{
					lease_status: 'active',
					rent_amount: 1500,
					security_deposit: 750,
					end_date: new Date(
						now.getTime() + 60 * 24 * 60 * 60 * 1000
					).toISOString()
				},
				{
					lease_status: 'ended',
					rent_amount: 800,
					security_deposit: 400,
					end_date: new Date(
						now.getTime() - 30 * 24 * 60 * 60 * 1000
					).toISOString()
				},
				{
					lease_status: 'terminated',
					rent_amount: 1200,
					security_deposit: 600,
					end_date: null
				}
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(mockLeases)
			)

			const result = await service.getStats(mockToken)

			expect(result.totalLeases).toBe(4)
			expect(result.activeLeases).toBe(2)
			expect(result.expiredLeases).toBe(1)
			expect(result.terminatedLeases).toBe(1)
			expect(result.totalMonthlyRent).toBe(2500) // 1000 + 1500 (active only)
			expect(result.totalsecurity_deposits).toBe(2250) // sum of all
		})
	})

	describe('getExpiring', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(service.getExpiring('')).rejects.toThrow(BadRequestException)
		})

		it('returns expiring leases within specified days', async () => {
			const expiringLeases = [
				{
					id: '1',
					lease_status: 'active',
					end_date: new Date(
						Date.now() + 15 * 24 * 60 * 60 * 1000
					).toISOString()
				}
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(expiringLeases)
			)

			const result = await service.getExpiring(mockToken, 30)

			expect(result).toHaveLength(1)
			expect(mockClient.from).toHaveBeenCalledWith('leases')
		})

		it('returns empty array when no leases are expiring', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder([])
			)

			const result = await service.getExpiring(mockToken, 30)

			expect(result).toEqual([])
		})

		it('uses default 30 days when not specified', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder([])
			)

			await service.getExpiring(mockToken)

			expect(mockClient.from).toHaveBeenCalledWith('leases')
		})
	})

	describe('getAnalytics', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(
				service.getAnalytics('', { timeframe: '90d' })
			).rejects.toThrow(BadRequestException)
		})

		it('returns analytics data for leases', async () => {
			const mockLeases = [
				{ id: '1', lease_status: 'active', rent_amount: 1000 },
				{ id: '2', lease_status: 'active', rent_amount: 1500 }
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(mockLeases)
			)

			const result = await service.getAnalytics(mockToken, { timeframe: '90d' })

			expect(result).toHaveLength(2)
		})

		it('filters by lease_id when provided', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const queryBuilder = createMockQueryBuilder([])
			;(mockClient.from as jest.Mock).mockReturnValue(queryBuilder)

			await service.getAnalytics(mockToken, {
				lease_id: 'test-lease-id',
				timeframe: '90d'
			})

			expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'test-lease-id')
		})

		it('filters by property_id when provided', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const queryBuilder = createMockQueryBuilder([])
			;(mockClient.from as jest.Mock).mockReturnValue(queryBuilder)

			await service.getAnalytics(mockToken, {
				property_id: 'test-property-id',
				timeframe: '90d'
			})

			expect(queryBuilder.eq).toHaveBeenCalledWith(
				'property_id',
				'test-property-id'
			)
		})
	})

	describe('getPaymentHistory', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(service.getPaymentHistory('', 'lease-id')).rejects.toThrow(
				BadRequestException
			)
		})

		it('throws BadRequestException when lease_id is missing', async () => {
			await expect(service.getPaymentHistory(mockToken, '')).rejects.toThrow(
				BadRequestException
			)
		})

		it('returns payment history for a lease', async () => {
			const mockLease = { id: 'lease-id', lease_status: 'active' }
			const mockPayments = [
				{ id: '1', amount: 1000, payment_date: '2024-01-01' },
				{ id: '2', amount: 1000, payment_date: '2024-02-01' }
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)

			// First call for findOne (lease verification)
			const leaseQueryBuilder = createMockQueryBuilder([mockLease])
			// Second call for rent_payments
			const paymentsQueryBuilder = createMockQueryBuilder(mockPayments)

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(leaseQueryBuilder)
				.mockReturnValueOnce(paymentsQueryBuilder)

			const result = await service.getPaymentHistory(mockToken, 'lease-id')

			expect(result).toHaveLength(2)
		})

		it('throws BadRequestException when lease not found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(null)
			)

			await expect(
				service.getPaymentHistory(mockToken, 'invalid-lease-id')
			).rejects.toThrow(BadRequestException)
		})
	})
})
