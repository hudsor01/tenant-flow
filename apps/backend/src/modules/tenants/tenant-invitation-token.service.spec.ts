/**
 * TDD Tests for TenantInvitationTokenService
 *
 * This service handles token validation and acceptance for tenant invitations.
 *
 * Responsibilities:
 * - validateToken: Check token validity, expiration, and return invitation details
 * - acceptToken: Mark invitation as accepted, create/link tenant record
 * - activateTenantFromAuthUser: Activate existing tenant from auth webhook
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common'
import * as fc from 'fast-check'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('TenantInvitationTokenService', () => {
	let service: TenantInvitationTokenService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (
		resolveData: unknown = null,
		resolveError: unknown = null
	) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = [
			'select',
			'insert',
			'update',
			'delete',
			'eq',
			'neq',
			'is',
			'in',
			'or',
			'gte',
			'lte',
			'order'
		]

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.single = jest.fn(() =>
			Promise.resolve({
				data: resolveData,
				error: resolveError
			})
		)

		chain.maybeSingle = jest.fn(() =>
			Promise.resolve({
				data: resolveData,
				error: resolveError
			})
		)

		return chain
	}

	// Helper to create a mock Supabase admin client with auth
	const createMockAdminClient = (options: {
		fromChains: ReturnType<typeof createMockChain>[]
		updateUserByIdResult?: { error: { message: string } | null }
	}) => {
		const fromMock = jest.fn()
		options.fromChains.forEach((chain, index) => {
			fromMock.mockReturnValueOnce(chain)
		})

		return {
			from: fromMock,
			auth: {
				admin: {
					updateUserById: jest.fn().mockResolvedValue({
						error: options.updateUserByIdResult?.error ?? null
					})
				}
			}
		}
	}

	beforeEach(async () => {
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantInvitationTokenService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppLogger, useValue: mockLogger }
			]
		}).compile()

		service = module.get<TenantInvitationTokenService>(
			TenantInvitationTokenService
		)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('validateToken', () => {
		it('should return invalid for empty token', async () => {
			const result = await service.validateToken('')
			expect(result).toEqual({ valid: false, error: 'Token is required' })
		})

		it('should return invalid for whitespace-only token', async () => {
			const result = await service.validateToken('   ')
			expect(result).toEqual({ valid: false, error: 'Token is required' })
		})

		it('should return invalid for non-existent token', async () => {
			const mockChain = createMockChain(null, { message: 'not found' })
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			const result = await service.validateToken('invalid-token')
			expect(result).toEqual({
				valid: false,
				error: 'Invalid or expired token'
			})
		})

		it('should return invalid for expired token', async () => {
			const expiredDate = new Date()
			expiredDate.setDate(expiredDate.getDate() - 1) // Yesterday

			const mockInvitation = {
				unit_id: 'unit-123',
				email: 'tenant@example.com',
				expires_at: expiredDate.toISOString(),
				accepted_at: null,
				invitation_code: 'valid-token',
				property_id: 'prop-123',
				owner_user_id: 'owner-123',
				owner: {
					first_name: 'Test',
					last_name: 'LLC',
					email: 'owner@test.com'
				},
				properties: { name: 'Test Property' },
				units: { unit_number: '101' }
			}

			const mockChain = createMockChain(mockInvitation, null)
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			const result = await service.validateToken('valid-token')
			expect(result).toEqual({ valid: false, error: 'Token has expired' })
		})

		it('should return invalid for already accepted token', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			const mockInvitation = {
				unit_id: 'unit-123',
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString(),
				accepted_at: new Date().toISOString(), // Already accepted
				invitation_code: 'valid-token',
				property_id: 'prop-123',
				owner_user_id: 'owner-123',
				owner: {
					first_name: 'Test',
					last_name: 'LLC',
					email: 'owner@test.com'
				},
				properties: { name: 'Test Property' },
				units: { unit_number: '101' }
			}

			const mockChain = createMockChain(mockInvitation, null)
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			const result = await service.validateToken('valid-token')
			expect(result).toEqual({
				valid: false,
				error: 'Token has already been used'
			})
		})

		it('should return valid with full details for valid token', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			const mockInvitation = {
				unit_id: 'unit-123',
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString(),
				accepted_at: null,
				invitation_code: 'valid-token',
				property_id: 'prop-123',
				owner_user_id: 'owner-123',
				owner: {
					first_name: 'Test',
					last_name: 'LLC',
					email: 'owner@test.com'
				},
				properties: { name: 'Test Property' },
				units: { unit_number: '101' }
			}

			const mockChain = createMockChain(mockInvitation, null)
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			const result = await service.validateToken('valid-token')

			expect(result.valid).toBe(true)
			expect(result.email).toBe('tenant@example.com')
			expect(result.unit_id).toBe('unit-123')
			expect(result.property_owner_name).toBe('Test LLC')
			expect(result.property_name).toBe('Test Property')
			expect(result.unit_number).toBe('101')
			expect(result.expires_at).toBe(futureDate.toISOString())
		})

		it('should return valid for platform-only invitation (no unit)', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			const mockInvitation = {
				unit_id: null, // Platform-only
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString(),
				accepted_at: null,
				invitation_code: 'valid-token',
				property_id: null,
				owner_user_id: 'owner-123',
				owner: {
					first_name: 'Test',
					last_name: 'LLC',
					email: 'owner@test.com'
				},
				properties: null,
				units: null
			}

			const mockChain = createMockChain(mockInvitation, null)
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			const result = await service.validateToken('valid-token')

			expect(result.valid).toBe(true)
			expect(result.email).toBe('tenant@example.com')
			expect(result.unit_id).toBeUndefined()
			expect(result.property_owner_name).toBe('Test LLC')
			expect(result.property_name).toBeUndefined()
			expect(result.unit_number).toBeUndefined()
		})
	})

	describe('acceptToken', () => {
		const validUserId = 'user-123'
		const validToken = 'valid-token'

		it('should verify email by calling auth.admin.updateUserById with email_confirm: true', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString()
			})

			const mockClient = createMockAdminClient({
				fromChains: [
					createMockChain(null, null), // tenant_invitations update
					createMockChain(null, null), // users update
					createMockChain(null, null), // tenants select (existing check)
					createMockChain({ id: 'tenant-123', user_id: validUserId }, null) // tenants insert
				]
			})
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			await service.acceptToken(validToken, validUserId)

			expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(
				validUserId,
				expect.objectContaining({ email_confirm: true })
			)
		})

		it('should set email_confirmed_at after invitation acceptance', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString()
			})

			const mockClient = createMockAdminClient({
				fromChains: [
					createMockChain(null, null),
					createMockChain(null, null),
					createMockChain(null, null),
					createMockChain({ id: 'tenant-123', user_id: validUserId }, null)
				]
			})
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.acceptToken(validToken, validUserId)

			expect(result).toHaveProperty('emailVerified', true)
		})

		it('should return emailVerified: false when email verification fails', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString()
			})

			const mockClient = createMockAdminClient({
				fromChains: [
					createMockChain(null, null),
					createMockChain(null, null),
					createMockChain(null, null),
					createMockChain({ id: 'tenant-123', user_id: validUserId }, null)
				],
				updateUserByIdResult: {
					error: { message: 'Email verification failed' }
				}
			})
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.acceptToken(validToken, validUserId)

			expect(result).toHaveProperty('emailVerified', false)
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Failed to verify email during invitation acceptance',
				expect.objectContaining({ user_id: validUserId })
			)
		})

		it('should throw BadRequestException for invalid token', async () => {
			// Mock validateToken to return invalid
			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: false,
				error: 'Invalid token'
			})

			await expect(
				service.acceptToken(validToken, validUserId)
			).rejects.toThrow(BadRequestException)
		})

		it('should accept platform-only invitation and create tenant', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString()
				// No unit_id = platform-only
			})

			const mockClient = createMockAdminClient({
				fromChains: [
					createMockChain(null, null), // tenant_invitations update
					createMockChain(null, null), // users update
					createMockChain(null, null), // tenants select (existing check)
					createMockChain({ id: 'tenant-123', user_id: validUserId }, null) // tenants insert
				]
			})
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.acceptToken(validToken, validUserId)

			expect(result).toHaveProperty('id', 'tenant-123')
		})

		it('should accept unit-assigned invitation and link to lease', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				unit_id: 'unit-123',
				expires_at: futureDate.toISOString()
			})

			const mockClient = createMockAdminClient({
				fromChains: [
					createMockChain(null, null), // tenant_invitations update
					createMockChain(null, null), // users update
					createMockChain(
						{ id: 'lease-123', primary_tenant_id: 'tenant-456' },
						null
					), // leases select
					createMockChain({ id: 'tenant-456', user_id: validUserId }, null) // tenants update
				]
			})
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.acceptToken(validToken, validUserId)

			expect(result).toHaveProperty('id', 'tenant-456')
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Invitation accepted, tenant linked to lease',
				expect.objectContaining({ user_id: validUserId })
			)
		})

		/**
		 * **Feature: tenant-onboarding-optimization, Property 1: Email Verification on Invitation Acceptance**
		 * **Validates: Requirements 1.1, 1.2**
		 *
		 * Property: For any valid invitation token and new user signup, accepting the invitation
		 * SHALL result in the user's email_confirmed_at being set in Supabase Auth.
		 */
		it('PROPERTY: For any valid invitation and user, acceptToken SHALL call email verification', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc
						.string({ minLength: 8, maxLength: 64 })
						.filter(s => s.trim().length > 0),
					fc.uuid(),
					fc.emailAddress(),
					async (token, userId, email) => {
						jest.clearAllMocks()

						const futureDate = new Date()
						futureDate.setDate(futureDate.getDate() + 7)

						jest.spyOn(service, 'validateToken').mockResolvedValue({
							valid: true,
							email: email,
							expires_at: futureDate.toISOString()
						})

						const mockClient = createMockAdminClient({
							fromChains: [
								createMockChain(null, null),
								createMockChain(null, null),
								createMockChain(null, null),
								createMockChain({ id: 'tenant-123', user_id: userId }, null)
							]
						})
						mockSupabaseService.getAdminClient = jest
							.fn()
							.mockReturnValue(mockClient)

						const result = await service.acceptToken(token, userId)

						// Property: email_confirm: true MUST be passed to updateUserById
						expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(
							userId,
							expect.objectContaining({ email_confirm: true })
						)

						// Property: result MUST include emailVerified status
						expect(result).toHaveProperty('emailVerified')
					}
				),
				{ numRuns: 100 }
			)
		})
	})

	describe('activateTenantFromAuthUser', () => {
		const validUserId = 'user-123'

		it('should throw NotFoundException when tenant not found', async () => {
			const mockChain = createMockChain(null, { message: 'not found' })
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			await expect(
				service.activateTenantFromAuthUser(validUserId)
			).rejects.toThrow(NotFoundException)
		})

		it('should activate tenant and update user type', async () => {
			const mockClient = createMockAdminClient({
				fromChains: [
					createMockChain({ id: 'tenant-123' }, null), // tenants select by user_id
					createMockChain({ id: 'tenant-123', user_id: validUserId }, null), // tenants update
					createMockChain(null, null) // users update
				]
			})
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.activateTenantFromAuthUser(validUserId)

			expect(result).toHaveProperty('id', 'tenant-123')
			expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(
				validUserId,
				{ app_metadata: { user_type: 'TENANT' } }
			)
		})
	})
})
