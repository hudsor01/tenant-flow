import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { TenantInvitationService } from './tenant-invitation.service'
import { TenantCrudService } from './tenant-crud.service'
import { SupabaseService } from '../../database/supabase.service'
import { StripeConnectService } from '../billing/stripe-connect.service'

describe('TenantInvitationService', () => {
	let service: TenantInvitationService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>
	let mockTenantCrudService: jest.Mocked<Partial<TenantCrudService>>
	let mockStripeConnectService: jest.Mocked<Partial<StripeConnectService>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (resolveData: unknown = [], resolveError: unknown = null) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'gte', 'lte', 'order']

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.single = jest.fn(() => Promise.resolve({
			data: Array.isArray(resolveData) && resolveData.length > 0 ? resolveData[0] : resolveData,
			error: resolveError
		}))

		return chain
	}

	const mockInviteRequest = {
		email: 'tenant@example.com',
		first_name: 'John',
		last_name: 'Doe',
		phone: '555-1234',
		property_id: 'property-123',
		unit_id: 'unit-456',
		lease_start_date: '2024-01-01',
		lease_end_date: '2025-01-01',
		rent_amount: 1500,
		security_deposit: 1500
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

		mockTenantCrudService = {
			create: jest.fn(),
			hardDelete: jest.fn()
		}

		mockStripeConnectService = {
			createCustomerOnConnectedAccount: jest.fn(),
			createSubscriptionOnConnectedAccount: jest.fn(),
			deleteCustomer: jest.fn(),
			cancelSubscription: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantInvitationService,
				{ provide: Logger, useValue: mockLogger },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: TenantCrudService, useValue: mockTenantCrudService },
				{ provide: StripeConnectService, useValue: mockStripeConnectService },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		service = module.get<TenantInvitationService>(TenantInvitationService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Secure Token Generation', () => {
		it('should generate cryptographically secure invitation codes (64 hex chars)', async () => {
			// Setup successful path mocks
			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			const mockChain = createMockChain({
				id: 'unit-456',
				property_id: 'property-123'
			})

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') {
						return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					}
					if (table === 'properties') {
						return createMockChain({ property_owner_id: 'owner-123' })
					}
					if (table === 'property_owners') {
						return createMockChain({
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					if (table === 'leases') {
						return createMockChain({ id: 'lease-789' })
					}
					if (table === 'tenant_invitations') {
						return createMockChain({ id: 'invitation-123' })
					}
					return mockChain
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_123' })

			await service.inviteTenantWithLease('owner-123', mockInviteRequest)

			// Verify the emit was called
			expect(mockEventEmitter.emit).toHaveBeenCalled()

			// Get the invitation code from the emit call
			const emitCall = (mockEventEmitter.emit as jest.Mock).mock.calls[0]
			const invitationCode = emitCall[1]?.invitationCode

			// FAILING TEST: Current implementation uses Math.random() which produces ~22 chars
			// Expected: 64 hex characters from crypto.randomBytes(32).toString('hex')
			expect(invitationCode).toBeDefined()
			expect(invitationCode).toHaveLength(64) // This will FAIL - current code generates ~22 chars
			expect(invitationCode).toMatch(/^[a-f0-9]+$/) // Should be hex only
		})

		it('should not generate predictable tokens using Math.random', async () => {
			// This test verifies tokens aren't generated from Math.random
			// by checking entropy (Math.random produces predictable patterns)
			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					if (table === 'properties') return createMockChain({ property_owner_id: 'owner-123' })
					if (table === 'property_owners') {
						return createMockChain({
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					if (table === 'leases') return createMockChain({ id: 'lease-789' })
					if (table === 'tenant_invitations') return createMockChain({ id: 'invitation-123' })
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_123' })

			// Generate multiple tokens and check they're all unique with high entropy
			const tokens: string[] = []
			for (let i = 0; i < 5; i++) {
				await service.inviteTenantWithLease('owner-123', mockInviteRequest)
				const emitCall = (mockEventEmitter.emit as jest.Mock).mock.calls[i]
				tokens.push(emitCall[1]?.invitationCode)
			}

			// All tokens should be unique
			const uniqueTokens = new Set(tokens)
			expect(uniqueTokens.size).toBe(5)

			// Tokens should have consistent length (crypto produces fixed-length output)
			const lengths = tokens.map(t => t?.length || 0)
			expect(new Set(lengths).size).toBe(1) // All same length
		})
	})

	describe('SAGA Rollback', () => {
		it('should rollback tenant if lease creation fails', async () => {
			// Step 1 succeeds: Tenant created
			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			// Step 2 fails: Lease creation fails
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') {
						return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					}
					if (table === 'properties') {
						return createMockChain({ property_owner_id: 'owner-123' })
					}
					if (table === 'leases') {
						// Lease creation fails
						return createMockChain(null, { message: 'Database error' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			// FAILING TEST: Current implementation doesn't clean up tenant on lease failure
			await expect(service.inviteTenantWithLease('owner-123', mockInviteRequest))
				.rejects.toThrow()

			// Verify tenant was rolled back (deleted)
			expect(mockTenantCrudService.hardDelete).toHaveBeenCalledWith('owner-123', 'tenant-123')
		})

		it('should rollback tenant and lease if Stripe customer creation fails', async () => {
			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					if (table === 'properties') return createMockChain({ property_owner_id: 'owner-123' })
					if (table === 'property_owners') {
						return createMockChain({
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					if (table === 'leases') {
						const chain = createMockChain({ id: 'lease-789' })
						// Also add delete capability for rollback
						chain.delete = jest.fn(() => chain)
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			// Step 4 fails: Stripe customer creation fails
			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockRejectedValue(new Error('Stripe error'))

			// FAILING TEST: Current implementation doesn't clean up on Stripe failure
			await expect(service.inviteTenantWithLease('owner-123', mockInviteRequest))
				.rejects.toThrow()

			// Verify both lease and tenant were rolled back
			expect(mockTenantCrudService.hardDelete).toHaveBeenCalledWith('owner-123', 'tenant-123')
			// Note: Lease deletion would be through Supabase, not a separate service
		})

		it('should rollback tenant, lease, and Stripe customer if subscription creation fails', async () => {
			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					if (table === 'properties') return createMockChain({ property_owner_id: 'owner-123' })
					if (table === 'property_owners') {
						return createMockChain({
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					if (table === 'leases') return createMockChain({ id: 'lease-789' })
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })

			// Step 5 fails: Subscription creation fails
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockRejectedValue(new Error('Subscription error'))

			// FAILING TEST: Current implementation doesn't clean up Stripe customer
			await expect(service.inviteTenantWithLease('owner-123', mockInviteRequest))
				.rejects.toThrow()

			// Verify Stripe customer was deleted
			expect(mockStripeConnectService.deleteCustomer).toHaveBeenCalledWith('cus_123', 'acct_123')
			expect(mockTenantCrudService.hardDelete).toHaveBeenCalledWith('owner-123', 'tenant-123')
		})
	})

	describe('Event Emission', () => {
		it('should emit tenant.invitation.sent event with correct payload', async () => {
			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					if (table === 'properties') return createMockChain({ property_owner_id: 'owner-123' })
					if (table === 'property_owners') {
						return createMockChain({
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					if (table === 'leases') return createMockChain({ id: 'lease-789' })
					if (table === 'tenant_invitations') return createMockChain({ id: 'invitation-123' })
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_123' })

			await service.inviteTenantWithLease('owner-123', mockInviteRequest)

			// Verify event was emitted with correct name and payload
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'tenant.invitation.sent',
				expect.objectContaining({
					email: 'tenant@example.com',
					tenant_id: 'tenant-123',
					invitationCode: expect.any(String),
					invitationUrl: expect.stringContaining('/accept-invite?code='),
					expiresAt: expect.any(String)
				})
			)
		})
	})

	describe('Invitation URL', () => {
		it('should generate invitation URL with FRONTEND_URL env variable', async () => {
			const originalEnv = process.env.FRONTEND_URL
			process.env.FRONTEND_URL = 'https://tenantflow.app'

			mockTenantCrudService.create = jest.fn().mockResolvedValue({ id: 'tenant-123' })

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'units') return createMockChain({ id: 'unit-456', property_id: 'property-123' })
					if (table === 'properties') return createMockChain({ property_owner_id: 'owner-123' })
					if (table === 'property_owners') {
						return createMockChain({
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					if (table === 'leases') return createMockChain({ id: 'lease-789' })
					if (table === 'tenant_invitations') return createMockChain({ id: 'invitation-123' })
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_123' })

			await service.inviteTenantWithLease('owner-123', mockInviteRequest)

			const emitCall = (mockEventEmitter.emit as jest.Mock).mock.calls[0]
			const invitationUrl = emitCall[1]?.invitationUrl

			expect(invitationUrl).toMatch(/^https:\/\/tenantflow\.app\/accept-invite\?code=/)

			process.env.FRONTEND_URL = originalEnv
		})
	})
})
