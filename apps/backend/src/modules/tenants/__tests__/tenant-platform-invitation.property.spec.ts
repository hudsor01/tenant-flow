/**
 * Property-Based Tests for TenantPlatformInvitationService
 *
 * Tests ACTUAL production behavior with random inputs to verify:
 * - Property ownership validation (when property_id provided)
 * - Unit-property relationship validation (when both property_id + unit_id provided)
 * - Duplicate invitation prevention
 * - Invitation code security (always 64 hex chars)
 * - Expiry consistency (always 7 days)
 * - Error handling and logging
 *
 * IMPORTANT: These tests match REAL service behavior, not aspirational behavior.
 */

import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import * as fc from 'fast-check'
import { TenantPlatformInvitationService } from '../tenant-platform-invitation.service'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { AppConfigService } from '../../../config/app-config.service'

describe('TenantPlatformInvitationService - Property Tests', () => {
	let service: TenantPlatformInvitationService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockLogger: jest.Mocked<AppLogger>
	let mockConfig: jest.Mocked<AppConfigService>
	let mockSupabaseClient: SupabaseClient<Database>
	const token = 'token-123'

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
			getUserClient: jest.fn().mockReturnValue(mockSupabaseClient),
			// getAdminClient: used for plan limit checks — return generous limits so property tests focus on other logic
			getAdminClient: jest.fn().mockReturnValue({
				rpc: jest.fn().mockResolvedValue({ data: [{ tenant_limit: 9999 }], error: null })
			})
		} as unknown as SupabaseClient<Database>

		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as SupabaseClient<Database>

		mockLogger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		} as unknown as SupabaseClient<Database>

		mockConfig = {
			getNextPublicAppUrl: jest.fn().mockReturnValue('http://localhost:3000')
		} as unknown as SupabaseClient<Database>

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

	describe('Property 1: Invitation code is always 64 hex characters', () => {
		/**
		 * For ANY valid invitation creation, the generated invitation code must be:
		 * - Exactly 64 characters long
		 * - Contain only hexadecimal characters (0-9, a-f)
		 * - Be cryptographically secure (from randomBytes)
		 */

		it('should generate 64-char hex code for all valid inputs', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					async (ownerId, email, firstName, lastName) => {
						let capturedInsertData: TenantInvitationInsert | null = null

						// Setup: No existing invitation
						mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
							data: null,
							error: null
						})

						// Setup: Successful insert chain
						const insertChain = {
							select: jest.fn().mockReturnThis(),
							single: jest.fn().mockResolvedValue({
								data: { id: 'invitation-123' },
								error: null
							})
						}

						mockSupabaseClient.insert = jest.fn(
							(data: TenantInvitationInsert) => {
								capturedInsertData = data
								return insertChain
							}
						)

						const dto = {
							email,
							first_name: firstName,
							last_name: lastName
						}

						await service.inviteToPlatform(ownerId, dto, token)

						// Assert: Code is exactly 64 hex characters
						expect(capturedInsertData.invitation_code).toHaveLength(64)
						expect(capturedInsertData.invitation_code).toMatch(/^[a-f0-9]{64}$/)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 2: Expiry is always 7 days from creation', () => {
		/**
		 * For ANY valid invitation, expires_at must be exactly 7 days after creation time.
		 */

		it('should set expiry to 7 days for all invitations', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					async (ownerId, email, firstName, lastName) => {
						let capturedInsertData: TenantInvitationInsert | null = null
						const beforeCreation = new Date()

						// Setup: No existing invitation
						mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
							data: null,
							error: null
						})

						// Setup: Successful insert chain
						const insertChain = {
							select: jest.fn().mockReturnThis(),
							single: jest.fn().mockResolvedValue({
								data: { id: 'invitation-123' },
								error: null
							})
						}

						mockSupabaseClient.insert = jest.fn(
							(data: TenantInvitationInsert) => {
								capturedInsertData = data
								return insertChain
							}
						)

						const dto = {
							email,
							first_name: firstName,
							last_name: lastName
						}

						await service.inviteToPlatform(ownerId, dto, token)

						const afterCreation = new Date()
						const expiresAt = new Date(capturedInsertData.expires_at)

						// Calculate expected expiry range (7 days ± 1 second for test execution time)
						const expectedMin = new Date(beforeCreation)
						expectedMin.setDate(expectedMin.getDate() + 7)
						const expectedMax = new Date(afterCreation)
						expectedMax.setDate(expectedMax.getDate() + 7)

						// Assert: Expiry is within the 7-day range
						expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
							expectedMin.getTime() - 1000
						)
						expect(expiresAt.getTime()).toBeLessThanOrEqual(
							expectedMax.getTime() + 1000
						)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 3: Duplicate prevention works for any email', () => {
		/**
		 * For ANY email that already has a pending/sent invitation from the same owner,
		 * the service must reject the duplicate and log the conflict.
		 */

		it('should reject duplicate invitations for any email pattern', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					fc.uuid(), // existing invitation id
					fc.constantFrom('pending', 'sent'), // existing status
					async (ownerId, email, firstName, lastName, existingId, status) => {
						// Setup: Existing invitation found
						mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
							data: { id: existingId, status },
							error: null
						})

						const dto = {
							email,
							first_name: firstName,
							last_name: lastName
						}

						// Execute and expect failure
						await expect(
							service.inviteToPlatform(ownerId, dto, token)
						).rejects.toThrow(BadRequestException)

						// Assert: Failure logged with duplicate details
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
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 4: Property ownership validation (when property_id provided)', () => {
		/**
		 * When property_id is provided, service MUST validate:
		 * 1. Property exists
		 * 2. Property belongs to the requesting owner
		 *
		 * This validation ONLY happens when property_id is present.
		 */

		it('should reject invitation when property does not belong to owner', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.uuid(), // propertyId
					fc.uuid(), // actualPropertyOwnerId (different from ownerId)
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					async (
						ownerId,
						propertyId,
						actualPropertyOwnerId,
						email,
						firstName,
						lastName
					) => {
						// Ensure actualPropertyOwnerId is different from ownerId
						if (actualPropertyOwnerId === ownerId) {
							return // Skip this test case
						}

						// Setup: Property exists but belongs to different owner
						mockSupabaseClient.single.mockResolvedValueOnce({
							data: { id: propertyId, owner_user_id: actualPropertyOwnerId },
							error: null
						})

						const dto = {
							email,
							first_name: firstName,
							last_name: lastName,
							property_id: propertyId
						}

						// Execute and expect failure
						await expect(
							service.inviteToPlatform(ownerId, dto, token)
						).rejects.toThrow(BadRequestException)

						// Assert: Failure logged with ownership mismatch
						expect(mockLogger.warn).toHaveBeenCalledWith(
							'Tenant invitation failed: Property ownership verification failed',
							expect.objectContaining({
								ownerId,
								property_id: propertyId,
								email,
								reason: 'ownership_mismatch'
							})
						)
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should reject invitation when property does not exist', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.uuid(), // nonExistentPropertyId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					async (
						ownerId,
						nonExistentPropertyId,
						email,
						firstName,
						lastName
					) => {
						// Setup: Property not found
						mockSupabaseClient.single.mockResolvedValueOnce({
							data: null,
							error: { message: 'Not found', code: '404' }
						})

						const dto = {
							email,
							first_name: firstName,
							last_name: lastName,
							property_id: nonExistentPropertyId
						}

						// Execute and expect failure
						await expect(
							service.inviteToPlatform(ownerId, dto, token)
						).rejects.toThrow(BadRequestException)

						// Assert: Failure logged with property_not_found reason
						expect(mockLogger.warn).toHaveBeenCalledWith(
							'Tenant invitation failed: Property ownership verification failed',
							expect.objectContaining({
								ownerId,
								property_id: nonExistentPropertyId,
								email,
								reason: 'property_not_found'
							})
						)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 5: Unit-property relationship validation', () => {
		/**
		 * When BOTH property_id AND unit_id are provided, service MUST validate:
		 * 1. Unit exists
		 * 2. Unit belongs to the specified property
		 *
		 * This validation ONLY happens when both IDs are present.
		 */

		it('should reject invitation when unit does not belong to property', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.uuid(), // propertyId
					fc.uuid(), // unitId
					fc.uuid(), // actualUnitPropertyId (different from propertyId)
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					async (
						ownerId,
						propertyId,
						unitId,
						actualUnitPropertyId,
						email,
						firstName,
						lastName
					) => {
						// Ensure actualUnitPropertyId is different from propertyId
						if (actualUnitPropertyId === propertyId) {
							return // Skip this test case
						}

						// Setup: Property ownership verified
						mockSupabaseClient.single
							.mockResolvedValueOnce({
								data: { id: propertyId, owner_user_id: ownerId },
								error: null
							})
							// Unit exists but belongs to different property
							.mockResolvedValueOnce({
								data: { id: unitId, property_id: actualUnitPropertyId },
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
						await expect(
							service.inviteToPlatform(ownerId, dto, token)
						).rejects.toThrow(BadRequestException)

						// Assert: Failure logged with unit_property_mismatch
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
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 6: Event emission on successful invitation', () => {
		/**
		 * For ANY successful invitation creation, the service MUST emit
		 * 'tenant.platform_invitation.sent' event with complete invitation details.
		 */

		it('should emit event for all successful invitations', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					fc.option(fc.uuid(), { nil: undefined }), // optional property_id
					fc.option(fc.uuid(), { nil: undefined }), // optional unit_id
					async (ownerId, email, firstName, lastName, propertyId, unitId) => {
						let setupCallCount = 0

						// Setup: Property/unit validation passes when provided
						if (propertyId) {
							mockSupabaseClient.single.mockImplementation(() => {
								setupCallCount++
								if (setupCallCount === 1) {
									// Property validation
									return Promise.resolve({
										data: { id: propertyId, owner_user_id: ownerId },
										error: null
									})
								} else if (setupCallCount === 2 && unitId) {
									// Unit validation
									return Promise.resolve({
										data: { id: unitId, property_id: propertyId },
										error: null
									})
								}
								return Promise.resolve({
									data: { id: 'invitation-123' },
									error: null
								})
							})
						} else {
							mockSupabaseClient.single.mockResolvedValue({
								data: { id: 'invitation-123' },
								error: null
							})
						}

						// No existing invitation
						mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
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

						await service.inviteToPlatform(ownerId, dto, token)

						// Assert: Event emitted with correct data
						expect(mockEventEmitter.emit).toHaveBeenCalledWith(
							'tenant.platform_invitation.sent',
							expect.objectContaining({
								email,
								first_name: firstName,
								last_name: lastName,
								invitation_id: expect.any(String),
								invitation_url: expect.stringContaining('/accept-invite?code='),
								property_id: propertyId,
								unit_id: unitId
							})
						)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 7: Database insert error handling', () => {
		/**
		 * When database insert fails for ANY reason, the service must:
		 * 1. Log the error with complete context
		 * 2. Throw BadRequestException
		 * 3. NOT emit success event
		 */

		it('should handle database insert failures gracefully', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					fc
						.string({ minLength: 5, maxLength: 100 })
						.filter(s => s.trim().length >= 5), // error message
					async (ownerId, email, firstName, lastName, errorMessage) => {
						// Setup: No existing invitation
						mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
							data: null,
							error: null
						})

						// Database insert fails
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
						await expect(
							service.inviteToPlatform(ownerId, dto, token)
						).rejects.toThrow(BadRequestException)

						// Assert: Error logged with complete context
						expect(mockLogger.error).toHaveBeenCalledWith(
							'Tenant invitation failed: Database insert error',
							expect.objectContaining({
								ownerId,
								email,
								error: errorMessage,
								error_code: 'DB_ERROR'
							})
						)

						// Assert: No success event emitted
						expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
							'tenant.platform_invitation.sent',
							expect.anything()
						)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 8: Unexpected error handling', () => {
		/**
		 * When an unexpected error occurs (not a known BadRequestException),
		 * the service must:
		 * 1. Log the error with stack trace
		 * 2. Wrap it in BadRequestException
		 * 3. Return generic error message to client
		 */

		it('should wrap unexpected errors with generic message', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // ownerId
					fc.emailAddress(), // email
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // first_name
					fc
						.string({ minLength: 2, maxLength: 50 })
						.filter(s => s.trim().length >= 2), // last_name
					fc
						.string({ minLength: 10, maxLength: 100 })
						.filter(s => s.trim().length >= 10), // error message
					async (ownerId, email, firstName, lastName, errorMessage) => {
						// Setup: Unexpected error (e.g., network timeout)
						const unexpectedError = new Error(errorMessage)
						unexpectedError.stack = `Error: ${errorMessage}\n    at Service.method (file.ts:123:45)`

						mockSupabaseClient.maybeSingle.mockRejectedValueOnce(
							unexpectedError
						)

						const dto = {
							email,
							first_name: firstName,
							last_name: lastName
						}

						// Execute and expect wrapped error
						await expect(
							service.inviteToPlatform(ownerId, dto, token)
						).rejects.toThrow(
							'An unexpected error occurred while creating the invitation'
						)

						// Assert: Error logged with stack trace
						expect(mockLogger.error).toHaveBeenCalledWith(
							'Tenant invitation failed: Unexpected error',
							expect.objectContaining({
								ownerId,
								email,
								error: errorMessage,
								stack: expect.stringContaining(errorMessage)
							})
						)
					}
				),
				{ numRuns: 50 }
			)
		})
	})
})
