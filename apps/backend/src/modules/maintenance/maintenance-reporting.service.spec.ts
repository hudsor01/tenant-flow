import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { createMockMaintenanceRequest } from '../../test-utils/mocks'
import { MaintenanceReportingService } from './maintenance-reporting.service'

describe('MaintenanceReportingService', () => {
	let service: MaintenanceReportingService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockToken = 'mock-jwt-token'

	// Mock Supabase query builder
	const createMockQueryBuilder = (data: unknown[] | null, error: Error | null = null) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			neq: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			lt: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
			then: jest.fn((resolve) => resolve({ data, error }))
		}
		// Make it thenable for async/await
		return {
			...builder,
			[Symbol.toStringTag]: 'Promise',
			then: (resolve: (value: { data: unknown[] | null; error: Error | null }) => void) =>
				Promise.resolve({ data, error }).then(resolve),
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
				MaintenanceReportingService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<MaintenanceReportingService>(MaintenanceReportingService)
	})

	describe('getStats', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(service.getStats('')).rejects.toThrow(BadRequestException)
		})

		it('returns empty stats when no maintenance requests exist', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder([]))

			const result = await service.getStats(mockToken)

			expect(result).toEqual({
				total: 0,
				open: 0,
				inProgress: 0,
				completed: 0,
				completedToday: 0,
				avgResolutionTime: 0,
				byPriority: {
					low: 0,
					medium: 0,
					high: 0,
					emergency: 0
				},
				totalCost: 0,
				avgResponseTimeHours: 0
			})
		})

		it('calculates stats correctly from maintenance requests', async () => {
			const now = new Date()
			const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

			const mockRequests = [
				{ status: 'open', priority: 'low', estimated_cost: 100, created_at: now.toISOString(), completed_at: null },
				{ status: 'in_progress', priority: 'normal', estimated_cost: 200, created_at: now.toISOString(), completed_at: null },
				{ status: 'completed', priority: 'high', estimated_cost: 300, created_at: new Date(now.getTime() - 3600000).toISOString(), completed_at: todayStart.toISOString() },
				{ status: 'completed', priority: 'urgent', estimated_cost: 400, created_at: new Date(now.getTime() - 7200000).toISOString(), completed_at: new Date(now.getTime() - 3600000).toISOString() }
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(mockRequests))

			const result = await service.getStats(mockToken)

			expect(result.total).toBe(4)
			expect(result.open).toBe(1)
			expect(result.inProgress).toBe(1)
			expect(result.completed).toBe(2)
			expect(result.byPriority.low).toBe(1)
			expect(result.byPriority.medium).toBe(1)
			expect(result.byPriority.high).toBe(1)
			expect(result.byPriority.emergency).toBe(1)
			expect(result.totalCost).toBe(1000)
		})
	})

	describe('getUrgent', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(service.getUrgent('')).rejects.toThrow(BadRequestException)
		})

		it('returns urgent maintenance requests (high and urgent priority)', async () => {
			const urgentRequests = [
				{ ...createMockMaintenanceRequest(), priority: 'urgent', status: 'open' },
				{ ...createMockMaintenanceRequest(), priority: 'high', status: 'in_progress' }
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(urgentRequests))

			const result = await service.getUrgent(mockToken)

			expect(result).toHaveLength(2)
			expect(mockClient.from).toHaveBeenCalledWith('maintenance_requests')
		})

		it('returns empty array when no urgent requests exist', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder([]))

			const result = await service.getUrgent(mockToken)

			expect(result).toEqual([])
		})
	})

	describe('getOverdue', () => {
		it('throws BadRequestException when token is missing', async () => {
			await expect(service.getOverdue('')).rejects.toThrow(BadRequestException)
		})

		it('returns overdue maintenance requests', async () => {
			const overdueRequests = [
				{ ...createMockMaintenanceRequest(), status: 'open', scheduled_date: new Date(Date.now() - 86400000).toISOString() }
			]

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(overdueRequests))

			const result = await service.getOverdue(mockToken)

			expect(result).toHaveLength(1)
			expect(mockClient.from).toHaveBeenCalledWith('maintenance_requests')
		})

		it('returns empty array when no overdue requests exist', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder([]))

			const result = await service.getOverdue(mockToken)

			expect(result).toEqual([])
		})
	})
})
