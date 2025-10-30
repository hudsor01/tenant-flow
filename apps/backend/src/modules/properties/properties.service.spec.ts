import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'
import { UtilityService } from '../../shared/services/utility.service'
import { buildMultiColumnSearch } from '../../shared/utils/sql-safe.utils'
import { createMockProperty } from '../../test-utils/mocks'
import { PropertiesService } from './properties.service'

describe('PropertiesService', () => {
	let service: PropertiesService
	let supabaseService: SupabaseService
	let utilityService: UtilityService
	let cacheManager: {
		get: jest.Mock
		set: jest.Mock
	}
	let mockAdminClient: {
		from: jest.Mock
		rpc: jest.Mock
	}

	beforeEach(async () => {
		// Create mock admin client
		mockAdminClient = {
			from: jest.fn(),
			rpc: jest.fn()
		}

		// Create module with mocked dependencies
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PropertiesService,
				{
					provide: SupabaseService,
					useValue: {
						getAdminClient: jest.fn(() => mockAdminClient)
					}
				},
				{
					provide: UtilityService,
					useValue: {
						getUserIdFromSupabaseId: jest
							.fn()
							.mockImplementation(async (supabaseId: string) => {
								// Maps Supabase auth ID to internal user ID
								if (supabaseId === 'user-123') return 'internal-uid-1'
								return supabaseId
							})
					}
				},
				{
					provide: StorageService,
					useValue: {
						deleteFile: jest.fn()
					}
				},
				{
					provide: CACHE_MANAGER,
					useValue: {
						get: jest.fn(),
						set: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<PropertiesService>(PropertiesService)
		supabaseService = module.get<SupabaseService>(SupabaseService)
		utilityService = module.get<UtilityService>(UtilityService)
		cacheManager = module.get(CACHE_MANAGER)
	})

	describe('findAll', () => {
		it('should fetch properties with search and pagination', async () => {
			const mockProperties = [createMockProperty({ name: 'Main Street Apartments' })]

			// Create chainable query builder mock
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockResolvedValue({ data: mockProperties, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('user-123', {
				search: '  Main  ',
				limit: 10,
				offset: 0
			})

			expect(result).toEqual(mockProperties)
			expect(mockAdminClient.from).toHaveBeenCalledWith('property')
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('ownerId', 'internal-uid-1')
			expect(mockQueryBuilder.or).toHaveBeenCalledWith(
				buildMultiColumnSearch('Main', ['name', 'address', 'city'])
			)
		})

		it('should return empty array on database error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('user-123', {
				search: null,
				limit: 10,
				offset: 0
			})

			expect(result).toEqual([])
		})
	})

	describe('findOne', () => {
		it('should return a property when found', async () => {
			const mockProperty = createMockProperty({ id: 'prop-1' })

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockProperty, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findOne('user-123', 'prop-1')

			expect(result).toEqual(mockProperty)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'prop-1')
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('ownerId', 'internal-uid-1')
		})

		it('should return null when property not found', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findOne('user-123', 'nonexistent')

			expect(result).toBeNull()
		})
	})

	describe('create', () => {
		it('should create a property with trimmed values', async () => {
			const mockCreated = createMockProperty({
				name: 'Park View',
				address: '123 Main St'
			})

			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const payload = {
				name: '  Park View  ',
				address: ' 123 Main St ',
				city: ' Austin ',
				state: ' TX ',
				zipCode: ' 78701 ',
				propertyType: 'APARTMENT' as const,
				description: '  Beautiful views '
			}

			const result = await service.create('user-123', payload)

			expect(result).toEqual(mockCreated)
			expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					ownerId: 'internal-uid-1',
					name: 'Park View',
					address: '123 Main St',
					city: 'Austin',
					state: 'TX',
					zipCode: '78701',
					propertyType: 'APARTMENT',
					description: 'Beautiful views'
				})
			)
		})

		it('should throw BadRequestException on database error', async () => {
			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.create('user-123', {
					name: 'Test',
					address: '123 Main',
					city: 'Austin',
					state: 'TX',
					zipCode: '78701',
					propertyType: 'APARTMENT'
				})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('update', () => {
		it('should update a property after verifying ownership', async () => {
			const mockExisting = createMockProperty({ id: 'prop-1', ownerId: 'internal-uid-1' })
			const mockUpdated = { ...mockExisting, name: 'Updated Name' }

			// Mock findOne
			jest.spyOn(service, 'findOne').mockResolvedValue(mockExisting)

			const mockQueryBuilder = {
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.update('user-123', 'prop-1', {
				name: ' Updated Name '
			})

			expect(result).toEqual(mockUpdated)
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Updated Name',
					updatedAt: expect.any(String)
				})
			)
		})
	})

	describe('remove', () => {
		it('should soft delete a property by marking it inactive', async () => {
			const mockExisting = createMockProperty({ id: 'prop-1' })

			jest.spyOn(service, 'findOne').mockResolvedValue(mockExisting)

			const mockQueryBuilder = {
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockExisting, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.remove('user-123', 'prop-1')

			expect(result).toEqual({
				success: true,
				message: 'Property deleted successfully'
			})
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'INACTIVE' })
			)
		})
	})

	describe('getStats', () => {
		it('should return cached stats when available', async () => {
			const mockStats = {
				total: 10,
				occupied: 9,
				vacant: 1,
				occupancyRate: 90,
				totalMonthlyRent: 10000,
				averageRent: 1200
			}

			cacheManager.get.mockResolvedValue(mockStats)

			const result = await service.getStats('user-123')

			expect(result).toEqual(mockStats)
			expect(cacheManager.get).toHaveBeenCalledWith('property-stats:user-123')
			expect(mockAdminClient.rpc).not.toHaveBeenCalled()
		})

		it('should fetch stats via RPC and cache the result when not cached', async () => {
			cacheManager.get.mockResolvedValue(null)

			const mockStats = {
				total: 2,
				occupied: 2,
				vacant: 0,
				occupancyRate: 100,
				totalMonthlyRent: 4000,
				averageRent: 2000
			}

			mockAdminClient.rpc.mockResolvedValue({ data: mockStats, error: null })

			const result = await service.getStats('user-123')

			expect(result).toEqual(mockStats)
			expect(mockAdminClient.rpc).toHaveBeenCalledWith('get_property_stats', {
				p_user_id: 'user-123'
			})
			expect(cacheManager.set).toHaveBeenCalledWith(
				'property-stats:user-123',
				mockStats,
				30000
			)
		})
	})

	describe('findAllWithUnits', () => {
		it('should return properties with units and apply search filter', async () => {
			const mockProperties = [createMockProperty({ name: 'Downtown Loft' })]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockResolvedValue({ data: mockProperties, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAllWithUnits('user-123', {
				search: 'Loft',
				limit: 5,
				offset: 0
			})

			expect(result).toEqual(mockProperties)
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, units:unit(*)')
			expect(mockQueryBuilder.or).toHaveBeenCalledWith(
				buildMultiColumnSearch('Loft', ['name', 'address'])
			)
		})
	})
})
