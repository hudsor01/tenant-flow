import { BadRequestException, ForbiddenException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { RedisCacheService } from '../../cache/cache.service'
import { Test, type TestingModule } from '@nestjs/testing'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'
import { UtilityService } from '../../shared/services/utility.service'
import { buildMultiColumnSearch } from '../../shared/utils/sql-safe.utils'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import type { Property } from '@repo/shared/types/core'
// Define createMockProperty locally since it doesn't exist in mocks
function createMockProperty(overrides?: Partial<Property>): Property {
	return {
		id: 'property-' + Math.random().toString(36).substr(2, 9),
		owner_user_id: 'user-123',
		name: 'Test Property',
		address_line1: '123 Main St',
		city: 'Test City',
		state: 'TS',
		postal_code: '12345',
		country: 'US',
		status: 'active',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}
}
import { PropertiesService } from './properties.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { PropertyCacheInvalidationService } from './services/property-cache-invalidation.service'

// Helper function to create mock Request objects
function createMockRequest(
	user_id: string,
	token = 'mock-token'
): AuthenticatedRequest {
	return {
		user: {
			id: user_id,
			email: 'test@example.com',
			aud: 'authenticated',
			user_type: 'authenticated',
			email_confirmed_at: '',
			confirmed_at: '',
			last_sign_in_at: '',
			app_metadata: {},
			user_metadata: {},
			identities: [],
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			is_anonymous: false
		},
		headers: {
			authorization: `Bearer ${token}`
		},
		cookies: {}
	} as unknown as AuthenticatedRequest
}

describe('PropertiesService', () => {
	let service: PropertiesService
	let mockAdminClient: {
		from: jest.Mock
		rpc: jest.Mock
	}
	let mockUserClient: {
		from: jest.Mock
		rpc: jest.Mock
	}

	beforeEach(async () => {
		// Create mock admin client
		mockAdminClient = {
			from: jest.fn(),
			rpc: jest.fn()
		}

		// Create mock user client
		mockUserClient = {
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
						getAdminClient: jest.fn(() => mockAdminClient),
						getUserClient: jest.fn(() => mockUserClient),
						getTokenFromRequest: jest.fn(() => 'mock-token')
					}
				},
				{
					provide: UtilityService,
					useValue: {
						getuser_idFromSupabaseId: jest
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
					provide: DashboardAnalyticsService,
					useValue: {
						getDashboardStats: jest.fn().mockResolvedValue({
							properties: {
								total: 0,
								occupied: 0,
								vacant: 0,
								occupancyRate: 0,
								totalrent_amount: 0,
								averageRent: 0
							}
						})
					}
				},
				{
					provide: RedisCacheService,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						invalidate: jest.fn().mockReturnValue(0),
						invalidateByEntity: jest.fn().mockReturnValue(0),
						invalidateByUser: jest.fn().mockReturnValue(0)
					}
				},
				{
					provide: PropertyCacheInvalidationService,
					useValue: {
						invalidatePropertyCaches: jest.fn(),
						invalidateUnitCaches: jest.fn()
					}
				},
				{
					provide: Logger,
					useValue: new SilentLogger()
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<PropertiesService>(PropertiesService)

		// Reset mocks to ensure clean state for each test
		mockUserClient.from.mockReset()
		mockAdminClient.from.mockReset()

		// Provide safe default mock implementation for all query operations
		// Tests can override this with specific behavior
		const createDefaultQueryBuilder = () => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			neq: jest.fn().mockReturnThis(),
			gt: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lt: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			like: jest.fn().mockReturnThis(),
			ilike: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			contains: jest.fn().mockReturnThis(),
			containedBy: jest.fn().mockReturnThis(),
			rangeGt: jest.fn().mockReturnThis(),
			rangeGte: jest.fn().mockReturnThis(),
			rangeLt: jest.fn().mockReturnThis(),
			rangeLte: jest.fn().mockReturnThis(),
			rangeAdjacent: jest.fn().mockReturnThis(),
			overlaps: jest.fn().mockReturnThis(),
			textSearch: jest.fn().mockReturnThis(),
			match: jest.fn().mockReturnThis(),
			not: jest.fn().mockReturnThis(),
			or: jest.fn().mockReturnThis(),
			filter: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			upsert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			delete: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			range: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data: null, error: null }),
			maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
		})

		mockUserClient.from.mockImplementation(() => createDefaultQueryBuilder())
		mockAdminClient.from.mockImplementation(() => createDefaultQueryBuilder())
	})

	describe('findAll', () => {
		it('should fetch properties with search and pagination', async () => {
			const mockProperties = [
				createMockProperty({ name: 'Main Street Apartments' })
			]

			// Create chainable query builder mock
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				neq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockResolvedValue({ data: mockProperties, error: null, count: 1 })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('user-123', {
				search: '  Main  ',
				limit: 10,
				offset: 0
			})

			expect(result).toEqual({ data: mockProperties, count: 1 })
			expect(mockAdminClient.from).toHaveBeenCalledWith('properties')
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('owner_user_id', 'user-123')
			expect(mockQueryBuilder.or).toHaveBeenCalledWith(
				buildMultiColumnSearch('Main', ['name', 'address', 'city'])
			)
		})

		it('should return empty array on database error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				neq: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } }),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis()
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.findAll('user-123', {
					search: null,
					limit: 10,
					offset: 0
				})
			).rejects.toThrow('Failed to fetch properties')
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

			const result = await service.findOne(
				createMockRequest('user-123'),
				'prop-1'
			)

			expect(result).toEqual(mockProperty)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'prop-1')
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('owner_user_id', 'user-123')
		})

		it('should throw NotFoundException when property not found', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'Not found' } })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.findOne(createMockRequest('user-123'), 'nonexistent')
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create a property with trimmed values', async () => {
			const mockCreated = createMockProperty({
				name: 'Park View',
				address_line1: '123 Main St'
			})

			// Mock plan limits RPC (admin client)
			mockAdminClient.rpc.mockResolvedValue({
				data: [{ property_limit: 5 }],
				error: null
			})

			// Mock properties count query (first from('properties') call on admin client)
			const mockCountQuery = {
				select: jest.fn(function () { return this }),
				eq: jest.fn(function () { return this }),
				neq: jest.fn().mockResolvedValue({ count: 0, error: null })
			}

			// Mock properties insert query - use function binding for proper 'this' context
			const mockPropertiesQuery = {
				insert: jest.fn(function () {
					return this
				}),
				select: jest.fn(function () {
					return this
				}),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			// Both calls go through adminClient now (count check + insert)
			mockAdminClient.from
				.mockImplementationOnce(() => mockCountQuery)
				.mockImplementationOnce(() => mockPropertiesQuery)

			const payload = {
				name: 'Park View',
				address_line1: '123 Main St',
				city: 'Austin',
				state: 'TX',
				postal_code: '78701',
				property_type: 'APARTMENT' as const
			}

			const result = await service.create(
				createMockRequest('user-123'),
				payload
			)

			expect(result).toEqual(mockCreated)
			expect(mockPropertiesQuery.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					owner_user_id: 'user-123',
					name: 'Park View',
					address_line1: '123 Main St',
					city: 'Austin',
					state: 'TX',
					postal_code: '78701',
					property_type: 'APARTMENT'
				})
			)
		})

		function setupCreateErrorTest(pgError: { message: string; code?: string }) {
			mockAdminClient.rpc.mockResolvedValue({
				data: [{ property_limit: 5 }],
				error: null
			})
			const mockCountQuery = {
				select: jest.fn(function () { return this }),
				eq: jest.fn(function () { return this }),
				neq: jest.fn().mockResolvedValue({ count: 0, error: null })
			}
			const mockPropertiesQuery = {
				insert: jest.fn(function () { return this }),
				select: jest.fn(function () { return this }),
				single: jest.fn().mockResolvedValue({ data: null, error: pgError })
			}
			mockAdminClient.from
				.mockImplementationOnce(() => mockCountQuery)
				.mockImplementationOnce(() => mockPropertiesQuery)
		}

		const validCreateDto = {
			name: 'Test',
			address_line1: '123 Main',
			city: 'Austin',
			state: 'TX',
			postal_code: '78701',
			property_type: 'APARTMENT'
		}

		it('should throw BadRequestException on generic database error', async () => {
			setupCreateErrorTest({ message: 'DB error', code: '42000' })

			await expect(
				service.create(createMockRequest('user-123'), validCreateDto)
			).rejects.toThrow(new BadRequestException('Failed to create property'))
		})

		it('should return user-friendly message for unique constraint violation (23505)', async () => {
			setupCreateErrorTest({
				message: 'duplicate key value violates unique constraint "properties_address_user_id_key"',
				code: '23505'
			})

			await expect(
				service.create(createMockRequest('user-123'), validCreateDto)
			).rejects.toThrow(new BadRequestException('A property with this address already exists'))
		})

		it('should return user-friendly message for foreign key violation (23503)', async () => {
			setupCreateErrorTest({
				message: 'insert or update on table "properties" violates foreign key constraint "properties_owner_user_id_fkey"',
				code: '23503'
			})

			await expect(
				service.create(createMockRequest('user-123'), validCreateDto)
			).rejects.toThrow(new BadRequestException('Invalid reference — check property type or owner'))
		})

		it('should throw ForbiddenException when plan property limit is reached', async () => {
			const propertyLimit = 3

			// Plan allows 3 properties; user already has 3
			mockAdminClient.rpc.mockResolvedValue({
				data: [{ property_limit: propertyLimit }],
				error: null
			})

			const mockCountQuery = {
				select: jest.fn(function () { return this }),
				eq: jest.fn(function () { return this }),
				neq: jest.fn().mockResolvedValue({ count: propertyLimit, error: null })
			}

			mockAdminClient.from.mockImplementationOnce(() => mockCountQuery)

			const error = await service
				.create(createMockRequest('user-123'), {
					name: 'One Too Many',
					address_line1: '1 Extra St',
					city: 'Austin',
					state: 'TX',
					postal_code: '78701',
					property_type: 'APARTMENT'
				})
				.catch(e => e)

			expect(error).toBeInstanceOf(ForbiddenException)
			const response = (error as ForbiddenException).getResponse() as Record<string, unknown>
			expect(response.code).toBe('PLAN_LIMIT_EXCEEDED')
			expect(response.limit).toBe(propertyLimit)
			expect(response.current).toBe(propertyLimit)
			expect(response.resource).toBe('properties')
		})

		it('should auto-create default unit for single-unit property types', async () => {
			const mockCreated = createMockProperty({
				id: 'prop-single',
				name: 'My House',
				property_type: 'SINGLE_FAMILY'
			})

			mockAdminClient.rpc.mockResolvedValue({
				data: [{ property_limit: 5 }],
				error: null
			})

			const mockCountQuery = {
				select: jest.fn(function () { return this }),
				eq: jest.fn(function () { return this }),
				neq: jest.fn().mockResolvedValue({ count: 0, error: null })
			}

			const mockPropertiesQuery = {
				insert: jest.fn(function () { return this }),
				select: jest.fn(function () { return this }),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			const mockUnitsQuery = {
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			mockAdminClient.from
				.mockImplementationOnce(() => mockCountQuery)      // count check
				.mockImplementationOnce(() => mockPropertiesQuery)  // property insert
				.mockImplementationOnce(() => mockUnitsQuery)       // unit insert

			const result = await service.create(
				createMockRequest('user-123'),
				{
					name: 'My House',
					address_line1: '456 Oak Ave',
					city: 'Austin',
					state: 'TX',
					postal_code: '78702',
					property_type: 'SINGLE_FAMILY'
				}
			)

			expect(result).toEqual(mockCreated)
			expect(mockUnitsQuery.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					property_id: 'prop-single',
					owner_user_id: 'user-123',
					unit_number: '1',
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 0,
					status: 'available'
				})
			)
		})

		it('should NOT auto-create unit for multi-unit property types', async () => {
			const mockCreated = createMockProperty({
				id: 'prop-multi',
				name: 'Big Apartment',
				property_type: 'APARTMENT'
			})

			mockAdminClient.rpc.mockResolvedValue({
				data: [{ property_limit: 5 }],
				error: null
			})

			const mockCountQuery = {
				select: jest.fn(function () { return this }),
				eq: jest.fn(function () { return this }),
				neq: jest.fn().mockResolvedValue({ count: 0, error: null })
			}

			const mockPropertiesQuery = {
				insert: jest.fn(function () { return this }),
				select: jest.fn(function () { return this }),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			mockAdminClient.from
				.mockImplementationOnce(() => mockCountQuery)
				.mockImplementationOnce(() => mockPropertiesQuery)

			await service.create(
				createMockRequest('user-123'),
				{
					name: 'Big Apartment',
					address_line1: '789 Main St',
					city: 'Austin',
					state: 'TX',
					postal_code: '78703',
					property_type: 'APARTMENT'
				}
			)

			// Should only call from() twice: count + insert. No units insert.
			expect(mockAdminClient.from).toHaveBeenCalledTimes(2)
		})

		it('should not fail property creation if auto-unit creation fails', async () => {
			const mockCreated = createMockProperty({
				id: 'prop-unit-fail',
				name: 'Condo',
				property_type: 'CONDO'
			})

			mockAdminClient.rpc.mockResolvedValue({
				data: [{ property_limit: 5 }],
				error: null
			})

			const mockCountQuery = {
				select: jest.fn(function () { return this }),
				eq: jest.fn(function () { return this }),
				neq: jest.fn().mockResolvedValue({ count: 0, error: null })
			}

			const mockPropertiesQuery = {
				insert: jest.fn(function () { return this }),
				select: jest.fn(function () { return this }),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			const mockUnitsQuery = {
				insert: jest.fn().mockRejectedValue(new Error('Unit insert failed'))
			}

			mockAdminClient.from
				.mockImplementationOnce(() => mockCountQuery)
				.mockImplementationOnce(() => mockPropertiesQuery)
				.mockImplementationOnce(() => mockUnitsQuery)

			// Should still succeed even though unit creation failed
			const result = await service.create(
				createMockRequest('user-123'),
				{
					name: 'Condo',
					address_line1: '100 Beach Rd',
					city: 'Austin',
					state: 'TX',
					postal_code: '78704',
					property_type: 'CONDO'
				}
			)

			expect(result).toEqual(mockCreated)
		})

		it('should throw InternalServerErrorException when plan limits RPC fails', async () => {
			mockAdminClient.rpc.mockResolvedValue({
				data: null,
				error: { message: 'RPC error' }
			})

			await expect(
				service.create(createMockRequest('user-123'), {
					name: 'Test',
					address_line1: '1 Main St',
					city: 'Austin',
					state: 'TX',
					postal_code: '78701',
					property_type: 'APARTMENT'
				})
			).rejects.toThrow(InternalServerErrorException)
		})
	})

	describe('update', () => {
		it('should update a property after verifying ownership', async () => {
			const mockExisting = createMockProperty({
				id: 'prop-1',
				owner_user_id: 'user-123'
			})
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

			const result = await service.update(
				createMockRequest('user-123'),
				'prop-1',
				{
					name: ' Updated Name '
				}
			)

			expect(result).toEqual(mockUpdated)
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Updated Name',
					updated_at: expect.any(String)
				})
			)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('owner_user_id', 'user-123')
		})
	})

	// Note: 'remove' method tests moved to property-lifecycle.service.spec.ts
	// The remove method was extracted to PropertyLifecycleService


	describe('findAllWithUnits', () => {
		it('should return properties with units and apply search filter', async () => {
			const mockProperties = [createMockProperty({ name: 'Downtown Loft' })]

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				neq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockResolvedValue({ data: mockProperties, error: null })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAllWithUnits(
				createMockRequest('user-123') as unknown as AuthenticatedRequest,
				{
					search: 'Loft',
					limit: 5,
					offset: 0
				}
			)

			expect(result).toEqual({
				data: mockProperties,
				total: 0,
				limit: 5,
				offset: 0
			})
			expect(mockQueryBuilder.select).toHaveBeenCalledWith(
				'*, units:unit(*, lease(*))',
				{ count: 'exact' }
			)
			expect(mockQueryBuilder.or).toHaveBeenCalledWith(
				buildMultiColumnSearch('Loft', ['name', 'address'])
			)
		})
	})
})
