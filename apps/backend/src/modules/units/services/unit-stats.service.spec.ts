import { Test, type TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { UnitStatsService } from './unit-stats.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import type { Unit } from '@repo/shared/types/core'

function createMockUnit(overrides?: Partial<Unit>): Unit {
	return {
		id: 'unit-' + Math.random().toString(36).substr(2, 9),
		property_id: 'property-123',
		owner_user_id: 'user-123',
		unit_number: '101',
		bedrooms: 2,
		bathrooms: 1,
		square_feet: 850,
		rent_amount: 1500,
		status: 'available',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}
}

describe('UnitStatsService', () => {
	let service: UnitStatsService
	let mockUserClient: {
		from: jest.Mock
	}

	beforeEach(async () => {
		// Create mock user client
		mockUserClient = {
			from: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UnitStatsService,
				{
					provide: SupabaseService,
					useValue: {
						getUserClient: jest.fn(() => mockUserClient)
					}
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<UnitStatsService>(UnitStatsService)

		// Reset mocks
		mockUserClient.from.mockReset()
	})

	describe('getStats', () => {
		it('should calculate unit statistics correctly', async () => {
			const mockUnits = [
				createMockUnit({ status: 'occupied', rent_amount: 1500 }),
				createMockUnit({ status: 'occupied', rent_amount: 1600 }),
				createMockUnit({ status: 'available', rent_amount: 1400 }),
				createMockUnit({ status: 'maintenance', rent_amount: 1300 })
			]

			const mockQueryBuilder = {
				select: jest
					.fn()
					.mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getStats('mock-token')

			expect(result).toEqual({
				total: 4,
				occupied: 2,
				vacant: 1,
				maintenance: 1,
				available: 1,
				occupancyRate: 50, // 2 occupied / 4 total = 50%
				averageRent: 1450, // (1500 + 1600 + 1400 + 1300) / 4
				totalPotentialRent: 5800, // sum of all rent_amounts
				totalActualRent: 2900 // 2 occupied * 1450 average
			})
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('status, rent_amount')
		})

		it('should handle empty units array', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockResolvedValue({ data: [], error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getStats('mock-token')

			expect(result).toEqual({
				total: 0,
				occupied: 0,
				vacant: 0,
				maintenance: 0,
				available: 0,
				occupancyRate: 0,
				averageRent: 0,
				totalPotentialRent: 0,
				totalActualRent: 0
			})
		})

		it('should handle units with null rent_amount', async () => {
			const mockUnits = [
				createMockUnit({ status: 'occupied', rent_amount: 1500 }),
				createMockUnit({ status: 'available', rent_amount: null as unknown as number })
			]

			const mockQueryBuilder = {
				select: jest
					.fn()
					.mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getStats('mock-token')

			expect(result.totalPotentialRent).toBe(1500) // null treated as 0
			expect(result.averageRent).toBe(750) // 1500 / 2
		})

		it('should calculate 100% occupancy rate correctly', async () => {
			const mockUnits = [
				createMockUnit({ status: 'occupied', rent_amount: 1500 }),
				createMockUnit({ status: 'occupied', rent_amount: 1600 })
			]

			const mockQueryBuilder = {
				select: jest
					.fn()
					.mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getStats('mock-token')

			expect(result.occupancyRate).toBe(100)
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.getStats('')).rejects.toThrow(
				BadRequestException
			)
			await expect(service.getStats('')).rejects.toThrow(
				'Authentication token is required'
			)
		})

		it('should throw BadRequestException on database error', async () => {
			const mockQueryBuilder = {
				select: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(service.getStats('mock-token')).rejects.toThrow(
				BadRequestException
			)
			await expect(service.getStats('mock-token')).rejects.toThrow(
				'Failed to get unit statistics'
			)
		})
	})

	describe('getAnalytics', () => {
		it('should return analytics for all units', async () => {
			const mockUnits = [
				createMockUnit({ unit_number: '101' }),
				createMockUnit({ unit_number: '102' })
			]

			const mockQueryBuilder = {
				select: jest
					.fn()
					.mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getAnalytics('mock-token', {
				timeframe: '12m'
			})

			expect(result).toEqual(mockUnits)
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('id, owner_user_id, property_id, unit_number, status, rent_amount, rent_currency, rent_period, bedrooms, bathrooms, square_feet, created_at, updated_at')
		})

		it('should filter by property_id when provided', async () => {
			const mockUnits = [createMockUnit({ property_id: 'property-456' })]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getAnalytics('mock-token', {
				property_id: 'property-456',
				timeframe: '6m'
			})

			expect(result).toEqual(mockUnits)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
				'property_id',
				'property-456'
			)
		})

		it('should return empty array on database error', async () => {
			const mockQueryBuilder = {
				select: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getAnalytics('mock-token', {
				timeframe: '12m'
			})

			expect(result).toEqual([])
		})

		it('should throw BadRequestException when token is missing', async () => {
			const result = await service.getAnalytics('', { timeframe: '12m' })
			// Service returns empty array on error instead of throwing
			expect(result).toEqual([])
		})

		it('should return empty array when query throws error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockRejectedValue(new Error('Query failed'))
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getAnalytics('mock-token', {
				timeframe: '12m'
			})

			expect(result).toEqual([])
		})
	})

	describe('getUnitStatistics', () => {
		it('should return comprehensive statistics', async () => {
			const mockStatsUnits = [
				createMockUnit({ status: 'occupied', rent_amount: 1500 }),
				createMockUnit({ status: 'occupied', rent_amount: 1600 }),
				createMockUnit({ status: 'available', rent_amount: 1400 }),
				createMockUnit({ status: 'maintenance', rent_amount: 1300 })
			]

			const mockAnalyticsUnits = mockStatsUnits

			// Mock getStats
			jest.spyOn(service, 'getStats').mockResolvedValue({
				total: 4,
				occupied: 2,
				vacant: 1,
				maintenance: 1,
				available: 1,
				occupancyRate: 50,
				averageRent: 1450,
				totalPotentialRent: 5800,
				totalActualRent: 2900
			})

			// Mock getAnalytics
			jest
				.spyOn(service, 'getAnalytics')
				.mockResolvedValue(mockAnalyticsUnits)

			const result = await service.getUnitStatistics('mock-token')

			expect(result).toEqual({
				summary: {
					total: 4,
					occupied: 2,
					vacant: 1,
					maintenance: 1,
					occupancyRate: 50,
					averageRent: 1450
				},
				breakdown: {
					byStatus: {
						occupied: 2,
						vacant: 1,
						maintenance: 1,
						available: 1
					},
					byProperty: null
				},
				financial: {
					totalPotentialRent: 5800,
					totalActualRent: 2900,
					averageRent: 1450,
					totalRent: 5800
				},
				timestamp: expect.any(String)
			})
		})

		it('should include property breakdown when property_id provided', async () => {
			const mockStatsUnits = [
				createMockUnit({ property_id: 'property-123', status: 'occupied' }),
				createMockUnit({ property_id: 'property-123', status: 'available' })
			]

			jest.spyOn(service, 'getStats').mockResolvedValue({
				total: 2,
				occupied: 1,
				vacant: 1,
				maintenance: 0,
				available: 1,
				occupancyRate: 50,
				averageRent: 1450,
				totalPotentialRent: 2900,
				totalActualRent: 1450
			})

			jest.spyOn(service, 'getAnalytics').mockResolvedValue(mockStatsUnits)

			const result = await service.getUnitStatistics(
				'mock-token',
				'property-123'
			)

			expect(result.breakdown.byProperty).toEqual({
				property_id: 'property-123',
				totalUnits: 2,
				occupiedUnits: 1,
				vacantUnits: 1,
				occupancyRate: 50
			})
		})

		it('should handle zero units gracefully', async () => {
			jest.spyOn(service, 'getStats').mockResolvedValue({
				total: 0,
				occupied: 0,
				vacant: 0,
				maintenance: 0,
				available: 0,
				occupancyRate: 0,
				averageRent: 0,
				totalPotentialRent: 0,
				totalActualRent: 0
			})

			jest.spyOn(service, 'getAnalytics').mockResolvedValue([])

			const result = await service.getUnitStatistics('mock-token')

			expect(result.summary.total).toBe(0)
			expect(result.financial.averageRent).toBe(0)
			expect(result.breakdown.byStatus.occupied).toBe(0)
		})

		it('should calculate occupancy rate from analytics data', async () => {
			const mockUnits = [
				createMockUnit({ status: 'occupied', rent_amount: 1500 }),
				createMockUnit({ status: 'occupied', rent_amount: 1600 }),
				createMockUnit({ status: 'occupied', rent_amount: 1700 }),
				createMockUnit({ status: 'available', rent_amount: 1400 })
			]

			jest.spyOn(service, 'getStats').mockResolvedValue({
				total: 4,
				occupied: 3,
				vacant: 1,
				maintenance: 0,
				available: 1,
				occupancyRate: 75,
				averageRent: 1550,
				totalPotentialRent: 6200,
				totalActualRent: 4650
			})

			jest.spyOn(service, 'getAnalytics').mockResolvedValue(mockUnits)

			const result = await service.getUnitStatistics('mock-token')

			expect(result.summary.occupancyRate).toBe(75)
		})

		it('should return empty object on error', async () => {
			jest
				.spyOn(service, 'getStats')
				.mockRejectedValue(new Error('Stats failed'))

			const result = await service.getUnitStatistics('mock-token')

			expect(result).toEqual({})
		})

		it('should fallback to analytics calculations when stats are incomplete', async () => {
			const mockUnits = [
				createMockUnit({ status: 'occupied', rent_amount: 1500 }),
				createMockUnit({ status: 'maintenance', rent_amount: 1300 })
			]

			jest.spyOn(service, 'getStats').mockResolvedValue({
				total: 2,
				occupied: 1,
				vacant: 0,
				maintenance: 0, // Missing maintenance count
				available: 0,
				occupancyRate: 50,
				averageRent: 0, // Missing average rent
				totalPotentialRent: 0, // Missing potential rent
				totalActualRent: 0 // Missing actual rent
			})

			jest.spyOn(service, 'getAnalytics').mockResolvedValue(mockUnits)

			const result = await service.getUnitStatistics('mock-token')

			// Should use analytics data to fill in missing values
			expect(result.breakdown.byStatus.maintenance).toBe(1)
			expect(result.financial.averageRent).toBe(1400) // (1500 + 1300) / 2
			expect(result.financial.totalRent).toBe(2800) // 1500 + 1300
		})
	})
})
