import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException, Logger } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'
import { UtilityService } from '../../shared/services/utility.service'
import { buildMultiColumnSearch } from '../../shared/utils/sql-safe.utils'
import { SilentLogger } from '../../__test__/silent-logger'
import { createMockProperty } from '../../test-utils/mocks'
import { PropertiesService } from './properties.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'

// Helper function to create mock Request objects
function createMockRequest(
	userId: string,
	token = 'mock-token'
): AuthenticatedRequest {
	return {
		user: {
			id: userId,
			email: 'test@example.com',
			aud: 'authenticated',
			role: 'authenticated',
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
	let cacheManager: {
		get: jest.Mock
		set: jest.Mock
	}
	let mockAdminClient: {
		from: jest.Mock
		rpc: jest.Mock
	}
	let mockUserClient: {
		from: jest.Mock
		rpc: jest.Mock
	}
	let mockDashboardAnalytics: {
		getDashboardStats: jest.Mock
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
					provide: DashboardAnalyticsService,
					useValue: {
						getDashboardStats: jest.fn().mockResolvedValue({
							properties: {
								total: 0,
								occupied: 0,
								vacant: 0,
								occupancyRate: 0,
								totalMonthlyRent: 0,
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
		cacheManager = module.get(CACHE_MANAGER)
		mockDashboardAnalytics = module.get(DashboardAnalyticsService)
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
			expect(mockUserClient.from).toHaveBeenCalledWith('property')
			// RLS enforces ownership, so no manual .eq('ownerId') filter needed
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

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findOne(
				createMockRequest('user-123'),
				'prop-1'
			)

			expect(result).toEqual(mockProperty)
			expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'prop-1')
			// RLS enforces ownership, so no manual .eq('ownerId') filter needed
		})

		it('should return null when property not found', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'Not found' } })
			}

			mockAdminClient.from.mockReturnValue(mockQueryBuilder)

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
				address: '123 Main St'
			})

			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockCreated, error: null })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const payload = {
				name: 'Park View',
				address: '123 Main St',
				city: 'Austin',
				state: 'TX',
				zipCode: '78701',
				propertyType: 'APARTMENT' as const,
				description: 'Beautiful views'
			}

			const result = await service.create(
				createMockRequest('user-123'),
				payload
			)

			expect(result).toEqual(mockCreated)
			expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					ownerId: 'user-123',
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
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'DB error' } })
			}

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			await expect(
				service.create(createMockRequest('user-123'), {
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
			const mockExisting = createMockProperty({
				id: 'prop-1',
				ownerId: 'internal-uid-1'
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

			const result = await service.getStats(createMockRequest('user-123'))

			expect(result).toEqual(mockStats)
			expect(cacheManager.get).toHaveBeenCalledWith('property-stats:user-123')
			expect(mockUserClient.rpc).not.toHaveBeenCalled()
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

			// Mock DashboardAnalyticsService to return the expected stats
			mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
				properties: mockStats,
				tenants: {},
				leases: {}
			})

			// Mock the RPC call
			mockUserClient.rpc.mockResolvedValue({ data: mockStats, error: null })

			const result = await service.getStats(createMockRequest('user-123'))

			expect(result).toEqual(mockStats)
			expect(mockUserClient.rpc).toHaveBeenCalledWith('get_property_stats', {
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

			mockUserClient.from.mockReturnValue(mockQueryBuilder)

			const result = await service.findAllWithUnits(
				createMockRequest('user-123'),
				{
					search: 'Loft',
					limit: 5,
					offset: 0
				}
			)

			expect(result).toEqual(mockProperties)
			expect(mockQueryBuilder.select).toHaveBeenCalledWith(
				'*, units:unit(*, lease(*))'
			)
			expect(mockQueryBuilder.or).toHaveBeenCalledWith(
				buildMultiColumnSearch('Loft', ['name', 'address'])
			)
		})
	})
})
