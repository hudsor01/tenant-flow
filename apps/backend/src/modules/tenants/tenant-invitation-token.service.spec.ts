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
import { Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { SupabaseService } from '../../database/supabase.service'

describe('TenantInvitationTokenService', () => {
	let service: TenantInvitationTokenService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (resolveData: unknown = null, resolveError: unknown = null) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'gte', 'lte', 'order']

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.single = jest.fn(() => Promise.resolve({
			data: resolveData,
			error: resolveError
		}))

		chain.maybeSingle = jest.fn(() => Promise.resolve({
			data: resolveData,
			error: resolveError
		}))

		return chain
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
				{ provide: Logger, useValue: mockLogger },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		service = module.get<TenantInvitationTokenService>(TenantInvitationTokenService)
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
			expect(result).toEqual({ valid: false, error: 'Invalid or expired token' })
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
				property_owner_id: 'owner-123',
				property_owners: { business_name: 'Test LLC', users: { email: 'owner@test.com' } },
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
				property_owner_id: 'owner-123',
				property_owners: { business_name: 'Test LLC', users: { email: 'owner@test.com' } },
				properties: { name: 'Test Property' },
				units: { unit_number: '101' }
			}

			const mockChain = createMockChain(mockInvitation, null)
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue(mockChain)
			})

			const result = await service.validateToken('valid-token')
			expect(result).toEqual({ valid: false, error: 'Token has already been used' })
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
				property_owner_id: 'owner-123',
				property_owners: { business_name: 'Test LLC', users: { email: 'owner@test.com' } },
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
				property_owner_id: 'owner-123',
				property_owners: { business_name: 'Test LLC', users: { email: 'owner@test.com' } },
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

		it('should throw BadRequestException for invalid token', async () => {
			// Mock validateToken to return invalid
			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: false,
				error: 'Invalid token'
			})

			await expect(service.acceptToken(validToken, validUserId))
				.rejects.toThrow(BadRequestException)
		})

		it('should accept platform-only invitation and create tenant', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			// Mock validateToken
			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				expires_at: futureDate.toISOString()
				// No unit_id = platform-only
			})

			// Mock update invitation
			const updateChain = createMockChain(null, null)
			// Mock select existing tenant (none)
			const selectTenantChain = createMockChain(null, null)
			// Mock insert new tenant
			const insertTenantChain = createMockChain({ id: 'tenant-123', user_id: validUserId }, null)
			// Mock update user
			const updateUserChain = createMockChain(null, null)

			const mockClient = {
				from: jest.fn()
					.mockReturnValueOnce(updateChain) // tenant_invitations update
					.mockReturnValueOnce(updateUserChain) // users update
					.mockReturnValueOnce(selectTenantChain) // tenants select (existing check)
					.mockReturnValueOnce(insertTenantChain), // tenants insert
				auth: {
					admin: {
						updateUserById: jest.fn().mockResolvedValue({ error: null })
					}
				}
			}
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.acceptToken(validToken, validUserId)

			expect(result).toHaveProperty('id', 'tenant-123')
		})

		it('should accept unit-assigned invitation and link to lease', async () => {
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 7)

			// Mock validateToken with unit_id
			jest.spyOn(service, 'validateToken').mockResolvedValue({
				valid: true,
				email: 'tenant@example.com',
				unit_id: 'unit-123',
				expires_at: futureDate.toISOString()
			})

			// Mock chains
			const updateInvitationChain = createMockChain(null, null)
			const updateUserChain = createMockChain(null, null)
			const leaseChain = createMockChain({ id: 'lease-123', primary_tenant_id: 'tenant-456' }, null)
			const updateTenantChain = createMockChain({ id: 'tenant-456', user_id: validUserId }, null)

			const mockClient = {
				from: jest.fn()
					.mockReturnValueOnce(updateInvitationChain) // tenant_invitations update
					.mockReturnValueOnce(updateUserChain) // users update
					.mockReturnValueOnce(leaseChain) // leases select
					.mockReturnValueOnce(updateTenantChain), // tenants update
				auth: {
					admin: {
						updateUserById: jest.fn().mockResolvedValue({ error: null })
					}
				}
			}
			mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockClient)

			const result = await service.acceptToken(validToken, validUserId)

			expect(result).toHaveProperty('id', 'tenant-456')
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Invitation accepted, tenant linked to lease',
				expect.objectContaining({ user_id: validUserId })
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

			await expect(service.activateTenantFromAuthUser(validUserId))
				.rejects.toThrow(NotFoundException)
		})

		it('should activate tenant and update user type', async () => {
			const tenantSelectChain = createMockChain({ id: 'tenant-123' }, null)
			const tenantUpdateChain = createMockChain({ id: 'tenant-123', user_id: validUserId }, null)
			const userUpdateChain = createMockChain(null, null)

			const mockClient = {
				from: jest.fn()
					.mockReturnValueOnce(tenantSelectChain) // tenants select by user_id
					.mockReturnValueOnce(tenantUpdateChain) // tenants update
					.mockReturnValueOnce(userUpdateChain), // users update
				auth: {
					admin: {
						updateUserById: jest.fn().mockResolvedValue({ error: null })
					}
				}
			}
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
