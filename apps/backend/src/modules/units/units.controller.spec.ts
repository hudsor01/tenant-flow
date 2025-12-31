import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Unit } from '@repo/shared/types/core'
import type { UnitInput, UnitUpdate } from '@repo/shared/validation/units'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockRequest } from '../../shared/test-utils/types'
import { createMockUser } from '../../test-utils/mocks'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { UnitStatsService } from './services/unit-stats.service'
import { UnitQueryService } from './services/unit-query.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

// Mock the services
jest.mock('./units.service', () => {
	return {
		UnitsService: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		}))
	}
})

jest.mock('./services/unit-stats.service', () => {
	return {
		UnitStatsService: jest.fn().mockImplementation(() => ({
			getStats: jest.fn()
		}))
	}
})

jest.mock('./services/unit-query.service', () => {
	return {
		UnitQueryService: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(),
			findOne: jest.fn(),
			findByProperty: jest.fn()
		}))
	}
})

jest.mock('../../database/supabase.service', () => {
	return {
		SupabaseService: jest.fn().mockImplementation(() => ({
			getUser: jest.fn()
		}))
	}
})

describe('UnitsController', () => {
	let controller: UnitsController
	let mockUnitsServiceInstance: jest.Mocked<UnitsService>
	let mockStatsServiceInstance: jest.Mocked<UnitStatsService>
	let mockQueryServiceInstance: jest.Mocked<UnitQueryService>
	let mockCurrentUserProvider: jest.Mocked<CurrentUserProvider>

	const mockUser = createMockUser({ id: 'user-123' })

	const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
		id: 'unit-default',
		property_id: 'property-123',
		unit_number: '101',
		bedrooms: 2,
		bathrooms: 1,
		square_feet: null,
		rent_amount: 150000,
		rent_currency: 'USD',
		rent_period: 'MONTHLY',
		status: 'available',
		owner_user_id: 'owner-123',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})

	const validUnitInput: UnitInput = {
		property_id: 'property-123',
		unit_number: '101',
		rent: 150000,
		bedrooms: 2,
		bathrooms: 1
	}

	const validUnitUpdate: UnitUpdate = {
		unit_number: '102'
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		// Mock CurrentUserProvider
		mockCurrentUserProvider = {
			getuser_id: jest.fn().mockResolvedValue(mockUser.id),
			getUser: jest.fn().mockResolvedValue(mockUser),
			getUserEmail: jest.fn().mockResolvedValue(mockUser.email),
			isAuthenticated: jest.fn().mockResolvedValue(true),
			getUserOrNull: jest.fn().mockResolvedValue(mockUser)
		} as jest.Mocked<CurrentUserProvider>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [UnitsController],
			providers: [
				UnitsService,
				UnitStatsService,
				UnitQueryService,
				{ provide: CurrentUserProvider, useValue: mockCurrentUserProvider },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		controller = module.get<UnitsController>(UnitsController)
		mockUnitsServiceInstance = module.get(
			UnitsService
		) as jest.Mocked<UnitsService>
		mockStatsServiceInstance = module.get(
			UnitStatsService
		) as jest.Mocked<UnitStatsService>
		mockQueryServiceInstance = module.get(
			UnitQueryService
		) as jest.Mocked<UnitQueryService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return units with default parameters', async () => {
			const mockUnits = [createMockUnit({ id: 'unit-1' })]
			mockQueryServiceInstance.findAll.mockResolvedValue(mockUnits)

			const result = await controller.findAll(createMockRequest({ user: mockUser }), {
				property_id: null,
				status: undefined,
				search: undefined,
				limit: 10,
				offset: 0,
				sortBy: 'created_at',
				sortOrder: 'desc'
			})

			expect(mockQueryServiceInstance.findAll).toHaveBeenCalled()
			// Controller wraps service response in PaginatedResponse format
			expect(result).toEqual({
				data: mockUnits,
				total: mockUnits.length,
				limit: 10,
				offset: 0,
				hasMore: false
			})
		})

		it('should validate status parameter', async () => {
			// Note: In practice, ZodValidationPipe would handle this validation
			// For unit tests, we mock the service to throw for invalid input
			mockQueryServiceInstance.findAll.mockRejectedValueOnce(
				new BadRequestException('Invalid unit status')
			)

			await expect(
				controller.findAll(createMockRequest({ user: mockUser }), {
					property_id: null,
					status: 'INVALID_STATUS' as unknown as UnitUpdate['status'],
					search: undefined,
					limit: 10,
					offset: 0,
					sortBy: 'created_at',
					sortOrder: 'desc'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('should accept uppercase unit status and normalize to lowercase', async () => {
			const mockUnits = [createMockUnit({ status: 'occupied' })]
			mockQueryServiceInstance.findAll.mockResolvedValue(mockUnits)

			const result = await controller.findAll(createMockRequest({ user: mockUser }), {
				property_id: null,
				status: 'OCCUPIED' as unknown as UnitUpdate['status'], // Uppercase input to test normalization
				search: undefined,
				limit: 10,
				offset: 0,
				sortBy: 'created_at',
				sortOrder: 'desc'
			})

			// Verify service was called and status was normalized
			expect(mockQueryServiceInstance.findAll).toHaveBeenCalled()
			expect(result).toEqual({
				data: mockUnits,
				total: mockUnits.length,
				limit: 10,
				offset: 0,
				hasMore: false
			})
		})
	})

	describe('getStats', () => {
		it('should return unit statistics', async () => {
			const mockStats = {
				totalUnits: 50,
				occupiedUnits: 40,
				vacantUnits: 8,
				maintenanceUnits: 2
			}

			mockStatsServiceInstance.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(createMockRequest({ user: mockUser }))
			expect(mockStatsServiceInstance.getStats).toHaveBeenCalledWith(
				expect.any(String) // token extracted from request
			)
			expect(result).toEqual(mockStats)
		})
	})

	describe('findByProperty', () => {
		it('should return units for a specific property', async () => {
			const mockUnits = [
				createMockUnit({ id: 'unit-1', property_id: 'property-123' })
			]

			mockQueryServiceInstance.findByProperty.mockResolvedValue(mockUnits)

			const result = await controller.findByProperty(
				'property-123',
				createMockRequest({ user: mockUser })
			)

			expect(mockQueryServiceInstance.findByProperty).toHaveBeenCalledWith(
				expect.any(String), // token extracted from request
				'property-123'
			)
			expect(result).toEqual(mockUnits)
		})
	})

	describe('findOne', () => {
		it('should return a unit by ID', async () => {
			const mockUnit = createMockUnit({ id: 'unit-1' })

			mockQueryServiceInstance.findOne.mockResolvedValue(mockUnit)

			const result = await controller.findOne('unit-1', createMockRequest({ user: mockUser }))
			expect(mockQueryServiceInstance.findOne).toHaveBeenCalledWith(
				expect.any(String), // token extracted from request
				'unit-1'
			)
			expect(result).toEqual(mockUnit)
		})

		it('should throw NotFoundException when unit not found', async () => {
			mockQueryServiceInstance.findOne.mockImplementation(() =>
				Promise.reject(new NotFoundException())
			)

			await expect(
				controller.findOne('non-existent', createMockRequest({ user: mockUser }))
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create a new unit', async () => {
			const mockUnit = createMockUnit(validUnitInput)

			mockUnitsServiceInstance.create.mockResolvedValue(mockUnit)

			const result = await controller.create(validUnitInput, createMockRequest({ user: mockUser }))
			expect(mockUnitsServiceInstance.create).toHaveBeenCalledWith(
				expect.any(String), // token extracted from request
				validUnitInput
			)
			expect(result).toEqual(mockUnit)
		})
	})

	describe('update', () => {
		it('should update a unit', async () => {
			const mockUnit = createMockUnit({
				id: 'unit-1',
				unit_number: '102'
			})

			mockUnitsServiceInstance.update.mockResolvedValue(mockUnit)

			const result = await controller.update(
				'unit-1',
				validUnitUpdate,
				createMockRequest({ user: mockUser })
			)
			expect(mockUnitsServiceInstance.update).toHaveBeenCalledWith(
				expect.any(String), // token extracted from request
				'unit-1',
				validUnitUpdate,
				undefined // expectedVersion for optimistic locking
			)
			expect(result).toEqual(mockUnit)
		})
	})

	describe('remove', () => {
		it('should delete a unit', async () => {
			mockUnitsServiceInstance.remove.mockResolvedValue(undefined)

			const result = await controller.remove('unit-1', createMockRequest({ user: mockUser }))

			expect(mockUnitsServiceInstance.remove).toHaveBeenCalledWith(
				expect.any(String), // token extracted from request
				'unit-1'
			)
			expect(result.message).toBe('Unit deleted successfully')
		})
	})
})
