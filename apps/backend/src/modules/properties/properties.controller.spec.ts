import { NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type {
	PropertyCreate,
	PropertyUpdate
} from '@repo/shared/validation/properties'
import type { Property } from '@repo/shared/types/core'
import { createMockRequest } from '../../shared/test-utils/types'
import { createMockUser } from '../../test-utils/mocks'
import type { CreatePropertyDto } from './dto/create-property.dto'
import type { UpdatePropertyDto } from './dto/update-property.dto'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertyLifecycleService } from './services/property-lifecycle.service'
import { PropertyBulkImportService } from './services/property-bulk-import.service'
import { PropertyAnalyticsService } from './services/property-analytics.service'
import { DashboardStatsService } from '../dashboard/dashboard-stats.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

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
			getPropertyPerformanceAnalytics: jest.fn(),
			getPropertyOccupancyAnalytics: jest.fn(),
			getPropertyFinancialAnalytics: jest.fn(),
			getPropertyMaintenanceAnalytics: jest.fn()
		}))
	}
})

// Mock the PropertyLifecycleService
jest.mock('./services/property-lifecycle.service', () => {
	return {
		PropertyLifecycleService: jest.fn().mockImplementation(() => ({
			remove: jest.fn(),
			markAsSold: jest.fn()
		}))
	}
})

describe('PropertiesController', () => {
	let controller: PropertiesController
	let mockPropertiesServiceInstance: jest.Mocked<PropertiesService>
	let mockLifecycleServiceInstance: jest.Mocked<PropertyLifecycleService>

	const mockUser = createMockUser({ id: 'user-123' })

	const createMockProperty = (overrides: Partial<Property> = {}): Property => ({
		id: 'property-default',
		name: 'Test Property',
		address_line1: '123 Main St',
		address_line2: null,
		city: 'New York',
		state: 'NY',
		postal_code: '10001',
		country: 'US',
		property_type: 'SINGLE_FAMILY',
		status: 'active',
		owner_user_id: mockUser.id,
		date_sold: null,
		sale_price: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})

	const validPropertyCreate: PropertyCreate = {
		name: 'Test Property',
		address_line1: '123 Main St',
		city: 'New York',
		state: 'NY',
		postal_code: '10001',
		property_type: 'SINGLE_FAMILY'
	}

	const validPropertyUpdate: PropertyUpdate = {
		name: 'Updated Property'
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertiesController],
			providers: [
				PropertiesService,
				PropertyLifecycleService,
				{ provide: PropertyBulkImportService, useValue: {} },
				{ provide: PropertyAnalyticsService, useValue: {} },
				{ provide: DashboardStatsService, useValue: {} },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		controller = module.get<PropertiesController>(PropertiesController)
		mockPropertiesServiceInstance = module.get(
			PropertiesService
		) as jest.Mocked<PropertiesService>
		mockLifecycleServiceInstance = module.get(
			PropertyLifecycleService
		) as jest.Mocked<PropertyLifecycleService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return properties with default parameters', async () => {
			const mockProperties = [createMockProperty({ id: 'property-1' })]
			mockPropertiesServiceInstance.findAll.mockResolvedValue(mockProperties)

			const mockRequest = createMockRequest({ user: mockUser })
			const result = await controller.findAll(
				null, // search
				10, // limit
				0, // offset
				mockRequest
			)

			expect(mockPropertiesServiceInstance.findAll).toHaveBeenCalled()
			// Controller wraps service response in PaginatedResponse format
			expect(result).toEqual({
				data: mockProperties,
				total: mockProperties.length,
				limit: 10,
				offset: 0,
				hasMore: false
			})
		})

			// Note: Authentication is handled by @Request() and guards
		// Invalid tokens will be rejected before reaching the controller
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
				mockPropertiesWithUnits
			)

			const mockRequest = createMockRequest({ user: mockUser })
			const result = await controller.findAllWithUnits(
				null, // search
				10, // limit
				0, // offset
				mockRequest
			)

			expect(
				mockPropertiesServiceInstance.findAllWithUnits
			).toHaveBeenCalledWith(mockRequest, {
				search: null,
				limit: 10,
				offset: 0
			})
			expect(result).toEqual(mockPropertiesWithUnits)
		})
	})

	describe('findOne', () => {
		it('should return a property by ID', async () => {
			const mockProperty = createMockProperty({ id: 'property-1' })

			mockPropertiesServiceInstance.findOne.mockResolvedValue(mockProperty)

			const mockRequest = createMockRequest({ user: mockUser })
			const result = await controller.findOne('property-1', mockRequest)
			expect(mockPropertiesServiceInstance.findOne).toHaveBeenCalledWith(
				mockRequest,
				'property-1'
			)
			expect(result).toEqual(mockProperty)
		})

		it('should throw NotFoundException when property not found', async () => {
			// Service throws NotFoundException when property not found (see properties.service.ts:99-104)
			mockPropertiesServiceInstance.findOne.mockRejectedValue(
				new NotFoundException('Property non-existent not found')
			)

			await expect(
				controller.findOne(
					'non-existent',
					createMockRequest({ user: mockUser })
				)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create a new property', async () => {
			const mockProperty = createMockProperty(validPropertyCreate)

			mockPropertiesServiceInstance.create.mockResolvedValue(mockProperty)

			const mockRequest = createMockRequest({ user: mockUser })
			const result = await controller.create(
				validPropertyCreate as unknown as CreatePropertyDto,
				mockRequest
			)
			expect(mockPropertiesServiceInstance.create).toHaveBeenCalledWith(
				mockRequest,
				validPropertyCreate
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

			const mockRequest = createMockRequest({ user: mockUser })
			const result = await controller.update(
				'property-1',
				validPropertyUpdate as unknown as UpdatePropertyDto,
				mockRequest
			)
			expect(mockPropertiesServiceInstance.update).toHaveBeenCalledWith(
				mockRequest,
				'property-1',
				validPropertyUpdate,
				undefined // expectedVersion for optimistic locking
			)
			expect(result).toEqual(mockProperty)
		})
	})

	describe('remove', () => {
		it('should delete a property', async () => {
			mockLifecycleServiceInstance.remove.mockResolvedValue({
				success: true,
				message: 'Property deleted successfully'
			})

			const mockRequest = createMockRequest({ user: mockUser })
			const result = await controller.remove('property-1', mockRequest)

			expect(mockLifecycleServiceInstance.remove).toHaveBeenCalledWith(
				mockRequest,
				'property-1'
			)
			expect(result.message).toBe('Property deleted successfully')
		})
	})

	describe('markPropertyAsSold', () => {
		it('should mark property as sold with date and sale price', async () => {
			const mockResponse = {
				success: true,
				message: 'Property marked as sold successfully'
			}
			mockLifecycleServiceInstance.markAsSold.mockResolvedValue(mockResponse)

			const result = await controller.markPropertyAsSold(
				'property-1',
				{
					sale_date: '2025-01-15',
					sale_price: 500000
				},
				createMockRequest({ user: mockUser })
			)

			expect(mockLifecycleServiceInstance.markAsSold).toHaveBeenCalled()
			expect(result).toEqual(mockResponse)
			expect(result.success).toBe(true)
		})

		// NOTE: Input validation tests are not needed for unit tests
		// Validation is handled by ZodValidationPipe globally configured in app.module.ts
		// The pipe validates DTOs BEFORE requests reach the controller
		// See apps/backend/src/modules/pdf/pdf.controller.integration.spec.ts for validation testing pattern
	})
})
