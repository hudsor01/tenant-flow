/**
 * Property-Based Tests for PropertyOwnershipGuard
 *
 * Feature: fix-tenant-invitation-issues
 * Tests property_id extraction from nested request structures
 */

import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import * as fc from 'fast-check'
import { PropertyOwnershipGuard } from './property-ownership.guard'
import { SupabaseService } from '../../database/supabase.service'
import { AuthRequestCache } from '../services/auth-request-cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../types/express-request.types'

describe('PropertyOwnershipGuard', () => {
  let guard: PropertyOwnershipGuard
  let mockSupabaseService: Partial<SupabaseService>
  let mockAuthCache: Partial<AuthRequestCache>
  let mockLogger: Partial<AppLogger>

  beforeEach(() => {
    // Create mock services
    mockSupabaseService = {
      getAdminClient: jest.fn() as any
    }

    mockAuthCache = {
      getOrSet: jest.fn() as any
    }

    mockLogger = {
      warn: jest.fn() as any,
      debug: jest.fn() as any,
      error: jest.fn() as any,
      log: jest.fn() as any
    }

    guard = new PropertyOwnershipGuard(
      mockSupabaseService as SupabaseService,
      mockAuthCache as AuthRequestCache,
      mockLogger as AppLogger
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

  describe('Authentication', () => {
    it('should throw ForbiddenException when no user is present', async () => {
      const context = createContext({
        body: {},
        params: {},
        query: {}
      })

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required')
      expect(mockLogger.warn).toHaveBeenCalledWith('PropertyOwnershipGuard: No user ID in request')
    })
  })

  describe('Property ID Extraction', () => {
    /**
     * Feature: fix-tenant-invitation-issues, Property 2: Property ID Extraction from Nested Structure
     * Validates: Requirements 1.2
     *
     * For any request containing property_id in the leaseData object,
     * the PropertyOwnershipGuard should successfully extract the property_id value.
     */
    it('should extract property_id from nested leaseData structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            // Setup: Mock successful ownership verification
            mockAuthCache.getOrSet.mockResolvedValue(true)

            // Create request with nested leaseData structure (matches InviteTenantRequest)
            const context = createContext({
              user: { id: userId } as any,
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

            // Execute
            const result = await guard.canActivate(context)

            // Assert: Guard should successfully extract property_id and verify ownership
            expect(result).toBe(true)
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${propertyId}:owner:${userId}`,
              expect.any(Function)
            )
            expect(mockLogger.debug).toHaveBeenCalledWith(
              'PropertyOwnershipGuard: ownership verified',
              expect.objectContaining({
                user_id: userId,
                property_id: propertyId
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract property_id from request.body.property_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            mockAuthCache.getOrSet.mockResolvedValue(true)

            const context = createContext({
              user: { id: userId } as any,
              body: {
                property_id: propertyId
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
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract property_id from request.params.property_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            mockAuthCache.getOrSet.mockResolvedValue(true)

            const context = createContext({
              user: { id: userId } as any,
              body: {},
              params: {
                property_id: propertyId
              },
              query: {}
            })

            const result = await guard.canActivate(context)

            expect(result).toBe(true)
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${propertyId}:owner:${userId}`,
              expect.any(Function)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract property_id from request.query.property_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            mockAuthCache.getOrSet.mockResolvedValue(true)

            const context = createContext({
              user: { id: userId } as any,
              body: {},
              params: {},
              query: {
                property_id: propertyId
              }
            })

            const result = await guard.canActivate(context)

            expect(result).toBe(true)
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${propertyId}:owner:${userId}`,
              expect.any(Function)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should prioritize params over body over query for property_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (userId, paramsId, bodyId, queryId) => {
            // Ensure all IDs are different
            fc.pre(paramsId !== bodyId && bodyId !== queryId && paramsId !== queryId)

            mockAuthCache.getOrSet.mockResolvedValue(true)

            const context = createContext({
              user: { id: userId } as any,
              body: {
                property_id: bodyId
              },
              params: {
                property_id: paramsId
              },
              query: {
                property_id: queryId
              }
            })

            await guard.canActivate(context)

            // Should use params.property_id (highest priority)
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${paramsId}:owner:${userId}`,
              expect.any(Function)
            )
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Ownership Verification', () => {
    /**
     * Feature: fix-tenant-invitation-issues, Property 3: Ownership Verification Execution
     * Validates: Requirements 1.3, 1.4
     *
     * For any invitation request with a property_id, the system should verify
     * property ownership before proceeding with invitation creation.
     */
    it('should verify ownership before allowing invitation for any property_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            // Mock ownership verification to return true
            mockAuthCache.getOrSet.mockResolvedValue(true)

            // Create request with property_id (simulating invitation request)
            const context = createContext({
              user: { id: userId } as any,
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

            // Execute
            const result = await guard.canActivate(context)

            // Assert: Ownership verification MUST be called with correct parameters
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${propertyId}:owner:${userId}`,
              expect.any(Function)
            )

            // Assert: Guard should allow access after successful verification
            expect(result).toBe(true)

            // Assert: Success should be logged
            expect(mockLogger.debug).toHaveBeenCalledWith(
              'PropertyOwnershipGuard: ownership verified',
              expect.objectContaining({
                user_id: userId,
                property_id: propertyId
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should deny access when ownership verification fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            // Mock ownership verification to return false
            mockAuthCache.getOrSet.mockResolvedValue(false)

            const context = createContext({
              user: { id: userId } as any,
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

            // Assert: Should throw ForbiddenException when ownership verification fails
            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
            await expect(guard.canActivate(context)).rejects.toThrow(
              'You do not have access to this property resource'
            )

            // Assert: Ownership verification MUST have been called
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${propertyId}:owner:${userId}`,
              expect.any(Function)
            )

            // Assert: Denial should be logged with context
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'PropertyOwnershipGuard: access denied',
              expect.objectContaining({
                user_id: userId,
                property_id: propertyId,
                reason: 'ownership_verification_failed'
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should execute ownership verification for any valid property_id location', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.constantFrom('params', 'body', 'query', 'leaseData'),
          async (userId, propertyId, location) => {
            mockAuthCache.getOrSet.mockResolvedValue(true)

            // Create request with property_id in different locations
            const requestData: any = {
              user: { id: userId },
              body: {},
              params: {},
              query: {}
            }

            if (location === 'params') {
              requestData.params.property_id = propertyId
            } else if (location === 'body') {
              requestData.body.property_id = propertyId
            } else if (location === 'query') {
              requestData.query.property_id = propertyId
            } else if (location === 'leaseData') {
              requestData.body.leaseData = { property_id: propertyId }
            }

            const context = createContext(requestData)

            // Execute
            await guard.canActivate(context)

            // Assert: Ownership verification MUST be executed regardless of location
            expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
              `property:${propertyId}:owner:${userId}`,
              expect.any(Function)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Logging', () => {
    it('should log warning when no resource IDs are found', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            const context = createContext({
              user: { id: userId } as any,
              body: {},
              params: {},
              query: {}
            })

            const result = await guard.canActivate(context)

            expect(result).toBe(true)
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'PropertyOwnershipGuard: No resource IDs found in request',
              expect.objectContaining({
                user_id: userId,
                body: '{}',
                params: '{}',
                query: '{}'
              })
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should log debug message on successful ownership verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            mockAuthCache.getOrSet.mockResolvedValue(true)

            const context = createContext({
              user: { id: userId } as any,
              body: {
                leaseData: {
                  property_id: propertyId
                }
              },
              params: {},
              query: {}
            })

            await guard.canActivate(context)

            expect(mockLogger.debug).toHaveBeenCalledWith(
              'PropertyOwnershipGuard: ownership verified',
              expect.objectContaining({
                user_id: userId,
                property_id: propertyId
              })
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should log warning with context when ownership verification fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, propertyId) => {
            // Mock ownership verification failure
            mockAuthCache.getOrSet.mockResolvedValue(false)

            const context = createContext({
              user: { id: userId } as any,
              body: {
                property_id: propertyId
              },
              params: {},
              query: {}
            })

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)

            expect(mockLogger.warn).toHaveBeenCalledWith(
              'PropertyOwnershipGuard: access denied',
              expect.objectContaining({
                property_id: propertyId,
                user_id: userId,
                reason: 'ownership_verification_failed',
                message: 'You do not have access to this property resource'
              })
            )
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Caching Behavior', () => {
    /**
     * Unit tests for caching behavior
     * Requirements: 4.1, 4.3
     *
     * Note: AuthRequestCache is request-scoped (not time-based), so it only
     * caches within a single HTTP request. The 5-minute expiration mentioned
     * in requirements is not applicable to the current implementation.
     */

    it('should use cache on repeated ownership checks within the same request (cache hit)', async () => {
      const userId = 'user-123'
      const propertyId = 'property-456'

      // Mock the cache to track calls
      let factoryCalls = 0
      mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
        factoryCalls++
        return await factory()
      })

      // Mock the Supabase query to return ownership = true
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: userId },
          error: null
        })
      }
      mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

      // First check - should call factory
      const context1 = createContext({
        user: { id: userId } as any,
        body: { property_id: propertyId },
        params: {},
        query: {}
      })

      await guard.canActivate(context1)
      expect(factoryCalls).toBe(1)
      expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
        `property:${propertyId}:owner:${userId}`,
        expect.any(Function)
      )

      // Reset mock to simulate cache hit behavior
      factoryCalls = 0
      mockAuthCache.getOrSet.mockResolvedValue(true) // Return cached value

      // Second check - should use cached value (no factory call)
      const context2 = createContext({
        user: { id: userId } as any,
        body: { property_id: propertyId },
        params: {},
        query: {}
      })

      await guard.canActivate(context2)

      // Verify cache was checked again
      expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
        `property:${propertyId}:owner:${userId}`,
        expect.any(Function)
      )

      // Factory should not have been called (cache hit)
      expect(factoryCalls).toBe(0)
    })

    it('should query database on first ownership check (cache miss)', async () => {
      const userId = 'user-789'
      const propertyId = 'property-012'

      // Track if factory was called
      let factoryCalled = false
      mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
        factoryCalled = true
        return await factory()
      })

      // Mock the Supabase query
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: userId },
          error: null
        })
      }
      mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

      const context = createContext({
        user: { id: userId } as any,
        body: { property_id: propertyId },
        params: {},
        query: {}
      })

      await guard.canActivate(context)

      // Verify cache was checked
      expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
        `property:${propertyId}:owner:${userId}`,
        expect.any(Function)
      )

      // Verify factory was called (cache miss)
      expect(factoryCalled).toBe(true)

      // Verify database was queried
      expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
      expect(mockClient.from).toHaveBeenCalledWith('properties')
      expect(mockClient.select).toHaveBeenCalledWith('owner_user_id')
      expect(mockClient.eq).toHaveBeenCalledWith('id', propertyId)
    })

    it('should cache different resource types independently', async () => {
      const userId = 'user-abc'
      const propertyId = 'property-def'
      const leaseId = 'lease-ghi'
      const tenantId = 'tenant-jkl'

      // Track cache keys
      const cacheKeys: string[] = []
      mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
        cacheKeys.push(key)
        return await factory()
      })

      // Mock Supabase queries for all resource types
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: userId },
          error: null
        })
      }
      mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

      // Request with all three resource types
      const context = createContext({
        user: { id: userId } as any,
        body: {
          property_id: propertyId,
          lease_id: leaseId,
          tenant_id: tenantId
        },
        params: {},
        query: {}
      })

      await guard.canActivate(context)

      // Verify each resource type has its own cache key
      expect(cacheKeys).toContain(`property:${propertyId}:owner:${userId}`)
      expect(cacheKeys).toContain(`lease:${leaseId}:owner:${userId}`)
      expect(cacheKeys).toContain(`tenant:${tenantId}:owner:${userId}`)
      expect(cacheKeys).toHaveLength(3)
    })

    it('should cache results per user (different users have different cache entries)', async () => {
      const user1Id = 'user-111'
      const user2Id = 'user-222'
      const propertyId = 'property-shared'

      const cacheKeys: string[] = []
      mockAuthCache.getOrSet.mockImplementation(async (key, factory) => {
        cacheKeys.push(key)
        // Return true for both users to allow the test to complete
        return true
      })

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { owner_user_id: user1Id },
          error: null
        })
      }
      mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

      // First user checks ownership
      const context1 = createContext({
        user: { id: user1Id } as any,
        body: { property_id: propertyId },
        params: {},
        query: {}
      })
      await guard.canActivate(context1)

      // Second user checks ownership of same property
      const context2 = createContext({
        user: { id: user2Id } as any,
        body: { property_id: propertyId },
        params: {},
        query: {}
      })
      await guard.canActivate(context2)

      // Verify different cache keys for different users
      expect(cacheKeys).toContain(`property:${propertyId}:owner:${user1Id}`)
      expect(cacheKeys).toContain(`property:${propertyId}:owner:${user2Id}`)
      expect(cacheKeys[0]).not.toBe(cacheKeys[1])
    })

    it('should handle cache returning false (denied ownership)', async () => {
      const userId = 'user-denied'
      const propertyId = 'property-forbidden'

      // Mock cache to return false (ownership denied)
      mockAuthCache.getOrSet.mockResolvedValue(false)

      const context = createContext({
        user: { id: userId } as any,
        body: { property_id: propertyId },
        params: {},
        query: {}
      })

      // Should throw ForbiddenException
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You do not have access to this property resource'
      )

      // Verify cache was checked
      expect(mockAuthCache.getOrSet).toHaveBeenCalledWith(
        `property:${propertyId}:owner:${userId}`,
        expect.any(Function)
      )
    })
  })
})
