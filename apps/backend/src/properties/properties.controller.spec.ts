import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CreatePropertyRequest, UpdatePropertyRequest } from '@repo/shared'
import type { AuthenticatedRequest } from '../shared/types/express-request.types'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { createMockUser, createMockDashboardStats, createMockPropertyStats, createMockPropertyRequest, createMockTenantRequest, createMockUnitRequest } from '../test-utils/mocks'

// Mock the PropertiesService
jest.mock('./properties.service', () => {
	return {
		PropertiesService: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(),
			getStats: jest.fn(),
			findAllWithUnits: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			getPropertyPerformanceAnalytics: jest.fn(),
			getPropertyOccupancyAnalytics: jest.fn(),
			getPropertyFinancialAnalytics: jest.fn(),
			getPropertyMaintenanceAnalytics: jest.fn()
		}))
	}
})

describe('PropertiesController', () => {
	let controller: PropertiesController
	let mockPropertiesServiceInstance: jest.Mocked<PropertiesService>

	const mockUser = createMockUser({ id: 'user-123' })
	const mockRequest = { user: mockUser } as AuthenticatedRequest

	const validCreatePropertyRequest: CreatePropertyRequest = {
		name: 'Test Property',
		address: '123 Test St',
		city: 'Test City',
		state: 'TS',
		zipCode: '12345',
		type: 'apartment',
		units: 10
	}

	const validUpdatePropertyRequest: UpdatePropertyRequest = {
		name: 'Updated Property'
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertiesController],
			providers: [PropertiesService]
		}).compile()

		controller = module.get<PropertiesController>(PropertiesController)
		mockPropertiesServiceInstance = module.get(
			PropertiesService
		) as jest.Mocked<PropertiesService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return properties for authenticated user', async () => {
			const mockProperties = {
				data: [{ id: 'prop-1', name: 'Property 1' }],
				total: 1,
				limit: 10,
				offset: 0
			}

			mockPropertiesServiceInstance.findAll.mockResolvedValue(mockProperties)

			const result = await controller.findAll(null, 10, 0, mockRequest)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: null,
					limit: 10,
					offset: 0
				}
			)
			expect(result).toEqual(mockProperties)
		})

		it('should handle search parameter', async () => {
			const mockProperties = {
				data: [{ id: 'prop-1', name: 'Searched Property' }],
				total: 1,
				limit: 10,
				offset: 0
			}

			mockPropertiesServiceInstance.findAll.mockResolvedValue(mockProperties)

			await controller.findAll('search term', 10, 0, mockRequest)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: 'search term',
					limit: 10,
					offset: 0
				}
			)
		})

		it('should clamp limit to safe bounds', async () => {
			mockPropertiesServiceInstance.findAll.mockResolvedValue({
				data: [],
				total: 0,
				limit: 50,
				offset: 0
			})

			await controller.findAll(null, 100, 0, mockRequest)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: null,
					limit: 50, // Clamped to maximum
					offset: 0
				}
			)
		})

		it('should clamp offset to safe bounds', async () => {
			mockPropertiesServiceInstance.findAll.mockResolvedValue({
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})

			await controller.findAll(null, 10, -5, mockRequest)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: null,
					limit: 10,
					offset: 0 // Clamped to minimum
				}
			)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new PropertiesController()

			const result = await controllerWithoutService.findAll(
				null,
				10,
				0,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Properties service not available',
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})
		})
	})

	describe('getStats', () => {
		it('should return property statistics', async () => {
			const mockStats = {
				totalProperties: 5,
				totalUnits: 20,
				occupiedUnits: 18,
				vacantUnits: 2,
				occupancyRate: 0.9,
				totalRent: 15000
			}

			mockPropertiesServiceInstance.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(mockRequest)

			expect(mockPropertiesServiceInstance.getStats).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual(mockStats)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new PropertiesController()

			const result = await controllerWithoutService.getStats(mockRequest)

			expect(result).toEqual({
				message: 'Properties service not available',
				totalProperties: 0,
				totalUnits: 0,
				occupiedUnits: 0,
				vacantUnits: 0,
				occupancyRate: 0,
				totalRent: 0
			})
		})
	})

	describe('findAllWithUnits', () => {
		it('should return properties with units', async () => {
			const mockPropertiesWithUnits = {
				data: [{ id: 'prop-1', name: 'Property 1', units: [] }],
				total: 1,
				limit: 10,
				offset: 0
			}

			mockPropertiesServiceInstance.findAllWithUnits.mockResolvedValue(
				mockPropertiesWithUnits
			)

			const result = await controller.findAllWithUnits(null, 10, 0, mockRequest)

			expect(mockPropertiesServiceInstance.findAllWithUnits).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: null,
					limit: 10,
					offset: 0
				}
			)
			expect(result).toEqual(mockPropertiesWithUnits)
		})
	})

	describe('findOne', () => {
		const propertyId = 'property-123'

		it('should return single property', async () => {
			const mockProperty = { id: propertyId, name: 'Test Property' }

			mockPropertiesServiceInstance.findOne.mockResolvedValue(mockProperty)

			const result = await controller.findOne(propertyId, mockRequest)

			expect(mockPropertiesServiceInstance.findOne).toHaveBeenCalledWith(
				mockUser.id,
				propertyId
			)
			expect(result).toEqual(mockProperty)
		})

		it('should throw NotFoundException when property not found', async () => {
			mockPropertiesServiceInstance.findOne.mockResolvedValue(null)

			await expect(controller.findOne(propertyId, mockRequest)).rejects.toThrow(
				NotFoundException
			)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new PropertiesController()

			const result = await controllerWithoutService.findOne(
				propertyId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Properties service not available',
				id: propertyId,
				data: null
			})
		})
	})

	describe('create', () => {
		it('should create new property', async () => {
			const mockCreatedProperty = {
				id: 'prop-new',
				...validCreatePropertyRequest
			}

			mockPropertiesServiceInstance.create.mockResolvedValue(
				mockCreatedProperty
			)

			const result = await controller.create(
				validCreatePropertyRequest,
				mockRequest
			)

			expect(mockPropertiesServiceInstance.create).toHaveBeenCalledWith(
				mockUser.id,
				validCreatePropertyRequest
			)
			expect(result).toEqual(mockCreatedProperty)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new PropertiesController()

			const result = await controllerWithoutService.create(
				validCreatePropertyRequest,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Properties service not available',
				data: validCreatePropertyRequest,
				success: false
			})
		})
	})

	describe('update', () => {
		const propertyId = 'property-123'

		it('should update existing property', async () => {
			const mockUpdatedProperty = {
				id: propertyId,
				...validUpdatePropertyRequest
			}

			mockPropertiesServiceInstance.update.mockResolvedValue(
				mockUpdatedProperty
			)

			const result = await controller.update(
				propertyId,
				validUpdatePropertyRequest,
				mockRequest
			)

			expect(mockPropertiesServiceInstance.update).toHaveBeenCalledWith(
				mockUser.id,
				propertyId,
				validUpdatePropertyRequest
			)
			expect(result).toEqual(mockUpdatedProperty)
		})

		it('should throw NotFoundException when property not found', async () => {
			mockPropertiesServiceInstance.update.mockResolvedValue(null)

			await expect(
				controller.update(propertyId, validUpdatePropertyRequest, mockRequest)
			).rejects.toThrow(NotFoundException)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new PropertiesController()

			const result = await controllerWithoutService.update(
				propertyId,
				validUpdatePropertyRequest,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Properties service not available',
				id: propertyId,
				data: validUpdatePropertyRequest,
				success: false
			})
		})
	})

	describe('remove', () => {
		const propertyId = 'property-123'

		it('should delete property successfully', async () => {
			mockPropertiesServiceInstance.remove.mockResolvedValue(undefined)

			const result = await controller.remove(propertyId, mockRequest)

			expect(mockPropertiesServiceInstance.remove).toHaveBeenCalledWith(
				mockUser.id,
				propertyId
			)
			expect(result).toEqual({ message: 'Property deleted successfully' })
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new PropertiesController()

			const result = await controllerWithoutService.remove(
				propertyId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Properties service not available',
				id: propertyId,
				success: false
			})
		})
	})

	describe('getPropertyPerformanceAnalytics', () => {
		it('should return performance analytics with default parameters', async () => {
			const mockAnalytics = { performance: 'data' }

			mockPropertiesServiceInstance.getPropertyPerformanceAnalytics.mockResolvedValue(
				mockAnalytics
			)

			const result = await controller.getPropertyPerformanceAnalytics(
				mockRequest
			)

			expect(
				mockPropertiesServiceInstance.getPropertyPerformanceAnalytics
			).toHaveBeenCalledWith(mockUser.id, {
				propertyId: undefined,
				timeframe: '30d',
				limit: undefined
			})
			expect(result).toEqual(mockAnalytics)
		})

		it('should validate timeframe parameter', async () => {
			await expect(
				controller.getPropertyPerformanceAnalytics(
					mockRequest,
					undefined,
					'invalid'
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid timeframes', async () => {
			const validTimeframes = ['7d', '30d', '90d', '1y']

			for (const timeframe of validTimeframes) {
				mockPropertiesServiceInstance.getPropertyPerformanceAnalytics.mockResolvedValue(
					{}
				)

				await expect(
					controller.getPropertyPerformanceAnalytics(
						mockRequest,
						undefined,
						timeframe
					)
				).resolves.toBeDefined()
			}
		})
	})

	describe('getPropertyOccupancyAnalytics', () => {
		it('should return occupancy analytics with default parameters', async () => {
			const mockAnalytics = { occupancy: 'data' }

			mockPropertiesServiceInstance.getPropertyOccupancyAnalytics.mockResolvedValue(
				mockAnalytics
			)

			const result = await controller.getPropertyOccupancyAnalytics(mockRequest)

			expect(
				mockPropertiesServiceInstance.getPropertyOccupancyAnalytics
			).toHaveBeenCalledWith(mockUser.id, {
				propertyId: undefined,
				period: 'monthly'
			})
			expect(result).toEqual(mockAnalytics)
		})

		it('should validate period parameter', async () => {
			await expect(
				controller.getPropertyOccupancyAnalytics(
					mockRequest,
					undefined,
					'invalid'
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid periods', async () => {
			const validPeriods = ['daily', 'weekly', 'monthly', 'yearly']

			for (const period of validPeriods) {
				mockPropertiesServiceInstance.getPropertyOccupancyAnalytics.mockResolvedValue(
					{}
				)

				await expect(
					controller.getPropertyOccupancyAnalytics(
						mockRequest,
						undefined,
						period
					)
				).resolves.toBeDefined()
			}
		})
	})

	describe('getPropertyFinancialAnalytics', () => {
		it('should return financial analytics with default parameters', async () => {
			const mockAnalytics = { financial: 'data' }

			mockPropertiesServiceInstance.getPropertyFinancialAnalytics.mockResolvedValue(
				mockAnalytics
			)

			const result = await controller.getPropertyFinancialAnalytics(mockRequest)

			expect(
				mockPropertiesServiceInstance.getPropertyFinancialAnalytics
			).toHaveBeenCalledWith(mockUser.id, {
				propertyId: undefined,
				timeframe: '12m'
			})
			expect(result).toEqual(mockAnalytics)
		})

		it('should validate timeframe parameter', async () => {
			await expect(
				controller.getPropertyFinancialAnalytics(
					mockRequest,
					undefined,
					'invalid'
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid timeframes', async () => {
			const validTimeframes = ['3m', '6m', '12m', '24m']

			for (const timeframe of validTimeframes) {
				mockPropertiesServiceInstance.getPropertyFinancialAnalytics.mockResolvedValue(
					{}
				)

				await expect(
					controller.getPropertyFinancialAnalytics(
						mockRequest,
						undefined,
						timeframe
					)
				).resolves.toBeDefined()
			}
		})
	})

	describe('getPropertyMaintenanceAnalytics', () => {
		it('should return maintenance analytics with default parameters', async () => {
			const mockAnalytics = { maintenance: 'data' }

			mockPropertiesServiceInstance.getPropertyMaintenanceAnalytics.mockResolvedValue(
				mockAnalytics
			)

			const result = await controller.getPropertyMaintenanceAnalytics(
				mockRequest
			)

			expect(
				mockPropertiesServiceInstance.getPropertyMaintenanceAnalytics
			).toHaveBeenCalledWith(mockUser.id, {
				propertyId: undefined,
				timeframe: '6m'
			})
			expect(result).toEqual(mockAnalytics)
		})

		it('should validate timeframe parameter', async () => {
			await expect(
				controller.getPropertyMaintenanceAnalytics(
					mockRequest,
					undefined,
					'invalid'
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid timeframes', async () => {
			const validTimeframes = ['1m', '3m', '6m', '12m']

			for (const timeframe of validTimeframes) {
				mockPropertiesServiceInstance.getPropertyMaintenanceAnalytics.mockResolvedValue(
					{}
				)

				await expect(
					controller.getPropertyMaintenanceAnalytics(
						mockRequest,
						undefined,
						timeframe
					)
				).resolves.toBeDefined()
			}
		})
	})

	describe('request handling with missing user', () => {
		const mockRequestWithoutUser = {} as AuthenticatedRequest

		it('should use fallback user ID when user is not available', async () => {
			mockPropertiesServiceInstance.findAll.mockResolvedValue({
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})

			await controller.findAll(null, 10, 0, mockRequestWithoutUser)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalledWith(
				'test-user-id',
				{
					search: null,
					limit: 10,
					offset: 0
				}
			)
		})
	})
})