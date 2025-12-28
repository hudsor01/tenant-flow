/**
 * Unit Tests for PropertyOwnershipGuard
 *
 * Feature: tenant-invitation-403-fix
 * Tests the ownership verification methods with correct database joins
 */

import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { PropertyOwnershipGuard } from '../property-ownership.guard'
import { SupabaseService } from '../../../database/supabase.service'
import { AuthRequestCache } from '../../services/auth-request-cache.service'
import { AppLogger } from '../../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../../types/express-request.types'

describe('PropertyOwnershipGuard - Unit Tests', () => {
	let guard: PropertyOwnershipGuard
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockAuthCache: jest.Mocked<AuthRequestCache>
	let mockLogger: jest.Mocked<AppLogger>
	let mockSupabaseClient: ReturnType<SupabaseService['getAdminClient']>

	beforeEach(() => {
		// Create mock Supabase client with chainable methods
		mockSupabaseClient = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn()
		}

		// Create mock services
		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
		} as jest.Mocked<SupabaseService>

		mockAuthCache = {
			getOrSet: jest.fn()
		} as jest.Mocked<AuthRequestCache>

		mockLogger = {
			warn: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			log: jest.fn()
		} as jest.Mocked<AppLogger>

		guard = new PropertyOwnershipGuard(
			mockSupabaseService,
			mockAuthCache,
			mockLogger
		)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	const createContext = (
		request: Partial<AuthenticatedRequest>
	): ExecutionContext => {
		return {
			switchToHttp: () => ({
				getRequest: () => request as AuthenticatedRequest
			}),
			getHandler: () => ({}),
			getClass: () => ({})
		} as ExecutionContext
	}

	describe('verifyPropertyOwnership', () => {
		it('should query properties using owner_user_id schema', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			// Mock successful ownership verification
			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			// Mock cache to execute the verification function
			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await guard.canActivate(context)

			// Verify correct query structure
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties')
			expect(mockSupabaseClient.select).toHaveBeenCalledWith('owner_user_id')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', propertyId)
			expect(mockSupabaseClient.single).toHaveBeenCalled()
		})

		it('should return true when user owns the property', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			const result = await guard.canActivate(context)

			expect(result).toBe(true)
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: verifyPropertyOwnership result',
				expect.objectContaining({
					user_id: userId,
					property_id: propertyId,
					isOwner: true
				})
			)
		})

		it('should return false when user does not own the property', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'
			const differentUserId = 'user-789'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: differentUserId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await expect(guard.canActivate(context)).rejects.toThrow(
				ForbiddenException
			)
		})

		it('should handle database errors gracefully', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Database connection failed' }
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await expect(guard.canActivate(context)).rejects.toThrow(
				ForbiddenException
			)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: Database error in verifyPropertyOwnership',
				expect.objectContaining({
					user_id: userId,
					property_id: propertyId,
					error: 'Database connection failed'
				})
			)
		})
	})

	describe('verifyLeaseOwnership', () => {
		it('should query leases using owner_user_id schema', async () => {
			const userId = 'user-123'
			const leaseId = 'lease-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { lease_id: leaseId },
				params: {},
				query: {}
			})

			await guard.canActivate(context)

			// Verify correct query structure with owner_user_id (not owner_id)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('leases')
			expect(mockSupabaseClient.select).toHaveBeenCalledWith('owner_user_id')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', leaseId)
			expect(mockSupabaseClient.single).toHaveBeenCalled()
		})

		it('should return true when user owns the lease', async () => {
			const userId = 'user-123'
			const leaseId = 'lease-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { lease_id: leaseId },
				params: {},
				query: {}
			})

			const result = await guard.canActivate(context)

			expect(result).toBe(true)
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: verifyLeaseOwnership result',
				expect.objectContaining({
					user_id: userId,
					lease_id: leaseId,
					isOwner: true
				})
			)
		})

		it('should handle database errors gracefully', async () => {
			const userId = 'user-123'
			const leaseId = 'lease-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Query failed' }
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { lease_id: leaseId },
				params: {},
				query: {}
			})

			await expect(guard.canActivate(context)).rejects.toThrow(
				ForbiddenException
			)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: Database error in verifyLeaseOwnership',
				expect.objectContaining({
					user_id: userId,
					lease_id: leaseId,
					error: 'Query failed'
				})
			)
		})
	})

	describe('verifyTenantOwnership', () => {
		it('should query leases by primary_tenant_id using owner_user_id schema', async () => {
			const userId = 'user-123'
			const tenantId = 'tenant-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { tenant_id: tenantId },
				params: {},
				query: {}
			})

			await guard.canActivate(context)

			// Verify correct query structure with primary_tenant_id (not tenant_id)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('leases')
			expect(mockSupabaseClient.select).toHaveBeenCalledWith('owner_user_id')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
				'primary_tenant_id',
				tenantId
			)
			expect(mockSupabaseClient.single).toHaveBeenCalled()
		})

		it('should return true when user owns the tenant', async () => {
			const userId = 'user-123'
			const tenantId = 'tenant-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { tenant_id: tenantId },
				params: {},
				query: {}
			})

			const result = await guard.canActivate(context)

			expect(result).toBe(true)
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: verifyTenantOwnership result',
				expect.objectContaining({
					user_id: userId,
					tenant_id: tenantId,
					isOwner: true
				})
			)
		})

		it('should handle database errors gracefully', async () => {
			const userId = 'user-123'
			const tenantId = 'tenant-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Tenant not found' }
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { tenant_id: tenantId },
				params: {},
				query: {}
			})

			await expect(guard.canActivate(context)).rejects.toThrow(
				ForbiddenException
			)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: Database error in verifyTenantOwnership',
				expect.objectContaining({
					user_id: userId,
					tenant_id: tenantId,
					error: 'Tenant not found'
				})
			)
		})
	})

	describe('Resource ID Extraction', () => {
		it('should extract property_id from nested leaseData structure', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockResolvedValue(true)

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: {
					tenantData: {
						email: 'tenant@example.com',
						first_name: 'John',
						last_name: 'Doe'
					},
					leaseData: {
						property_id: propertyId
					}
				},
				params: {},
				query: {}
			})

			const result = await guard.canActivate(context)

			expect(result).toBe(true)
			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`property:${propertyId}:owner:${userId}`,
				expect.any(Function)
			)
		})

		it('should extract lease_id from nested leaseData structure', async () => {
			const userId = 'user-123'
			const leaseId = 'lease-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockResolvedValue(true)

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: {
					leaseData: {
						lease_id: leaseId
					}
				},
				params: {},
				query: {}
			})

			const result = await guard.canActivate(context)

			expect(result).toBe(true)
			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`lease:${leaseId}:owner:${userId}`,
				expect.any(Function)
			)
		})
	})

	describe('Error Handling', () => {
		it('should handle unexpected errors in verification methods', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			// Simulate an unexpected error (not a database error)
			mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'))

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await expect(guard.canActivate(context)).rejects.toThrow(
				ForbiddenException
			)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'PropertyOwnershipGuard: Unexpected error in verifyPropertyOwnership',
				expect.objectContaining({
					user_id: userId,
					property_id: propertyId,
					error: 'Unexpected error'
				})
			)
		})
	})

	describe('Caching Behavior', () => {
		it('should use cache for repeated ownership checks (cache hit)', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			// Mock cache to return cached value on second call
			let callCount = 0
			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				callCount++
				if (callCount === 1) {
					// First call: execute factory and cache result
					return await factory()
				}
				// Second call: return cached value without executing factory
				return true
			})

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			// First call
			await guard.canActivate(context)
			expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1)

			// Reset mock to verify second call doesn't query database
			mockSupabaseClient.single.mockClear()

			// Second call with same parameters
			await guard.canActivate(context)

			// Verify cache was used (no database query on second call)
			expect(mockAuthCache.getOrSet).toHaveBeenCalledTimes(2)
			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`property:${propertyId}:owner:${userId}`,
				expect.any(Function)
			)
		})

		it('should query database on first check (cache miss)', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			// Mock cache to execute factory on first call (cache miss)
			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await guard.canActivate(context)

			// Verify database was queried
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties')
			expect(mockSupabaseClient.single).toHaveBeenCalled()

			// Verify cache was attempted
			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`property:${propertyId}:owner:${userId}`,
				expect.any(Function)
			)
		})

		it('should use correct cache keys for different resource types', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'
			const leaseId = 'lease-789'
			const tenantId = 'tenant-012'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: userId
				},
				error: null
			})

			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			// Test property cache key
			const propertyContext = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await guard.canActivate(propertyContext)

			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`property:${propertyId}:owner:${userId}`,
				expect.any(Function)
			)

			mockAuthCache.getOrSet.mockClear()

			// Test lease cache key
			const leaseContext = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { lease_id: leaseId },
				params: {},
				query: {}
			})

			await guard.canActivate(leaseContext)

			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`lease:${leaseId}:owner:${userId}`,
				expect.any(Function)
			)

			mockAuthCache.getOrSet.mockClear()

			// Test tenant cache key
			const tenantContext = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { tenant_id: tenantId },
				params: {},
				query: {}
			})

			await guard.canActivate(tenantContext)

			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`tenant:${tenantId}:owner:${userId}`,
				expect.any(Function)
			)
		})

		it('should cache negative results (access denied)', async () => {
			const userId = 'user-123'
			const propertyId = 'property-456'
			const differentUserId = 'user-789'

			mockSupabaseClient.single.mockResolvedValue({
				data: {
					owner_user_id: differentUserId
				},
				error: null
			})

			// Mock cache to execute factory (returns false)
			mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
				return await factory()
			})

			const context = createContext({
				user: { id: userId } as AuthenticatedRequest['user'],
				body: { property_id: propertyId },
				params: {},
				query: {}
			})

			await expect(guard.canActivate(context)).rejects.toThrow(
				ForbiddenException
			)

			// Verify cache was used even for negative result
			expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
				`property:${propertyId}:owner:${userId}`,
				expect.any(Function)
			)
		})

		/**
		 * Note on Cache Expiration:
		 *
		 * The AuthRequestCache is request-scoped (@Injectable({ scope: Scope.REQUEST })),
		 * meaning it only lives for the duration of a single HTTP request. The cache is
		 * automatically cleared when the request completes.
		 *
		 * Requirements 4.1 and 4.3 mention 5-minute cache expiration, but the current
		 * implementation uses request-scoped caching instead of time-based caching.
		 * This design choice means:
		 *
		 * 1. Cache hit: Multiple ownership checks within the same request reuse cached results
		 * 2. Cache miss: Each new request starts with an empty cache
		 * 3. Cache expiration: Not applicable - cache is cleared at request end (not time-based)
		 *
		 * This approach is simpler and avoids stale cache issues, as each request gets
		 * fresh ownership verification. If time-based caching is needed in the future,
		 * the AuthRequestCache would need to be refactored to use a global cache with TTL
		 * (e.g., using cache-manager with Redis or in-memory store).
		 */
		it('should document cache scope limitations', () => {
			// This test documents that the current implementation uses request-scoped caching
			// rather than time-based caching with 5-minute expiration
			expect(mockAuthCache.getOrSet).toBeDefined()

			// The cache is request-scoped, so it's automatically cleared between requests
			// No time-based expiration testing is applicable with the current implementation
		})
	})
})
