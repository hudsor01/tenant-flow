import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Unit } from '@repo/shared/types/core'
import type {
	UnitInput,
	UnitUpdate
} from '@repo/shared/validation/units'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockRequest } from '../../shared/test-utils/types'
import { createMockUser } from '../../test-utils/mocks'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


// Mock the services
jest.mock('./units.service', () => {
	return {
		UnitsService: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(),
			getStats: jest.fn(),
			findByProperty: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
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
		property_owner_id: 'owner-123',
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
		} as any

		const module: TestingModule = await Test.createTestingModule({
			controllers: [UnitsController],
			providers: [
				UnitsService,
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
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return units with default parameters', async () => {
			const mockUnits = [createMockUnit({ id: 'unit-1' })]
			mockUnitsServiceInstance.findAll.mockResolvedValue(mockUnits)

			const result = await controller.findAll(
				createMockRequest({ user: mockUser }) as any,
				null, // property_id
				null, // status
				null, // search
				10, // limit
				0, // offset
				'created_at', // sortBy
				'desc' // sortOrder
			)

			expect(mockUnitsServiceInstance.findAll).toHaveBeenCalled()
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
			await expect(
				controller.findAll(
					createMockRequest({ user: mockUser }) as any,
					null,
					'INVALID_STATUS',
					null,
					10,
					0,
					'created_at',
					'desc'
				)
			).rejects.toThrow(BadRequestException)
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

			mockUnitsServiceInstance.getStats.mockResolvedValue(mockStats as any)

			const result = await controller.getStats('mock-jwt-token')
			expect(mockUnitsServiceInstance.getStats).toHaveBeenCalledWith('mock-jwt-token')
			expect(result).toEqual(mockStats)
		})
	})

	describe('findByProperty', () => {
		it('should return units for a specific property', async () => {
			const mockUnits = [createMockUnit({ id: 'unit-1', property_id: 'property-123' })]

			mockUnitsServiceInstance.findByProperty.mockResolvedValue(mockUnits)

			const result = await controller.findByProperty(
				'mock-jwt-token',
				'property-123'
			)

			expect(mockUnitsServiceInstance.findByProperty).toHaveBeenCalledWith(
				'mock-jwt-token',
				'property-123'
			)
			expect(result).toEqual(mockUnits)
		})
	})

	describe('findOne', () => {
		it('should return a unit by ID', async () => {
			const mockUnit = createMockUnit({ id: 'unit-1' })

			mockUnitsServiceInstance.findOne.mockResolvedValue(mockUnit)

			const result = await controller.findOne(
				'mock-jwt-token',
				'unit-1'
			)
			expect(mockUnitsServiceInstance.findOne).toHaveBeenCalledWith(
				'mock-jwt-token',
				'unit-1'
			)
			expect(result).toEqual(mockUnit)
		})

		it('should throw NotFoundException when unit not found', async () => {
			mockUnitsServiceInstance.findOne.mockImplementation(() => Promise.resolve(null))

			await expect(
				controller.findOne(
					'mock-jwt-token',
					'non-existent'
				)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create a new unit', async () => {
			const mockUnit = createMockUnit(validUnitInput)

			mockUnitsServiceInstance.create.mockResolvedValue(mockUnit)

			const result = await controller.create(
				'mock-jwt-token',
				validUnitInput
			)
			expect(mockUnitsServiceInstance.create).toHaveBeenCalledWith(
				'mock-jwt-token',
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
				'mock-jwt-token',
				'unit-1',
				validUnitUpdate
			)
			expect(mockUnitsServiceInstance.update).toHaveBeenCalledWith(
				'mock-jwt-token',
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

			const result = await controller.remove(
				'mock-jwt-token',
				'unit-1'
			)

			expect(mockUnitsServiceInstance.remove).toHaveBeenCalledWith(
				'mock-jwt-token',
				'unit-1'
			)
			expect(result.message).toBe('Unit deleted successfully')
		})
	})
})
