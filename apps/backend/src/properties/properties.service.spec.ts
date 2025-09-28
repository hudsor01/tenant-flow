import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PropertiesService } from './properties.service'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import { createMockProperty } from '../test-utils/mocks'

describe('PropertiesService', () => {
	let service: PropertiesService
	let mockPropertiesRepository: any

	const mockUser = {
		id: 'user-123',
		email: 'test@example.com'
	}

	beforeEach(async () => {
		mockPropertiesRepository = {
			findByUserIdWithSearch: jest.fn(),
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			getStats: jest.fn(),
			getAnalytics: jest.fn(),
			archive: jest.fn(),
			restore: jest.fn(),
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PropertiesService,
				{
					provide: REPOSITORY_TOKENS.PROPERTIES,
					useValue: mockPropertiesRepository
				}
			]
		}).compile()

		service = module.get<PropertiesService>(PropertiesService)
	})

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})
	})

	describe('findAll', () => {
		it('should return all properties for user', async () => {
			const mockProperties = [createMockProperty()]
			mockPropertiesRepository.findByUserIdWithSearch.mockResolvedValue(mockProperties)

			const result = await service.findAll(mockUser.id, { limit: 10, offset: 0 })

			expect(result).toEqual(mockProperties)
			expect(mockPropertiesRepository.findByUserIdWithSearch).toHaveBeenCalledWith(
				mockUser.id,
				expect.any(Object)
			)
		})

		it('should return empty array when userId is missing', async () => {
			mockPropertiesRepository.findByUserIdWithSearch.mockResolvedValue([])
			const result = await service.findAll('', { limit: 10, offset: 0 })
			expect(result).toEqual([])
		})
	})

	describe('findOne', () => {
		it('should return single property', async () => {
			const mockProperty = createMockProperty()
			mockPropertiesRepository.findById.mockResolvedValue(mockProperty)

			const result = await service.findOne(mockUser.id, mockProperty.id)

			expect(result).toEqual(mockProperty)
			expect(mockPropertiesRepository.findById).toHaveBeenCalledWith(mockProperty.id)
		})

		it('should return null when property not found', async () => {
			mockPropertiesRepository.findById.mockResolvedValue(null)

			const result = await service.findOne(mockUser.id, 'non-existent')

			expect(result).toBeNull()
		})
	})

	describe('create', () => {
		it('should create new property', async () => {
			const createData = {
				name: 'Test Property',
				address: '123 Main St',
				propertyType: 'SINGLE_FAMILY' as const,
				city: 'Test City',
				state: 'TS',
				zipCode: '12345'
			}
			const mockProperty = createMockProperty(createData)
			mockPropertiesRepository.create.mockResolvedValue(mockProperty)

			const result = await service.create(mockUser.id, createData)

			expect(result).toEqual(mockProperty)
			expect(mockPropertiesRepository.create).toHaveBeenCalledWith(
				mockUser.id,
				expect.objectContaining(createData)
			)
		})
	})

	describe('update', () => {
		it('should update property', async () => {
			const updateData = { name: 'Updated Name' }
			const mockProperty = createMockProperty(updateData)

			// Mock the internal findOne call
			jest.spyOn(service, 'findOne').mockResolvedValue(mockProperty)
			mockPropertiesRepository.update.mockResolvedValue(mockProperty)

			const result = await service.update(mockUser.id, mockProperty.id, updateData)

			expect(result).toEqual(mockProperty)
			expect(mockPropertiesRepository.update).toHaveBeenCalledWith(
				mockProperty.id,
				updateData
			)
		})
	})

	describe('remove', () => {
		it('should soft delete property', async () => {
			const mockProperty = createMockProperty()

			// Mock the internal findOne call
			jest.spyOn(service, 'findOne').mockResolvedValue(mockProperty)
			mockPropertiesRepository.softDelete.mockResolvedValue({ success: true })

			await service.remove(mockUser.id, mockProperty.id)

			expect(mockPropertiesRepository.softDelete).toHaveBeenCalledWith(
				mockUser.id,
				mockProperty.id
			)
		})
	})

	describe('getStats', () => {
		it('should return property statistics', async () => {
			const mockStats = {
				total: 5,
				totalUnits: 20,
				occupiedUnits: 15,
				vacantUnits: 5,
				occupancyRate: 75,
				totalRent: 30000,
				collectedRent: 25000
			}
			mockPropertiesRepository.getStats.mockResolvedValue(mockStats)

			const result = await service.getStats(mockUser.id)

			expect(result).toEqual(mockStats)
			expect(mockPropertiesRepository.getStats).toHaveBeenCalledWith(mockUser.id)
		})
	})
})
