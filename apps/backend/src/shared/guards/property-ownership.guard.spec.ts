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
})
