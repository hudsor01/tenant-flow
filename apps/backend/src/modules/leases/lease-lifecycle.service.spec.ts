import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { SupabaseService } from '../../database/supabase.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'

describe('LeaseLifecycleService', () => {
	let service: LeaseLifecycleService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockToken = 'mock-jwt-token'

	// Mock Supabase query builder
	const createMockQueryBuilder = (data: unknown | null, error: Error | null = null) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data, error })
		}
		return builder
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
				LeaseLifecycleService,
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LeaseLifecycleService>(LeaseLifecycleService)
	})

	describe('renew', () => {
		const mockLease = {
			id: 'lease-id',
			lease_status: 'active',
			end_date: '2024-12-31',
			rent_amount: 1500
		}

		it('throws BadRequestException when lease not found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(null))

			await expect(
				service.renew(mockToken, 'lease-id', '2025-12-31')
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException for month-to-month lease (no end_date)', async () => {
			const monthToMonthLease = { ...mockLease, end_date: null }
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(monthToMonthLease))

			await expect(
				service.renew(mockToken, 'lease-id', '2025-12-31')
			).rejects.toThrow('Cannot renew a month-to-month lease')
		})

		it('throws BadRequestException when new end date is not after current', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(mockLease))

			await expect(
				service.renew(mockToken, 'lease-id', '2024-06-01')
			).rejects.toThrow('New end date must be after current lease end date')
		})

		it('throws BadRequestException when rent amount is not positive', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(mockLease))

			await expect(
				service.renew(mockToken, 'lease-id', '2025-12-31', -100)
			).rejects.toThrow('Rent amount must be positive')
		})

		it('renews lease successfully', async () => {
			const renewedLease = { ...mockLease, end_date: '2025-12-31' }
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			// First call for findOne, second for update
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createMockQueryBuilder(mockLease))
				.mockReturnValueOnce(createMockQueryBuilder(renewedLease))

			const result = await service.renew(mockToken, 'lease-id', '2025-12-31')

			expect(result).toEqual(renewedLease)
		})

		it('renews lease with new rent amount', async () => {
			const renewedLease = { ...mockLease, end_date: '2025-12-31', rent_amount: 1600 }
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createMockQueryBuilder(mockLease))
				.mockReturnValueOnce(createMockQueryBuilder(renewedLease))

			const result = await service.renew(mockToken, 'lease-id', '2025-12-31', 1600)

			expect(result).toEqual(renewedLease)
		})
	})

	describe('terminate', () => {
		const mockLease = {
			id: 'lease-id',
			lease_status: 'active',
			end_date: '2024-12-31'
		}

		it('throws BadRequestException when lease not found', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(null))

			const futureDate = new Date(Date.now() + 86400000).toISOString()
			await expect(
				service.terminate(mockToken, 'lease-id', futureDate)
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException when termination date is in the past', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(mockLease))

			const pastDate = new Date(Date.now() - 86400000).toISOString()
			await expect(
				service.terminate(mockToken, 'lease-id', pastDate)
			).rejects.toThrow('Termination date cannot be in the past')
		})

		it('throws BadRequestException when lease is already terminated', async () => {
			const terminatedLease = { ...mockLease, lease_status: 'terminated' }
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(terminatedLease))

			const futureDate = new Date(Date.now() + 86400000).toISOString()
			await expect(
				service.terminate(mockToken, 'lease-id', futureDate)
			).rejects.toThrow('Lease is already terminated or expired')
		})

		it('throws BadRequestException when lease is already ended', async () => {
			const endedLease = { ...mockLease, lease_status: 'ended' }
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(endedLease))

			const futureDate = new Date(Date.now() + 86400000).toISOString()
			await expect(
				service.terminate(mockToken, 'lease-id', futureDate)
			).rejects.toThrow('Lease is already terminated or expired')
		})

		it('terminates lease successfully', async () => {
			const futureDate = new Date(Date.now() + 86400000).toISOString()
			const terminatedLease = { ...mockLease, lease_status: 'terminated', end_date: futureDate }
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createMockQueryBuilder(mockLease))
				.mockReturnValueOnce(createMockQueryBuilder(terminatedLease))

			const result = await service.terminate(mockToken, 'lease-id', futureDate)

			expect(result?.lease_status).toBe('terminated')
		})
	})
})
