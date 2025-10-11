import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type {
	CreateUnitRequest,
	UpdateUnitRequest
} from '@repo/shared/types/backend-domain'
import type { Unit } from '@repo/shared/types/core'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'
import { createMockUser } from '../../test-utils/mocks'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'

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
	let mockSupabaseServiceInstance: jest.Mocked<SupabaseService>

	const mockUser = createMockUser({ id: 'user-123' })

	const mockRequest = {} as Request

	const generateUUID = () =>
		'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
			const r = (Math.random() * 16) | 0
			const v = c === 'x' ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})

	const createMockUnit = (overrides: Record<string, unknown> = {}) => ({
		id: generateUUID(),
		unitNumber: '1A',
		propertyId: generateUUID(),
		bedrooms: 2,
		bathrooms: 1,
		rent: 1500,
		squareFeet: 800,
		status: 'VACANT' as const,
		lastInspectionDate: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	})

	const validCreateUnitRequest: CreateUnitRequest = {
		propertyId: 'property-123',
		unitNumber: '2A',
		bedrooms: 2,
		bathrooms: 1,
		rent: 1500,
		status: 'VACANT'
	}

	const validUpdateUnitRequest: UpdateUnitRequest = {
		rent: 1600
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [UnitsController],
			providers: [UnitsService, SupabaseService]
		}).compile()

		controller = module.get<UnitsController>(UnitsController)
		mockUnitsServiceInstance = module.get(
			UnitsService
		) as jest.Mocked<UnitsService>
		mockSupabaseServiceInstance = module.get(
			SupabaseService
		) as jest.Mocked<SupabaseService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return units with default parameters', async () => {
			const mockUnits = [createMockUnit()]

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findAll.mockResolvedValue(mockUnits)

			const result = await controller.findAll(
				null,
				null,
				null,
				10,
				0,
				'createdAt',
				'desc',
				mockRequest
			)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					propertyId: null,
					status: null,
					search: null,
					limit: 10,
					offset: 0,
					sortBy: 'createdAt',
					sortOrder: 'desc'
				}
			)
			expect(result).toEqual(mockUnits)
		})

		it('should handle all query parameters', async () => {
			const mockUnits: Unit[] = []

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findAll.mockResolvedValue(mockUnits)

			await controller.findAll(
				'property-123',
				'VACANT',
				'apartment',
				20,
				10,
				'unitNumber',
				'asc',
				mockRequest
			)

			expect(mockUnitsServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					propertyId: 'property-123',
					status: 'VACANT',
					search: 'apartment',
					limit: 20,
					offset: 10,
					sortBy: 'unitNumber',
					sortOrder: 'asc'
				}
			)
		})

		it('should validate status parameter', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			await expect(
				controller.findAll(
					null,
					'INVALID_STATUS',
					null,
					10,
					0,
					'createdAt',
					'desc',
					mockRequest
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid status values', async () => {
			const validStatuses = ['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findAll.mockResolvedValue([])

			for (const status of validStatuses) {
				await expect(
					controller.findAll(
						null,
						status,
						null,
						10,
						0,
						'createdAt',
						'desc',
						mockRequest
					)
				).resolves.toBeDefined()
			}
		})

		it('should validate sortBy parameter', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			await expect(
				controller.findAll(
					null,
					null,
					null,
					10,
					0,
					'invalidSort',
					'desc',
					mockRequest
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid sortBy values', async () => {
			const validSortBy = [
				'createdAt',
				'unitNumber',
				'bedrooms',
				'rent',
				'status'
			]

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findAll.mockResolvedValue([])

			for (const sortBy of validSortBy) {
				await expect(
					controller.findAll(
						null,
						null,
						null,
						10,
						0,
						sortBy,
						'desc',
						mockRequest
					)
				).resolves.toBeDefined()
			}
		})

		it('should validate sortOrder parameter', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			await expect(
				controller.findAll(
					null,
					null,
					null,
					10,
					0,
					'createdAt',
					'invalid',
					mockRequest
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.findAll(
				null,
				null,
				null,
				10,
				0,
				'createdAt',
				'desc',
				mockRequest
			)

			expect(result).toEqual({
				message: 'Units service not available',
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})
		})
	})

	describe('getStats', () => {
		it('should return unit statistics', async () => {
			const mockStats = {
				total: 50,
				vacant: 5,
				occupied: 40,
				maintenance: 3,
				unavailable: 2,
				available: 5,
				occupancyRate: 80,
				occupancyChange: 5,
				averageRent: 1500,
				totalRent: 75000,
				totalPotentialRent: 75000,
				totalActualRent: 60000
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.getStats).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual(mockStats)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.getStats(mockRequest)

			expect(result).toEqual({
				message: 'Units service not available',
				totalUnits: 0,
				vacantUnits: 0,
				occupiedUnits: 0,
				maintenanceUnits: 0,
				reservedUnits: 0
			})
		})
	})

	describe('findByProperty', () => {
		const propertyId = 'property-123'

		it('should return units for property', async () => {
			const mockUnits = [
				createMockUnit({ id: 'unit-1', unitNumber: '1A', propertyId }),
				createMockUnit({ id: 'unit-2', unitNumber: '1B', propertyId })
			]

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findByProperty.mockResolvedValue(mockUnits)

			const result = await controller.findByProperty(propertyId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.findByProperty).toHaveBeenCalledWith(
				mockUser.id,
				propertyId
			)
			expect(result).toEqual(mockUnits)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.findByProperty(
				propertyId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Units service not available',
				propertyId,
				data: []
			})
		})
	})

	describe('findOne', () => {
		const unitId = 'unit-123'

		it('should return single unit', async () => {
			const mockUnit = createMockUnit({
				id: unitId,
				unitNumber: '2A',
				bedrooms: 2
			})

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findOne.mockResolvedValue(mockUnit)

			const result = await controller.findOne(unitId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.findOne).toHaveBeenCalledWith(
				mockUser.id,
				unitId
			)
			expect(result).toEqual(mockUnit)
		})

		it('should throw NotFoundException when unit not found', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.findOne.mockResolvedValue(null)

			await expect(controller.findOne(unitId, mockRequest)).rejects.toThrow(
				NotFoundException
			)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.findOne(unitId, mockRequest)

			expect(result).toEqual({
				message: 'Units service not available',
				id: unitId,
				data: null
			})
		})
	})

	describe('create', () => {
		it('should create new unit', async () => {
			const mockCreatedUnit = createMockUnit({
				id: 'unit-new',
				...validCreateUnitRequest
			})

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.create.mockResolvedValue(mockCreatedUnit)

			const result = await controller.create(
				validCreateUnitRequest,
				mockRequest
			)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.create).toHaveBeenCalledWith(
				mockUser.id,
				validCreateUnitRequest
			)
			expect(result).toEqual(mockCreatedUnit)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.create(
				validCreateUnitRequest,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Units service not available',
				data: validCreateUnitRequest,
				success: false
			})
		})
	})

	describe('update', () => {
		const unitId = 'unit-123'

		it('should update existing unit', async () => {
			const mockUpdatedUnit = createMockUnit({
				id: unitId,
				...validUpdateUnitRequest
			})

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.update.mockResolvedValue(mockUpdatedUnit)

			const result = await controller.update(
				unitId,
				validUpdateUnitRequest,
				mockRequest
			)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.update).toHaveBeenCalledWith(
				mockUser.id,
				unitId,
				validUpdateUnitRequest
			)
			expect(result).toEqual(mockUpdatedUnit)
		})

		it('should throw NotFoundException when unit not found', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.update.mockResolvedValue(null)

			await expect(
				controller.update(unitId, validUpdateUnitRequest, mockRequest)
			).rejects.toThrow(NotFoundException)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.update(
				unitId,
				validUpdateUnitRequest,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Units service not available',
				id: unitId,
				data: validUpdateUnitRequest,
				success: false
			})
		})
	})

	describe('remove', () => {
		const unitId = 'unit-123'

		it('should delete unit successfully', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockUnitsServiceInstance.remove.mockResolvedValue(undefined)

			const result = await controller.remove(unitId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockUnitsServiceInstance.remove).toHaveBeenCalledWith(
				mockUser.id,
				unitId
			)
			expect(result).toEqual({ message: 'Unit deleted successfully' })
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new UnitsController()

			const result = await controllerWithoutService.remove(unitId, mockRequest)

			expect(result).toEqual({
				message: 'Units service not available',
				id: unitId,
				success: false
			})
		})
	})

	describe('user validation fallback behavior', () => {
		it('should use fallback user ID when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)
			mockUnitsServiceInstance.findAll.mockResolvedValue([])

			await controller.findAll(
				null,
				null,
				null,
				10,
				0,
				'createdAt',
				'desc',
				mockRequest
			)

			expect(mockUnitsServiceInstance.findAll).toHaveBeenCalledWith(
				'test-user-id',
				expect.any(Object)
			)
		})

		it('should handle supabase service unavailable', async () => {
			const controllerWithoutSupabase = new UnitsController(
				mockUnitsServiceInstance
			)

			mockUnitsServiceInstance.getStats.mockResolvedValue({
				total: 0,
				vacant: 0,
				occupied: 0,
				maintenance: 0,
				available: 0,
				occupancyRate: 0,
				occupancyChange: 0,
				averageRent: 0,
				totalPotentialRent: 0,
				totalActualRent: 0
			})

			await controllerWithoutSupabase.getStats(mockRequest)

			expect(mockUnitsServiceInstance.getStats).toHaveBeenCalledWith(
				'test-user-id'
			)
		})
	})
})
