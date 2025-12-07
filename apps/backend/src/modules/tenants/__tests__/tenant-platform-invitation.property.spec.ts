/**
 * Property-Based Tests for TenantPlatformInvitationService
 *
 * Feature: tenant-invitation-403-fix
 * Tests error logging and unexpected error handling
 */

import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import * as fc from 'fast-check'
import { TenantPlatformInvitationService } from '../tenant-platform-invitation.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { AppConfigService } from '../../../config/app-config.service'

describe('TenantPlatformInvitationService - Property Tests', () => {
  let service: TenantPlatformInvitationService
  let mockSupabaseService: jest.Mocked<SupabaseService>
  let mockEventEmitter: jest.Mocked<EventEmitter2>
  let mockLogger: jest.Mocked<AppLogger>
  let mockConfig: jest.Mocked<AppConfigService>
  let mockSupabaseClient: any

  beforeEach(() => {
    // Create mock Supabase client with chainable methods
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    }

    // Create mock services
    mockSupabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
    } as any

    mockEventEmitter = {
      emit: jest.fn()
    } as any

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any

    mockConfig = {
      getNextPublicAppUrl: jest.fn().mockReturnValue('http://localhost:3000')
    } as any

    service = new TenantPlatformInvitationService(
      mockLogger,
      mockSupabaseService,
      mockEventEmitter,
      mockConfig
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Property 4: Failed invitations are logged with payload', () => {
    /**
     * Feature: tenant-invitation-403-fix, Property 4: Failed invitations are logged with payload
     * Validates: Requirements 3.3
     *
     * For any tenant invitation that fails (for any reason), the system should log
     * the complete request payload (with sensitive data redacted) for debugging purposes.
     */

    it('should log failed invitation when property owner not found', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          fc.option(fc.uuid(), { nil: undefined }), // property_id
          fc.option(fc.uuid(), { nil: undefined }), // unit_id
          async (ownerId, email, firstName, lastName, propertyId, unitId) => {
            // Setup: Mock owner not found
            mockSupabaseClient.maybeSingle.mockResolvedValue({
              data: null,
              error: null
            })

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName,
              property_id: propertyId,
              unit_id: unitId
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              NotFoundException
            )

            // Assert: Failure should be logged with complete payload
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Tenant invitation failed: Property owner not found',
              expect.objectContaining({
                ownerId,
                email,
                property_id: propertyId,
                unit_id: unitId
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should log failed invitation when property ownership verification fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.uuid(), // propertyOwnerId
          fc.uuid(), // propertyId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          async (ownerId, propertyOwnerId, propertyId, email, firstName, lastName) => {
            // Setup: Mock owner exists
            mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
              data: { id: propertyOwnerId, user_id: ownerId },
              error: null
            })

            // Setup: Mock property with different owner (ownership mismatch)
            const differentOwnerId = 'different-owner-id'
            mockSupabaseClient.single.mockResolvedValueOnce({
              data: { id: propertyId, property_owner_id: differentOwnerId },
              error: null
            })

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName,
              property_id: propertyId
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              BadRequestException
            )

            // Assert: Failure should be logged with complete payload and reason
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Tenant invitation failed: Property ownership verification failed',
              expect.objectContaining({
                ownerId,
                property_owner_id: propertyOwnerId,
                property_id: propertyId,
                email,
                reason: 'ownership_mismatch'
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should log failed invitation when unit verification fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.uuid(), // propertyOwnerId
          fc.uuid(), // propertyId
          fc.uuid(), // unitId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          async (ownerId, propertyOwnerId, propertyId, unitId, email, firstName, lastName) => {
            // Setup: Mock owner exists
            mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
              data: { id: propertyOwnerId, user_id: ownerId },
              error: null
            })

            // Setup: Mock property ownership verified
            mockSupabaseClient.single
              .mockResolvedValueOnce({
                data: { id: propertyId, property_owner_id: propertyOwnerId },
                error: null
              })
              // Setup: Mock unit with different property_id (mismatch)
              .mockResolvedValueOnce({
                data: { id: unitId, property_id: 'different-property-id' },
                error: null
              })

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName,
              property_id: propertyId,
              unit_id: unitId
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              BadRequestException
            )

            // Assert: Failure should be logged with complete payload and reason
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Tenant invitation failed: Unit verification failed',
              expect.objectContaining({
                ownerId,
                property_id: propertyId,
                unit_id: unitId,
                email,
                reason: 'unit_property_mismatch'
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should log failed invitation when duplicate pending invitation exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.uuid(), // propertyOwnerId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          fc.uuid(), // existing invitation id
          fc.constantFrom('pending', 'sent'), // existing status
          async (ownerId, propertyOwnerId, email, firstName, lastName, existingId, status) => {
            // Setup: Mock owner exists
            mockSupabaseClient.maybeSingle
              .mockResolvedValueOnce({
                data: { id: propertyOwnerId, user_id: ownerId },
                error: null
              })
              // Setup: Mock existing pending invitation
              .mockResolvedValueOnce({
                data: { id: existingId, status },
                error: null
              })

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              BadRequestException
            )

            // Assert: Failure should be logged with complete payload
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Tenant invitation failed: Duplicate pending invitation',
              expect.objectContaining({
                ownerId,
                email,
                existing_invitation_id: existingId,
                existing_status: status
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should log failed invitation when database insert fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.uuid(), // propertyOwnerId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          fc.string({ minLength: 1, maxLength: 100 }), // error message
          async (ownerId, propertyOwnerId, email, firstName, lastName, errorMessage) => {
            // Setup: Mock owner exists
            mockSupabaseClient.maybeSingle
              .mockResolvedValueOnce({
                data: { id: propertyOwnerId, user_id: ownerId },
                error: null
              })
              // Setup: No existing invitation
              .mockResolvedValueOnce({
                data: null,
                error: null
              })

            // Setup: Mock database insert failure
            mockSupabaseClient.single.mockResolvedValueOnce({
              data: null,
              error: { message: errorMessage, code: 'DB_ERROR' }
            })

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              BadRequestException
            )

            // Assert: Failure should be logged with complete payload and error details
            expect(mockLogger.error).toHaveBeenCalledWith(
              'Tenant invitation failed: Database insert error',
              expect.objectContaining({
                ownerId,
                email,
                error: errorMessage,
                error_code: 'DB_ERROR'
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10: Unexpected errors return 500 and log details', () => {
    /**
     * Feature: tenant-invitation-403-fix, Property 10: Unexpected errors return 500 and log details
     * Validates: Requirements 5.5
     *
     * For any unexpected error (not validation, authorization, or business logic errors),
     * the system should return a 500 Internal Server Error with a generic message to the
     * client and log the full error details (including stack trace) for debugging.
     */

    it('should log unexpected errors with full details including stack trace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          fc.string({ minLength: 10, maxLength: 100 }), // error message
          async (ownerId, email, firstName, lastName, errorMessage) => {
            // Setup: Mock unexpected error (e.g., network error, timeout)
            const unexpectedError = new Error(errorMessage)
            unexpectedError.stack = `Error: ${errorMessage}\n    at Service.method (file.ts:123:45)`

            mockSupabaseClient.maybeSingle.mockRejectedValueOnce(unexpectedError)

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              BadRequestException
            )

            // Assert: Error should be logged with full details including stack trace
            expect(mockLogger.error).toHaveBeenCalledWith(
              'Tenant invitation failed: Unexpected error',
              expect.objectContaining({
                ownerId,
                email,
                error: errorMessage,
                stack: expect.stringContaining(errorMessage)
              })
            )

            // Assert: Generic error message returned to client (not the internal error)
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              'An unexpected error occurred while creating the invitation'
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle non-Error objects as unexpected errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          fc.string({ minLength: 5, maxLength: 50 }), // error string
          async (ownerId, email, firstName, lastName, errorString) => {
            // Setup: Mock unexpected error as string (not Error object)
            mockSupabaseClient.maybeSingle.mockRejectedValueOnce(errorString)

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName
            }

            // Execute and expect failure
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              BadRequestException
            )

            // Assert: Error should be logged with string converted to error message
            expect(mockLogger.error).toHaveBeenCalledWith(
              'Tenant invitation failed: Unexpected error',
              expect.objectContaining({
                ownerId,
                email,
                error: errorString,
                stack: undefined // No stack for non-Error objects
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not log known exceptions as unexpected errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // ownerId
          fc.emailAddress(), // email
          fc.string({ minLength: 1, maxLength: 50 }), // first_name
          fc.string({ minLength: 1, maxLength: 50 }), // last_name
          async (ownerId, email, firstName, lastName) => {
            // Setup: Mock owner not found (known exception)
            mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
              data: null,
              error: null
            })

            const dto = {
              email,
              first_name: firstName,
              last_name: lastName
            }

            // Execute and expect NotFoundException (not wrapped in unexpected error)
            await expect(service.inviteToPlatform(ownerId, dto)).rejects.toThrow(
              NotFoundException
            )

            // Assert: Should NOT log as unexpected error
            expect(mockLogger.error).not.toHaveBeenCalledWith(
              'Tenant invitation failed: Unexpected error',
              expect.anything()
            )

            // Assert: Should log as specific failure (property owner not found)
            expect(mockLogger.warn).toHaveBeenCalledWith(
              'Tenant invitation failed: Property owner not found',
              expect.anything()
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
