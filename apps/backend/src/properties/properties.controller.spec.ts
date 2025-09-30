import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CreatePropertyRequest, UpdatePropertyRequest } from '@repo/shared/types/backend-domain'
import type { Property } from '@repo/shared/types/core'
import type { AuthenticatedRequest } from '../shared/types/express-request.types'
import { createMockUser } from '../test-utils/mocks'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'

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
		type: 'APARTMENT'
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
			const mockProperties = [
				{
					id: 'prop-1',
					name: 'Property 1',
					address: '123 Main St',
					city: 'Test City',
					state: 'TS',
					zipCode: '12345',
					ownerId: 'user-123',
					propertyType: 'APARTMENT' as const,
					status: 'ACTIVE' as const,
					imageUrl: null,
					description: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			] as Property[]

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
			const mockProperties = [
				{
					id: 'prop-1',
					name: 'Searched Property',
					address: '456 Search St',
					city: 'Test City',
					state: 'TS',
					zipCode: '12345',
					ownerId: 'user-123',
					propertyType: 'CONDO' as const,
					status: 'ACTIVE' as const,
					imageUrl: null,
					description: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			] as Property[]

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
			mockPropertiesServiceInstance.findAll.mockResolvedValue([] as Property[])

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
			mockPropertiesServiceInstance.findAll.mockResolvedValue([] as Property[])

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
				total: 5,
				occupied: 18,
				vacant: 2,
				occupancyRate: 0.9,
				totalMonthlyRent: 15000,
				averageRent: 833
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
			const mockProperties = [
				{
					id: 'prop-1',
					name: 'Property 1',
					address: '123 Test St',
					city: 'Test City',
					state: 'TS',
					zipCode: '12345',
					ownerId: 'user-123',
					propertyType: 'APARTMENT' as const,
					status: 'ACTIVE' as const,
					imageUrl: null,
					description: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			]

			mockPropertiesServiceInstance.findAllWithUnits.mockResolvedValue(
				mockProperties
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
			expect(result).toEqual({
				data: mockProperties,
				total: mockProperties.length,
				limit: 10,
				offset: 0
			})
		})
	})

	describe('findOne', () => {
		const propertyId = 'property-123'

			it('should return single property', async () => {
			const mockProperty = {
				id: propertyId,
				name: 'Test Property',
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				zipCode: '12345',
				ownerId: 'user-123',
				propertyType: 'APARTMENT' as const,
				status: 'ACTIVE' as const,
				imageUrl: null,
				description: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			} as Property

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
				name: validCreatePropertyRequest.name,
				address: validCreatePropertyRequest.address,
				city: validCreatePropertyRequest.city,
				state: validCreatePropertyRequest.state,
				zipCode: validCreatePropertyRequest.zipCode,
				ownerId: 'user-123',
				propertyType: validCreatePropertyRequest.type,
				status: 'ACTIVE' as const,
				imageUrl: null,
				description: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			} as Property

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
				name: validUpdatePropertyRequest.name,
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				zipCode: '12345',
				ownerId: 'user-123',
				propertyType: 'APARTMENT' as const,
				status: 'ACTIVE' as const,
				imageUrl: null,
				description: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			} as Property

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
			mockPropertiesServiceInstance.remove.mockResolvedValue({ success: true, message: 'Property deleted successfully' })

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
			const mockAnalytics = [
				{
					propertyId: 'prop-001',
					propertyName: 'Riverside Towers',
					period: '2024-01',
					occupancyRate: 91.7,
					revenue: 2640,
					expenses: 8200,
					netIncome: 18200,
					roi: 2.4
				}
			]

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
					[
						{
							propertyId: 'prop-001',
							propertyName: 'Riverside Towers',
							period: '2024-01',
							occupancyRate: 91.7,
							revenue: 26400,
							expenses: 8200,
							netIncome: 18200,
							roi: 2.4
						}
					]
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
			const mockAnalytics = [
				{
					propertyId: 'prop-001',
					propertyName: 'Riverside Towers',
					period: '2024-01',
					occupancyRate: 91.7,
					unitsOccupied: 22,
					unitsTotal: 24,
					moveIns: 3,
					moveOuts: 1
				}
			]

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
					[
						{
							propertyId: 'prop-001',
							propertyName: 'Riverside Towers',
							period: '2024-01',
							occupancyRate: 91.7,
							unitsOccupied: 22,
							unitsTotal: 24,
							moveIns: 3,
							moveOuts: 1
						}
					]
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
			const mockAnalytics = [
				{
					propertyId: 'prop-001',
					propertyName: 'Riverside Towers',
					period: '2024-01',
					revenue: 26400,
					expenses: 8200,
					netIncome: 18200,
					operatingExpenses: 6500,
					maintenanceExpenses: 1200,
					capexExpenses: 500,
					cashFlow: 17700
				}
			]

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
					[
						{
							propertyId: 'prop-001',
							propertyName: 'Riverside Towers',
							period: '2024-01',
							revenue: 26400,
							expenses: 8200,
							netIncome: 18200,
							operatingExpenses: 6500,
							maintenanceExpenses: 1200,
							capexExpenses: 500,
							cashFlow: 17700
						}
					]
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
			const mockAnalytics = [
				{
					propertyId: 'prop-001',
					propertyName: 'Riverside Towers',
					period: '2024-01',
					totalRequests: 15,
					completedRequests: 12,
					pendingRequests: 3,
					avgResolutionTime: 3.2,
					totalCost: 1200,
					avgCost: 80,
					emergencyRequests: 2
				}
			]

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
					[{
						propertyId: 'prop-001',
						propertyName: 'Test Property',
						period: '2024-01',
						totalRequests: 5,
						completedRequests: 4,
						pendingRequests: 1,
						avgResolutionTime: 24,
						totalCost: 1000,
						avgCost: 200,
						emergencyRequests: 0
					}]
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

		it('should throw BadRequestException when user is not available', async () => {
			await expect(
				controller.findAll(null, 10, 0, mockRequestWithoutUser)
			).rejects.toThrow(BadRequestException)
		})
	})
})
