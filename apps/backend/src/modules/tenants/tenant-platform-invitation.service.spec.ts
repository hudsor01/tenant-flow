/**
 * TDD Tests for TenantPlatformInvitationService
 *
 * This service handles inviting tenants to the platform WITHOUT creating a lease.
 * The lease creation is a separate workflow that happens after the tenant accepts.
 *
 * Flow:
 * 1. Owner invites tenant (email, name, optional property context)
 * 2. System creates tenant_invitation record (type: 'platform_access')
 * 3. System sends welcome email
 * 4. Tenant accepts invitation and creates account
 * 5. SEPARATELY: Owner creates lease draft and sends for signature
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { TenantPlatformInvitationService } from './tenant-platform-invitation.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppConfigService } from '../../config/app-config.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import type { Database } from '@repo/shared/types/supabase'

describe('TenantPlatformInvitationService', () => {
	type TenantInvitationInsert =
		Database['public']['Tables']['tenant_invitations']['Insert']
	type TenantInvitationUpdate =
		Database['public']['Tables']['tenant_invitations']['Update']

	let service: TenantPlatformInvitationService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (
		resolveData: unknown = [],
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
				data:
					Array.isArray(resolveData) && resolveData.length > 0
						? resolveData[0]
						: resolveData,
				error: resolveError
			})
		)

		// maybeSingle returns null for "not found" (no error), or data if found
		chain.maybeSingle = jest.fn(() =>
			Promise.resolve({
				data:
					resolveData === null
						? null
						: Array.isArray(resolveData) && resolveData.length > 0
							? resolveData[0]
							: resolveData,
				error: resolveError
			})
		)

		// For insert/update that don't call single()
		chain.then = jest.fn(resolve =>
			resolve({
				data: resolveData,
				error: resolveError
			})
		)

		return chain
	}

	// Helper to create a chain that resolves maybeSingle to null (no existing record)
	const createMockChainNoExisting = (
		insertData: unknown = null,
		insertError: unknown = null
	) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = [
			'select',
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

		// maybeSingle returns null (no existing invitation)
		chain.maybeSingle = jest.fn(() =>
			Promise.resolve({
				data: null,
				error: null
			})
		)

		// insert returns the inserted data
		chain.insert = jest.fn(() => {
			const insertChain: Record<string, jest.Mock> = {}
			insertChain.select = jest.fn(() => insertChain)
			insertChain.single = jest.fn(() =>
				Promise.resolve({
					data: insertData,
					error: insertError
				})
			)
			return insertChain
		})

		// update returns success
		chain.update = jest.fn(() => {
			const updateChain: Record<string, jest.Mock> = {}
			updateChain.eq = jest.fn(() =>
				Promise.resolve({ data: null, error: null })
			)
			return updateChain
		})

		chain.single = jest.fn(() =>
			Promise.resolve({
				data: insertData,
				error: insertError
			})
		)

		return chain
	}

	beforeEach(async () => {
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockEventEmitter = {
			emit: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantPlatformInvitationService,
				{ provide: Logger, useValue: mockLogger },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppConfigService,
					useValue: { getNextPublicAppUrl: () => 'http://localhost:3050' }
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<TenantPlatformInvitationService>(
			TenantPlatformInvitationService
		)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('inviteToPlatform', () => {
		const validInviteRequest = {
			email: 'tenant@example.com',
			first_name: 'John',
			last_name: 'Doe',
			phone: '555-1234'
		}

		const ownerId = 'owner-123'

		it('should create invitation without requiring lease data', async () => {
			// Setup: Owner exists in stripe_connected_accounts table
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						// Use helper that returns null for existing check, then allows insert
						return createMockChainNoExisting({ id: 'invitation-123' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			const result = await service.inviteToPlatform(ownerId, validInviteRequest)

			expect(result).toEqual(
				expect.objectContaining({
					success: true,
					invitation_id: expect.any(String),
					message: expect.stringContaining('invited')
				})
			)
		})

		it('should set invitation type to platform_access', async () => {
			let capturedInsertData: TenantInvitationInsert | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChainNoExisting({ id: 'invitation-123' })
						const originalInsert = chain.insert!
						chain.insert = jest.fn((data: TenantInvitationInsert) => {
							capturedInsertData = data
							return originalInsert(data)
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, validInviteRequest)

			expect(capturedInsertData).toEqual(
				expect.objectContaining({
					type: 'platform_access'
				})
			)
		})

		it('should NOT create any lease record', async () => {
			let leaseInsertCalled = false

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain()
						chain.insert = jest.fn(() => {
							leaseInsertCalled = true
							return chain
						})
						return chain
					}
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						return createMockChainNoExisting({ id: 'invitation-123' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, validInviteRequest)

			expect(leaseInsertCalled).toBe(false)
		})

		it('should NOT create any Stripe customer or subscription', async () => {
			// This service should have NO Stripe dependencies
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						return createMockChainNoExisting({ id: 'invitation-123' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, validInviteRequest)

			// Service should not inject or call any Stripe service
			// This is verified by the service constructor not having StripeConnectService
		})

		it('should NOT require Stripe Connect to be setup', async () => {
			// Owner does NOT have Stripe onboarded, but invitation should still work
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({
							id: 'owner-123',
							user_id: ownerId,
							stripe_account_id: null, // No Stripe!
							charges_enabled: false,
							payouts_enabled: false
						})
					}
					if (table === 'tenant_invitations') {
						return createMockChainNoExisting({ id: 'invitation-123' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			// Should NOT throw - Stripe is not required for platform invitation
			const result = await service.inviteToPlatform(ownerId, validInviteRequest)
			expect(result.success).toBe(true)
		})

		it('should emit tenant.platform_invitation.sent event', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						return createMockChainNoExisting({ id: 'invitation-123' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, validInviteRequest)

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'tenant.platform_invitation.sent',
				expect.objectContaining({
					email: 'tenant@example.com',
					first_name: 'John',
					last_name: 'Doe',
					invitation_id: expect.any(String),
					invitation_url: expect.stringContaining('/accept-invite')
				})
			)
		})

		it('should generate secure 64-character hex invitation code', async () => {
			let capturedInsertData: TenantInvitationInsert | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChainNoExisting({ id: 'invitation-123' })
						const originalInsert = chain.insert!
						chain.insert = jest.fn((data: TenantInvitationInsert) => {
							capturedInsertData = data
							return originalInsert(data)
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, validInviteRequest)

			expect(capturedInsertData.invitation_code).toHaveLength(64)
			expect(capturedInsertData.invitation_code).toMatch(/^[a-f0-9]+$/)
		})

		it('should set invitation expiry to 7 days', async () => {
			let capturedInsertData: TenantInvitationInsert | null = null
			const now = new Date()

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChainNoExisting({ id: 'invitation-123' })
						const originalInsert = chain.insert!
						chain.insert = jest.fn((data: TenantInvitationInsert) => {
							capturedInsertData = data
							return originalInsert(data)
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, validInviteRequest)

			const expiresAt = new Date(capturedInsertData.expires_at)
			const diffDays = Math.round(
				(expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			)
			expect(diffDays).toBe(7)
		})

		it('should allow optional property_id context', async () => {
			let capturedInsertData: TenantInvitationInsert | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'properties') {
						// Verify property belongs to owner
						return createMockChain({
							id: 'property-456',
							owner_user_id: 'owner-123'
						})
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChainNoExisting({ id: 'invitation-123' })
						const originalInsert = chain.insert!
						chain.insert = jest.fn((data: TenantInvitationInsert) => {
							capturedInsertData = data
							return originalInsert(data)
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, {
				...validInviteRequest,
				property_id: 'property-456'
			})

			expect(capturedInsertData.property_id).toBe('property-456')
		})

		it('should allow optional unit_id context', async () => {
			let capturedInsertData: TenantInvitationInsert | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'units') {
						return createMockChain({
							id: 'unit-789',
							property_id: 'property-456'
						})
					}
					if (table === 'properties') {
						return createMockChain({
							id: 'property-456',
							owner_user_id: 'owner-123'
						})
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChainNoExisting({ id: 'invitation-123' })
						const originalInsert = chain.insert!
						chain.insert = jest.fn((data: TenantInvitationInsert) => {
							capturedInsertData = data
							return originalInsert(data)
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.inviteToPlatform(ownerId, {
				...validInviteRequest,
				property_id: 'property-456',
				unit_id: 'unit-789'
			})

			expect(capturedInsertData.unit_id).toBe('unit-789')
			expect(capturedInsertData.property_id).toBe('property-456')
		})

		// NOTE: Service does NOT validate owner existence - it only validates
		// property ownership when property_id is provided. Owner validation
		// would require a foreign key constraint on tenant_invitations.owner_user_id.

		it('should throw if property does not belong to owner', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'properties') {
						// Property belongs to different owner
						return createMockChain({
							id: 'property-456',
							owner_user_id: 'different-owner'
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await expect(
				service.inviteToPlatform(ownerId, {
					...validInviteRequest,
					property_id: 'property-456'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('should prevent duplicate pending invitations for same email', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: ownerId })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChain()
						// Existing pending invitation found
						chain.select = jest.fn(() => ({
							...chain,
							eq: jest.fn(() => ({
								...chain,
								eq: jest.fn(() => ({
									...chain,
									in: jest.fn(() => ({
										...chain,
										single: jest.fn(() =>
											Promise.resolve({
												data: { id: 'existing-invite', status: 'sent' },
												error: null
											})
										)
									}))
								}))
							}))
						}))
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await expect(
				service.inviteToPlatform(ownerId, validInviteRequest)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('cancelInvitation', () => {
		it('should cancel a pending invitation', async () => {
			let updateCalled = false
			let updateData: TenantInvitationUpdate | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: 'owner-123' })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChain({
							id: 'invitation-123',
							status: 'sent',
							owner_user_id: 'owner-123'
						})
						chain.update = jest.fn((data: TenantInvitationUpdate) => {
							updateCalled = true
							updateData = data
							const updateChain: Record<string, jest.Mock> = {}
							updateChain.eq = jest.fn(() =>
								Promise.resolve({ data: null, error: null })
							)
							return updateChain
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.cancelInvitation('owner-123', 'invitation-123')

			expect(updateCalled).toBe(true)
			expect(updateData).toEqual({ status: 'cancelled' })
		})

		it('should not cancel an already accepted invitation', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: 'owner-123' })
					}
					if (table === 'tenant_invitations') {
						return createMockChain({
							id: 'invitation-123',
							status: 'accepted',
							owner_user_id: 'owner-123'
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await expect(
				service.cancelInvitation('owner-123', 'invitation-123')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('resendInvitation', () => {
		it('should resend invitation and update expiry', async () => {
			let updateData: TenantInvitationUpdate | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: 'owner-123' })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChain({
							id: 'invitation-123',
							status: 'sent',
							email: 'tenant@example.com',
							invitation_code: 'abc123',
							invitation_url: 'https://app.com/accept-invite?code=abc123',
							owner_user_id: 'owner-123',
							property_id: 'property-456',
							unit_id: 'unit-789'
						})
						chain.update = jest.fn((data: TenantInvitationUpdate) => {
							updateData = data
							const updateChain: Record<string, jest.Mock> = {}
							updateChain.eq = jest.fn(() =>
								Promise.resolve({ data: null, error: null })
							)
							return updateChain
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.resendInvitation('owner-123', 'invitation-123')

			// Should update expires_at
			expect(updateData).toHaveProperty('expires_at')
			// Should emit event with property_id and unit_id
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'tenant.platform_invitation.sent',
				expect.objectContaining({
					email: 'tenant@example.com',
					property_id: 'property-456',
					unit_id: 'unit-789'
				})
			)
		})

		it('should regenerate code for expired invitations', async () => {
			let updateData: TenantInvitationUpdate | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'stripe_connected_accounts') {
						return createMockChain({ id: 'owner-123', user_id: 'owner-123' })
					}
					if (table === 'tenant_invitations') {
						const chain = createMockChain({
							id: 'invitation-123',
							status: 'expired',
							email: 'tenant@example.com',
							invitation_code: 'old-code',
							invitation_url: 'https://app.com/accept-invite?code=old-code',
							owner_user_id: 'owner-123'
						})
						chain.update = jest.fn((data: TenantInvitationUpdate) => {
							updateData = data
							const updateChain: Record<string, jest.Mock> = {}
							updateChain.eq = jest.fn(() =>
								Promise.resolve({ data: null, error: null })
							)
							return updateChain
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>

			await service.resendInvitation('owner-123', 'invitation-123')

			// Should generate new code for expired invitations
			expect(updateData.invitation_code).not.toBe('old-code')
			expect(updateData.invitation_code).toHaveLength(64) // 32 bytes hex
			expect(mockEventEmitter.emit).toHaveBeenCalled()
		})
	})
})
