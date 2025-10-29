import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { StorageService } from '../../database/storage.service'
import { UtilityService } from '../../shared/services/utility.service'
import { SupabaseService } from '../../database/supabase.service'
import { buildMultiColumnSearch } from '../../shared/utils/sql-safe.utils'
import { createMockProperty } from '../../test-utils/mocks'
import { PropertiesService } from './properties.service'

type SupabaseResponse<T> = { data: T; error: unknown }

const createQueryBuilder = <T>(response: SupabaseResponse<T>) => {
	const builder: any = {
		select: jest.fn(() => builder),
		eq: jest.fn(() => builder),
		order: jest.fn(() => builder),
		range: jest.fn(() => builder),
		or: jest.fn(() => builder),
		insert: jest.fn(() => builder),
		update: jest.fn(() => builder),
		// Supabase builders are thenable – emulate that behaviour
		then: (onFulfilled: any, onRejected: any) =>
			Promise.resolve(response).then(onFulfilled, onRejected),
		catch: (onRejected: any) => Promise.resolve(response).catch(onRejected),
		single: jest.fn(() => Promise.resolve(response))
	}
	return builder
}

describe('PropertiesService', () => {
	let service: PropertiesService
	let mockSupabaseService: { getAdminClient: jest.Mock }
	let mockCacheManager: { get: jest.Mock; set: jest.Mock }
	let mockStorageService: { deleteFile: jest.Mock }
	let mockAdminClient: { from: jest.Mock; rpc: jest.Mock }

	beforeEach(async () => {
		mockAdminClient = {
			from: jest.fn(),
			rpc: jest.fn()
		}
		mockSupabaseService = {
			getAdminClient: jest.fn(() => mockAdminClient)
		}
		mockCacheManager = {
			get: jest.fn(),
			set: jest.fn()
		}
		mockStorageService = {
			deleteFile: jest.fn()
		}

		const mockUtilityService = {
			getUserIdFromSupabaseId: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PropertiesService,
				{
					provide: UtilityService,
					useValue: mockUtilityService
				},
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: StorageService,
					useValue: mockStorageService
				},
				{
					provide: CACHE_MANAGER,
					useValue: mockCacheManager
				}
			]
		}).compile()

		service = module.get(PropertiesService)

		// Mock UtilityService getUserIdFromSupabaseId: Supabase ID 'user-123' -> internal ID 'internal-uid-1'
		mockUtilityService.getUserIdFromSupabaseId.mockImplementation(
			async (supabaseId: string) => {
				if (supabaseId === 'user-123') return 'internal-uid-1'
				return supabaseId
			}
		)
	})

	it('fetches properties for a user and sanitises search input', async () => {
		const properties = [createMockProperty()]
		const listBuilder = createQueryBuilder({ data: properties, error: null })
		mockAdminClient.from.mockReturnValue(listBuilder)

		const result = await service.findAll('user-123', {
			search: '  Main  ',
			limit: 10,
			offset: 0
		})

		expect(result).toEqual(properties)
		expect(mockAdminClient.from).toHaveBeenCalledWith('property')
		expect(listBuilder.eq).toHaveBeenCalledWith('ownerId', 'internal-uid-1')
		expect(listBuilder.or).toHaveBeenCalledWith(
			buildMultiColumnSearch('Main', ['name', 'address', 'city'])
		)
	})

	it('returns a single property when located', async () => {
		const property = createMockProperty()
		const singleBuilder = createQueryBuilder({ data: property, error: null })
		singleBuilder.single.mockResolvedValue({ data: property, error: null })
		mockAdminClient.from.mockReturnValue(singleBuilder)

		const result = await service.findOne('user-123', property.id)

		expect(singleBuilder.select).toHaveBeenCalled()
		expect(singleBuilder.eq).toHaveBeenNthCalledWith(1, 'id', property.id)
		expect(singleBuilder.eq).toHaveBeenNthCalledWith(2, 'ownerId', 'internal-uid-1')
		expect(result).toEqual(property)
	})

	it('returns null when a property cannot be found', async () => {
		const singleBuilder = createQueryBuilder({
			data: null,
			error: { message: 'not found' }
		})
		singleBuilder.single.mockResolvedValue({
			data: null,
			error: { message: 'not found' }
		})
		mockAdminClient.from.mockReturnValue(singleBuilder)

		const result = await service.findOne('user-123', 'missing-property')

		expect(result).toBeNull()
	})

	it('creates a property with trimmed values and validates type', async () => {
		const created = createMockProperty({
			name: 'Park View',
			address: '123 Main St'
		})
		const insertBuilder = createQueryBuilder({ data: created, error: null })
		insertBuilder.single.mockResolvedValue({ data: created, error: null })
		mockAdminClient.from.mockReturnValue(insertBuilder)

		const payload = {
			name: '  Park View  ',
			address: ' 123 Main St ',
			city: ' Austin ',
			state: ' TX ',
			zipCode: ' 78701 ',
			propertyType: 'APARTMENT',
			description: '  Beautiful views '
		} as Parameters<typeof service.create>[1]

		const result = await service.create('user-123', payload)

		expect(insertBuilder.insert).toHaveBeenCalledWith(
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
		expect(result).toEqual(created)
	})

	// NOTE: Property type validation now happens at controller level via Zod schema
	// This test was removed as it's redundant with controller validation tests

	it('updates a property after verifying ownership', async () => {
		const existing = createMockProperty({ id: 'prop-1', ownerId: 'user-123' })
		jest.spyOn(service, 'findOne').mockResolvedValue(existing as any)

		const updated = { ...existing, name: 'Updated Name' }
		const updateBuilder = createQueryBuilder({ data: updated, error: null })
		updateBuilder.single.mockResolvedValue({ data: updated, error: null })
		mockAdminClient.from.mockReturnValue(updateBuilder)

		const result = await service.update('user-123', 'prop-1', {
			name: ' Updated Name '
		})

		expect(updateBuilder.update).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Updated Name',
				updatedAt: expect.any(String)
			})
		)
		expect(result).toEqual(updated)
	})

	it('deletes a property by marking it inactive', async () => {
		const existing = createMockProperty({ id: 'prop-1', ownerId: 'user-123' })
		jest.spyOn(service, 'findOne').mockResolvedValue(existing as any)
		const deleteBuilder = createQueryBuilder({ data: null, error: null })
		mockAdminClient.from.mockReturnValue(deleteBuilder)

		const result = await service.remove('user-123', 'prop-1')

		expect(deleteBuilder.update).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'INACTIVE' })
		)
		expect(result).toEqual({
			success: true,
			message: 'Property deleted successfully'
		})
	})

	it('returns cached stats when available', async () => {
		const stats = {
			total: 10,
			occupied: 9,
			vacant: 1,
			occupancyRate: 90,
			totalMonthlyRent: 10000,
			averageRent: 1200
		}
		mockCacheManager.get.mockResolvedValue(stats)

		const result = await service.getStats('user-123')

		expect(result).toEqual(stats)
		expect(mockAdminClient.rpc).not.toHaveBeenCalled()
	})

	it('fetches stats via RPC and caches the result when not cached', async () => {
		mockCacheManager.get.mockResolvedValue(null)
		const stats = {
			total: 2,
			occupied: 2,
			vacant: 0,
			occupancyRate: 100,
			totalMonthlyRent: 4000,
			averageRent: 2000
		}
		mockAdminClient.rpc.mockResolvedValue({ data: stats, error: null })

		const result = await service.getStats('user-123')

		expect(mockAdminClient.rpc).toHaveBeenCalledWith('get_property_stats', {
			p_user_id: 'user-123'
		})
		expect(mockCacheManager.set).toHaveBeenCalledWith(
			'property-stats:user-123',
			stats,
			30000
		)
		expect(result).toEqual(stats)
	})

	it('returns properties with units and applies search filter', async () => {
		const properties = [createMockProperty()]
		const builder = createQueryBuilder({ data: properties, error: null })
		mockAdminClient.from.mockReturnValue(builder)

		const result = await service.findAllWithUnits('user-123', {
			search: 'Loft',
			limit: 5,
			offset: 0
		})

		expect(result).toEqual(properties)
		expect(builder.select).toHaveBeenCalledWith('*, units:unit(*)')
		expect(builder.or).toHaveBeenCalledWith(
			buildMultiColumnSearch('Loft', ['name', 'address'])
		)
	})
})
