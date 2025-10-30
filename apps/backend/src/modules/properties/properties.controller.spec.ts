import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '@repo/shared/types/backend-domain'
import type { Property } from '@repo/shared/types/core'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockRequest } from '../../shared/test-utils/types'
import { createMockUser } from '../../test-utils/mocks'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'

// Mock the services
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
			getPropertyMaintenanceAnalytics: jest.fn(),
			markAsSold: jest.fn()
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

describe('PropertiesController', () => {
	let controller: PropertiesController
	let mockPropertiesServiceInstance: jest.Mocked<PropertiesService>
	let mockCurrentUserProvider: jest.Mocked<CurrentUserProvider>

	const mockUser = createMockUser({ id: 'user-123' })

	const createMockProperty = (overrides: Partial<Property> = {}): Property => ({
		id: 'property-default',
		name: 'Test Property',
		address: '123 Main St',
		city: 'New York',
		state: 'NY',
		zipCode: '10001',
		description: null,
		propertyType: 'SINGLE_FAMILY',
		status: 'ACTIVE',
		imageUrl: null,
		date_sold: null,
		sale_price: null,
		sale_notes: null,
		ownerId: mockUser.id,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1,
		...overrides
	})

	const validCreatePropertyRequest: CreatePropertyRequest = {
		name: 'Test Property',
		address: '123 Main St',
		city: 'New York',
		state: 'NY',
		zipCode: '10001',
		propertyType: 'SINGLE_FAMILY'
	}

	const validUpdatePropertyRequest: UpdatePropertyRequest = {
		name: 'Updated Property'
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		// Mock CurrentUserProvider
		mockCurrentUserProvider = {
			getUserId: jest.fn().mockResolvedValue(mockUser.id),
			getUser: jest.fn().mockResolvedValue(mockUser),
			getUserEmail: jest.fn().mockResolvedValue(mockUser.email),
			isAuthenticated: jest.fn().mockResolvedValue(true),
			getUserOrNull: jest.fn().mockResolvedValue(mockUser)
		} as any

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertiesController],
			providers: [
				PropertiesService,
				{ provide: CurrentUserProvider, useValue: mockCurrentUserProvider }
			]
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
		it('should return properties with default parameters', async () => {
			const mockProperties = [createMockProperty({ id: 'property-1' })]
			mockPropertiesServiceInstance.findAll.mockResolvedValue(mockProperties)

			const result = await controller.findAll(
				null, // search
				10, // limit
				0, // offset
				createMockRequest({ user: mockUser }) as any
			)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalled()
			expect(result).toEqual(mockProperties)
		})

		it('should throw BadRequestException when not authenticated', async () => {
			await expect(
				controller.findAll(
					null,
					10,
					0,
					createMockRequest({ user: undefined }) as any
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getStats', () => {
		it('should return property statistics', async () => {
			const mockStats = {
				totalProperties: 10,
				activeProperties: 8,
				rentedUnits: 50,
				vacantUnits: 10
			}

			mockPropertiesServiceInstance.getStats.mockResolvedValue(mockStats as any)

			const result = await controller.getStats(
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockPropertiesServiceInstance.getStats).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual(mockStats)
		})
	})

	describe('findAllWithUnits', () => {
		it('should return properties with their units', async () => {
			const mockPropertiesWithUnits = [
				{
					...createMockProperty({ id: 'property-1' }),
					units: []
				}
			]

			mockPropertiesServiceInstance.findAllWithUnits.mockResolvedValue(
				mockPropertiesWithUnits as any
			)

			const result = await controller.findAllWithUnits(
				null, // search
				10, // limit
				0, // offset
				createMockRequest({ user: mockUser }) as any
			)

			expect(
				mockPropertiesServiceInstance.findAllWithUnits
			).toHaveBeenCalledWith(mockUser.id, {
				search: null,
				limit: 10,
				offset: 0
			})
			expect(result.data).toEqual(mockPropertiesWithUnits)
		})
	})

	describe('findOne', () => {
		it('should return a property by ID', async () => {
			const mockProperty = createMockProperty({ id: 'property-1' })

			mockPropertiesServiceInstance.findOne.mockResolvedValue(mockProperty)

			const result = await controller.findOne(
				'property-1',
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockPropertiesServiceInstance.findOne).toHaveBeenCalledWith(
				mockUser.id,
				'property-1'
			)
			expect(result).toEqual(mockProperty)
		})

		it('should throw NotFoundException when property not found', async () => {
			mockPropertiesServiceInstance.findOne.mockResolvedValue(null)

			await expect(
				controller.findOne(
					'non-existent',
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create a new property', async () => {
			const mockProperty = createMockProperty(validCreatePropertyRequest)

			mockPropertiesServiceInstance.create.mockResolvedValue(mockProperty)

			const result = await controller.create(
				validCreatePropertyRequest,
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockPropertiesServiceInstance.create).toHaveBeenCalledWith(
				mockUser.id,
				validCreatePropertyRequest
			)
			expect(result).toEqual(mockProperty)
		})
	})

	describe('update', () => {
		it('should update a property', async () => {
			const mockProperty = createMockProperty({
				id: 'property-1',
				name: 'Updated Property'
			})

			mockPropertiesServiceInstance.update.mockResolvedValue(mockProperty)

			const result = await controller.update(
				'property-1',
				validUpdatePropertyRequest,
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockPropertiesServiceInstance.update).toHaveBeenCalledWith(
				mockUser.id,
				'property-1',
				validUpdatePropertyRequest,
				undefined // expectedVersion for optimistic locking
			)
			expect(result).toEqual(mockProperty)
		})
	})

	describe('remove', () => {
		it('should delete a property', async () => {
			mockPropertiesServiceInstance.remove.mockResolvedValue({ success: true, message: 'Property deleted successfully' })

			const result = await controller.remove(
				'property-1',
				createMockRequest({ user: mockUser }) as any
			)

			expect(mockPropertiesServiceInstance.remove).toHaveBeenCalledWith(
				mockUser.id,
				'property-1'
			)
			expect(result.message).toBe('Property deleted successfully')
		})
	})

	describe('markPropertyAsSold', () => {
		it('should mark property as sold with date and sale price', async () => {
			const mockResponse = { success: true, message: 'Property marked as sold successfully' }
			mockPropertiesServiceInstance.markAsSold.mockResolvedValue(mockResponse)

			const result = await controller.markPropertyAsSold(
				'property-1',
				{
					dateSold: '2025-01-15',
					salePrice: 500000
				},
				createMockRequest({ user: mockUser }) as any
			)

			expect(mockPropertiesServiceInstance.markAsSold).toHaveBeenCalled()
			expect(result).toEqual(mockResponse)
			expect(result.success).toBe(true)
		})

	// NOTE: Input validation tests are not needed for unit tests
		// Validation is handled by ZodValidationPipe globally configured in app.module.ts
		// The pipe validates DTOs BEFORE requests reach the controller
		// See apps/backend/src/modules/pdf/pdf.controller.integration.spec.ts for validation testing pattern
	})
})
