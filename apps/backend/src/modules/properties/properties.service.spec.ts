import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException, Logger } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'
import { UtilityService } from '../../shared/services/utility.service'
import { buildMultiColumnSearch } from '../../shared/utils/sql-safe.utils'
import { SilentLogger } from '../../__test__/silent-logger'
// Define createMockProperty locally since it doesn't exist in mocks
function createMockProperty(overrides?: Partial<any>): any {
	return {
		id: 'property-' + Math.random().toString(36).substr(2, 9),
		property_owner_id: 'user-123',
		name: 'Test Property',
		address_line1: '123 Main St',
		city: 'Test City',
		state: 'TS',
		postal_code: '12345',
		country: 'US',
		status: 'ACTIVE',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}
}
import { PropertiesService } from './properties.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'

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
					provide: CACHE_MANAGER,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						del: jest.fn()
					}
				},
				{
					provide: Logger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<PropertiesService>(PropertiesService)
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
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockResolvedValue({ data: mockProperties, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('mock-jwt-token', {
				search: '  Main  ',
				limit: 10,
				offset: 0
			})

			expect(result).toEqual(mockProperties)
			expect(mockUserClient.from).toHaveBeenCalledWith('properties')
			// RLS enforces ownership, so no manual .eq('owner_id') filter needed
			expect(mockQueryBuilder.or).toHaveBeenCalledWith(
				buildMultiColumnSearch('Main', ['name', 'address', 'city'])
			)
		})

		it('should return empty array on database error', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAll('mock-jwt-token', {
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

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findOne(
				createMockRequest('user-123'),
				'prop-1'
			)

			expect(result).toEqual(mockProperty)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'prop-1')
			// RLS enforces ownership, so no manual .eq('owner_id') filter needed
		})

		it('should return null when property not found', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'Not found' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findOne(
				createMockRequest('user-123'),
				'nonexistent'
			)

			expect(result).toBeNull()
		})
	})

	describe('create', () => {
		it('should create a property with trimmed values', async () => {
			const mockCreated = createMockProperty({
			name: 'Park View',
			address_line1: '123 Main St'
		})

			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

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
			expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					property_owner_id: 'user-123',
					name: 'Park View',
					address_line1: '123 Main St',
					city: 'Austin',
					state: 'TX',
					postal_code: '78701',
					property_type: 'APARTMENT'
				})
			)
		})

		it('should throw BadRequestException on database error', async () => {
			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.create(createMockRequest('user-123'), {
					name: 'Test',
					address_line1: '123 Main',
					city: 'Austin',
					state: 'TX',
					postal_code: '78701',
					property_type: 'APARTMENT'
				})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('update', () => {
		it('should update a property after verifying ownership', async () => {
			const mockExisting = createMockProperty({
			id: 'prop-1',
			property_owner_id: 'internal-uid-1'
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

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

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

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.remove(
				createMockRequest('user-123'),
				'prop-1'
			)

			expect(result).toEqual({
				success: true,
				message: 'Property deleted successfully'
			})
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'inactive' })
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

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

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
