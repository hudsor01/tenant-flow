import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { UnitsService } from './units.service'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import { createMockUnit } from '../test-utils/mocks'

describe('UnitsService', () => {
	let service: UnitsService
	let mockUnitsRepository: any

	const mockUser = {
		id: 'user-123',
		email: 'test@example.com'
	}

	beforeEach(async () => {
		mockUnitsRepository = {
			findByUserIdWithSearch: jest.fn(),
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			getStats: jest.fn(),
			findByPropertyId: jest.fn(),
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UnitsService,
				{
					provide: REPOSITORY_TOKENS.UNITS,
					useValue: mockUnitsRepository
				}
			]
		}).compile()

		service = module.get<UnitsService>(UnitsService)
	})

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})
	})

	describe('findAll', () => {
		it('should return all units for user', async () => {
			const mockUnits = [createMockUnit()]
			mockUnitsRepository.findByUserIdWithSearch.mockResolvedValue(mockUnits)

			const result = await service.findAll(mockUser.id, {})

			expect(result).toEqual(mockUnits)
			expect(mockUnitsRepository.findByUserIdWithSearch).toHaveBeenCalledWith(
				mockUser.id,
				expect.any(Object)
			)
		})
	})

	describe('findByProperty', () => {
		it('should return units for property', async () => {
			const propertyId = 'property-123'
			const mockUnits = [createMockUnit({ propertyId })]
			mockUnitsRepository.findByPropertyId.mockResolvedValue(mockUnits)

			const result = await service.findByProperty(mockUser.id, propertyId)

			expect(result).toEqual(mockUnits)
			expect(mockUnitsRepository.findByPropertyId).toHaveBeenCalledWith(propertyId)
		})
	})
})
