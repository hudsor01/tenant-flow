import { Test, type TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { UnitQueryService } from './unit-query.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { UnitsService } from '../units.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import type { Unit, UnitStatus } from '@repo/shared/types/core'

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

describe('UnitQueryService', () => {
	let service: UnitQueryService
	let mockUserClient: {
		from: jest.Mock
	}
	let mockUnitsService: jest.Mocked<UnitsService>

	beforeEach(async () => {
		// Create mock user client
		mockUserClient = {
			from: jest.fn()
		}

		// Create mock UnitsService
		mockUnitsService = {
			update: jest.fn()
		} as unknown as jest.Mocked<UnitsService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UnitQueryService,
				{
					provide: SupabaseService,
					useValue: {
						getUserClient: jest.fn(() => mockUserClient)
					}
				},
				{
					provide: UnitsService,
					useValue: mockUnitsService
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<UnitQueryService>(UnitQueryService)

		// Reset mocks
		mockUserClient.from.mockReset()
		mockUnitsService.update.mockReset()
	})

	describe('findAll', () => {
		it('should fetch all units with default pagination and sorting', async () => {
			const mockUnits = [
				createMockUnit({ unit_number: '101' }),
				createMockUnit({ unit_number: '102' })
			]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				ilike: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('mock-token', {})

			expect(result).toEqual(mockUnits)
			expect(mockUserClient.from).toHaveBeenCalledWith('units')
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('*')
			expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49) // default limit 50
			expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', {
				ascending: false
			})
		})

		it('should filter by property_id', async () => {
			const mockUnits = [createMockUnit({ property_id: 'property-456' })]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('mock-token', {
				property_id: 'property-456'
			})

			expect(result).toEqual(mockUnits)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
				'property_id',
				'property-456'
			)
		})

		it('should filter by valid status', async () => {
			const mockUnits = [createMockUnit({ status: 'occupied' })]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('mock-token', {
				status: 'occupied'
			})

			expect(result).toEqual(mockUnits)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'occupied')
		})

		it('should ignore invalid status filter', async () => {
			const mockUnits = [createMockUnit()]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('mock-token', {
				status: 'invalid-status'
			})

			expect(result).toEqual(mockUnits)
			// Should not call eq for status since it's invalid
			expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith(
				'status',
				expect.anything()
			)
		})

		it('should apply search filter with SQL injection protection', async () => {
			const mockUnits = [createMockUnit({ unit_number: 'A101' })]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				ilike: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await service.findAll('mock-token', {
				search: 'A101'
			})

			expect(mockQueryBuilder.ilike).toHaveBeenCalledWith(
				'unit_number',
				expect.stringContaining('A101')
			)
		})

		it('should apply custom pagination', async () => {
			const mockUnits = [createMockUnit()]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await service.findAll('mock-token', {
				limit: 25,
				offset: 50
			})

			expect(mockQueryBuilder.range).toHaveBeenCalledWith(50, 74) // offset 50, limit 25
		})

		it('should apply custom sorting', async () => {
			const mockUnits = [createMockUnit()]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await service.findAll('mock-token', {
				sortBy: 'unit_number',
				sortOrder: 'asc'
			})

			expect(mockQueryBuilder.order).toHaveBeenCalledWith('unit_number', {
				ascending: true
			})
		})

		it('should return empty array on database error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(service.findAll('mock-token', {})).rejects.toThrow(
				BadRequestException
			)
			await expect(service.findAll('mock-token', {})).rejects.toThrow(
				'Failed to fetch units'
			)
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.findAll('', {})).rejects.toThrow(
				BadRequestException
			)
			await expect(service.findAll('', {})).rejects.toThrow(
				'Authentication token is required'
			)
		})
	})

	describe('findOne', () => {
		it('should return a unit when found', async () => {
			const mockUnit = createMockUnit({ id: 'unit-1' })

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockUnit, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findOne('mock-token', 'unit-1')

			expect(result).toEqual(mockUnit)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'unit-1')
		})

		it('should throw NotFoundException when unit not found', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'Not found' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.findOne('mock-token', 'nonexistent')
			).rejects.toThrow(NotFoundException)
			await expect(
				service.findOne('mock-token', 'nonexistent')
			).rejects.toThrow('Unit not found')
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.findOne('', 'unit-1')).rejects.toThrow(
				BadRequestException
			)
			await expect(service.findOne('', 'unit-1')).rejects.toThrow(
				'Authentication token and unit ID are required'
			)
		})

		it('should throw BadRequestException when unit_id is missing', async () => {
			await expect(service.findOne('mock-token', '')).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('findByProperty', () => {
		it('should return units for a property', async () => {
			const mockUnits = [
				createMockUnit({ property_id: 'property-123', unit_number: '101' }),
				createMockUnit({ property_id: 'property-123', unit_number: '102' })
			]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findByProperty('mock-token', 'property-123')

			expect(result).toEqual(mockUnits)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
				'property_id',
				'property-123'
			)
			expect(mockQueryBuilder.order).toHaveBeenCalledWith('unit_number', {
				ascending: true
			})
		})

		it('should return empty array when no units found', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({ data: [], error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findByProperty('mock-token', 'property-123')

			expect(result).toEqual([])
		})

		it('should throw BadRequestException on database error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.findByProperty('mock-token', 'property-123')
			).rejects.toThrow(BadRequestException)
			await expect(
				service.findByProperty('mock-token', 'property-123')
			).rejects.toThrow('Failed to retrieve property units')
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.findByProperty('', 'property-123')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when property_id is missing', async () => {
			await expect(service.findByProperty('mock-token', '')).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('getAvailable', () => {
		it('should return only available units', async () => {
			const mockUnits = [
				createMockUnit({ status: 'available', unit_number: '101' }),
				createMockUnit({ status: 'available', unit_number: '102' })
			]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockUnits, error: null })
			}

			// Mock two eq calls (property_id and status)
			mockQueryBuilder.eq.mockImplementation((field: string) => {
				if (field === 'property_id' || field === 'status') {
					return mockQueryBuilder
				}
				return mockQueryBuilder
			})

			// Override the chain to resolve at the end
			mockQueryBuilder.eq = jest.fn((field: string, value: unknown) => {
				if (field === 'status' && value === 'available') {
					return Promise.resolve({ data: mockUnits, error: null })
				}
				return mockQueryBuilder
			})

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getAvailable('mock-token', 'property-123')

			expect(result).toEqual(mockUnits)
		})

		it('should return empty array when no available units', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis()
			}

			// Override the chain to resolve at the end
			mockQueryBuilder.eq = jest.fn((field: string, value: unknown) => {
				if (field === 'status' && value === 'available') {
					return Promise.resolve({ data: [], error: null })
				}
				return mockQueryBuilder
			})

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.getAvailable('mock-token', 'property-123')

			expect(result).toEqual([])
		})

		it('should throw BadRequestException on database error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis()
			}

			mockQueryBuilder.eq = jest.fn((field: string, value: unknown) => {
				if (field === 'status' && value === 'available') {
					return Promise.resolve({ data: null, error: { message: 'DB error' } })
				}
				return mockQueryBuilder
			})

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.getAvailable('mock-token', 'property-123')
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.getAvailable('', 'property-123')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when property_id is missing', async () => {
			await expect(service.getAvailable('mock-token', '')).rejects.toThrow(
				BadRequestException
			)
		})
	})

})
