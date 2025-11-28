/**
 * TDD Tests for LeaseSignatureService
 *
 * This service handles the lease signature workflow:
 * 1. Owner creates lease draft (status: 'draft')
 * 2. Owner sends lease for signature (status: 'pending_signature')
 * 3. Tenant signs the lease
 * 4. Owner signs the lease (optional - can sign before sending)
 * 5. When BOTH signed: status -> 'active', create Stripe subscription
 *
 * Key principle: NO Stripe billing until BOTH parties have signed.
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger, BadRequestException, ForbiddenException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LeaseSignatureService } from './lease-signature.service'
import { SupabaseService } from '../../database/supabase.service'
import { StripeConnectService } from '../billing/stripe-connect.service'
import { DocuSealService } from '../docuseal/docuseal.service'

describe('LeaseSignatureService', () => {
	let service: LeaseSignatureService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>
	let mockStripeConnectService: jest.Mocked<Partial<StripeConnectService>>
	let mockDocuSealService: jest.Mocked<Partial<DocuSealService>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (resolveData: unknown = [], resolveError: unknown = null) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'gte', 'lte', 'order', 'maybeSingle']

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.single = jest.fn(() => Promise.resolve({
			data: Array.isArray(resolveData) && resolveData.length > 0 ? resolveData[0] : resolveData,
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

		mockEventEmitter = {
			emit: jest.fn()
		}

		mockStripeConnectService = {
			createCustomerOnConnectedAccount: jest.fn(),
			createSubscriptionOnConnectedAccount: jest.fn()
		}

		mockDocuSealService = {
			isEnabled: jest.fn().mockReturnValue(false),
			createLeaseSubmission: jest.fn(),
			getSubmitterSigningUrl: jest.fn(),
			archiveSubmission: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeaseSignatureService,
				{ provide: Logger, useValue: mockLogger },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: StripeConnectService, useValue: mockStripeConnectService },
				{ provide: DocuSealService, useValue: mockDocuSealService }
			]
		}).compile()

		service = module.get<LeaseSignatureService>(LeaseSignatureService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('sendForSignature', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-user-123' // auth.users.id
		const propertyOwnerId = 'property-owner-456' // property_owners.id (FK in leases)

		it('should transition lease from draft to pending_signature', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							lease_status: 'draft',
							property_owner_id: propertyOwnerId,
							primary_tenant_id: 'tenant-456'
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.sendForSignature(ownerId, leaseId)

			expect(updateData).toEqual(expect.objectContaining({
				lease_status: 'pending_signature',
				sent_for_signature_at: expect.any(String)
			}))
		})

		it('should NOT allow sending non-draft lease for signature', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'active', // Already active
							property_owner_id: propertyOwnerId
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.sendForSignature(ownerId, leaseId))
				.rejects.toThrow(BadRequestException)
		})

		it('should verify owner owns the lease', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'draft',
							property_owner_id: 'different-property-owner' // Not the requesting owner
						})
					}
					if (table === 'property_owners') {
						// Return a different user_id so the ownership check fails
						return createMockChain({ user_id: 'different-user-id' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.sendForSignature(ownerId, leaseId))
				.rejects.toThrow(ForbiddenException)
		})

		it('should emit lease.sent_for_signature event', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'draft',
							property_owner_id: propertyOwnerId,
							primary_tenant_id: 'tenant-456'
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.sendForSignature(ownerId, leaseId)

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.sent_for_signature',
				expect.objectContaining({
					lease_id: leaseId,
					tenant_id: 'tenant-456'
				})
			)
		})

		it('should NOT create Stripe subscription when sending for signature', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'draft',
							property_owner_id: propertyOwnerId,
							primary_tenant_id: 'tenant-456'
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.sendForSignature(ownerId, leaseId)

			// Stripe should NOT be called at this stage
			expect(mockStripeConnectService.createCustomerOnConnectedAccount).not.toHaveBeenCalled()
			expect(mockStripeConnectService.createSubscriptionOnConnectedAccount).not.toHaveBeenCalled()
		})
	})

	describe('signLease (as owner)', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-user-123' // auth.users.id
		const propertyOwnerId = 'property-owner-456' // property_owners.id (FK in leases)
		const signatureIp = '192.168.1.1'

		it('should record owner signature timestamp and IP', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							property_owner_id: propertyOwnerId,
							owner_signed_at: null,
							tenant_signed_at: null
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsOwner(ownerId, leaseId, signatureIp)

			expect(updateData).toEqual(expect.objectContaining({
				owner_signed_at: expect.any(String),
				owner_signature_ip: signatureIp
			}))
		})

		it('should NOT activate lease if only owner has signed', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							property_owner_id: propertyOwnerId,
							owner_signed_at: null,
							tenant_signed_at: null // Tenant hasn't signed
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsOwner(ownerId, leaseId, signatureIp)

			// Status should remain pending_signature
			expect(updateData.lease_status).toBeUndefined()
			// Stripe should NOT be called
			expect(mockStripeConnectService.createSubscriptionOnConnectedAccount).not.toHaveBeenCalled()
		})

		it('should activate lease and create Stripe subscription when BOTH parties have signed', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							property_owner_id: propertyOwnerId,
							owner_signed_at: null,
							tenant_signed_at: '2024-01-15T10:00:00Z', // Tenant already signed!
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456'
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					if (table === 'tenants') {
						return createMockChain({
							id: 'tenant-456',
							user_id: 'user-789',
							stripe_customer_id: null
						})
					}
					if (table === 'property_owners') {
						return createMockChain({
							id: propertyOwnerId,
							user_id: ownerId, // Link to auth user
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_123' })

			await service.signLeaseAsOwner(ownerId, leaseId, signatureIp)

			// Lease should be activated
			expect(updateData).toEqual(expect.objectContaining({
				lease_status: 'active',
				owner_signed_at: expect.any(String),
				owner_signature_ip: signatureIp
			}))

			// Stripe subscription should be created
			expect(mockStripeConnectService.createCustomerOnConnectedAccount).toHaveBeenCalled()
			expect(mockStripeConnectService.createSubscriptionOnConnectedAccount).toHaveBeenCalled()
		})

		it('should prevent owner from signing twice', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							property_owner_id: propertyOwnerId,
							owner_signed_at: '2024-01-10T10:00:00Z', // Already signed!
							tenant_signed_at: null
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsOwner(ownerId, leaseId, signatureIp))
				.rejects.toThrow(BadRequestException)
		})
	})

	describe('signLease (as tenant)', () => {
		const leaseId = 'lease-123'
		const tenantUserId = 'user-789'
		const signatureIp = '192.168.1.2'

		it('should record tenant signature timestamp and IP', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							primary_tenant_id: 'tenant-456',
							owner_signed_at: null,
							tenant_signed_at: null
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp)

			expect(updateData).toEqual(expect.objectContaining({
				tenant_signed_at: expect.any(String),
				tenant_signature_ip: signatureIp
			}))
		})

		it('should NOT activate lease if only tenant has signed', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							primary_tenant_id: 'tenant-456',
							owner_signed_at: null, // Owner hasn't signed
							tenant_signed_at: null
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp)

			// Status should remain pending_signature
			expect(updateData.lease_status).toBeUndefined()
			// Stripe should NOT be called
			expect(mockStripeConnectService.createSubscriptionOnConnectedAccount).not.toHaveBeenCalled()
		})

		it('should verify tenant is assigned to the lease', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							primary_tenant_id: 'different-tenant', // Not this tenant!
							owner_signed_at: null,
							tenant_signed_at: null
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp))
				.rejects.toThrow(ForbiddenException)
		})

		it('should prevent tenant from signing twice', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature',
							primary_tenant_id: 'tenant-456',
							owner_signed_at: null,
							tenant_signed_at: '2024-01-10T10:00:00Z' // Already signed!
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp))
				.rejects.toThrow(BadRequestException)
		})

		it('should only allow signing lease in pending_signature status', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'draft', // Still in draft!
							primary_tenant_id: 'tenant-456',
							owner_signed_at: null,
							tenant_signed_at: null
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp))
				.rejects.toThrow(BadRequestException)
		})
	})

	describe('activateLease (private, triggered when both sign)', () => {
		it('should create Stripe customer if not exists', async () => {
			// This is tested indirectly through signLease tests
			// When both parties sign, Stripe customer is created
		})

		it('should create Stripe subscription with correct rent amount', async () => {
			let subscriptionParams: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: 'lease-123',
							lease_status: 'pending_signature',
							property_owner_id: 'owner-123',
							owner_signed_at: '2024-01-10T10:00:00Z', // Owner already signed
							tenant_signed_at: null,
							rent_amount: 150000, // $1,500.00
							primary_tenant_id: 'tenant-456'
						})
						chain.update = jest.fn(() => chain)
						return chain
					}
					if (table === 'tenants') {
						const chain = createMockChain({
							id: 'tenant-456',
							user_id: 'user-789',
							stripe_customer_id: null
						})
						chain.update = jest.fn(() => chain)
						return chain
					}
					if (table === 'property_owners') {
						return createMockChain({
							id: 'owner-123',
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createCustomerOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'cus_123' })
			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockImplementation((_accountId, params) => {
					subscriptionParams = params
					return Promise.resolve({ id: 'sub_123' })
				})

			await service.signLeaseAsTenant('user-789', 'lease-123', '192.168.1.1')

			expect(subscriptionParams).toEqual(expect.objectContaining({
				customerId: 'cus_123',
				rentAmount: 150000
			}))
		})

		it('should update lease with stripe_subscription_id', async () => {
			let updateData: any = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: 'lease-123',
							lease_status: 'pending_signature',
							property_owner_id: 'owner-123',
							owner_signed_at: '2024-01-10T10:00:00Z',
							tenant_signed_at: null,
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456'
						})
						chain.update = jest.fn((data: any) => {
							updateData = data
							return chain
						})
						return chain
					}
					if (table === 'tenants') {
						const chain = createMockChain({
							id: 'tenant-456',
							user_id: 'user-789',
							stripe_customer_id: 'cus_existing'
						})
						chain.update = jest.fn(() => chain)
						return chain
					}
					if (table === 'property_owners') {
						return createMockChain({
							id: 'owner-123',
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_new_123' })

			await service.signLeaseAsTenant('user-789', 'lease-123', '192.168.1.1')

			expect(updateData).toEqual(expect.objectContaining({
				stripe_subscription_id: 'sub_new_123'
			}))
		})

		it('should emit lease.activated event', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: 'lease-123',
							lease_status: 'pending_signature',
							property_owner_id: 'owner-123',
							owner_signed_at: '2024-01-10T10:00:00Z',
							tenant_signed_at: null,
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456'
						})
						chain.update = jest.fn(() => chain)
						return chain
					}
					if (table === 'tenants') {
						const chain = createMockChain({
							id: 'tenant-456',
							user_id: 'user-789',
							stripe_customer_id: 'cus_123'
						})
						chain.update = jest.fn(() => chain)
						return chain
					}
					if (table === 'property_owners') {
						return createMockChain({
							id: 'owner-123',
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			mockStripeConnectService.createSubscriptionOnConnectedAccount = jest.fn()
				.mockResolvedValue({ id: 'sub_123' })

			await service.signLeaseAsTenant('user-789', 'lease-123', '192.168.1.1')

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.activated',
				expect.objectContaining({
					lease_id: 'lease-123',
					tenant_id: 'tenant-456',
					subscription_id: 'sub_123'
				})
			)
		})
	})

	describe('getSignatureStatus', () => {
		const ownerId = 'owner-user-123'
		const tenantUserId = 'tenant-user-456'

		it('should return current signature status for a lease when owner requests', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							lease_status: 'pending_signature',
							owner_signed_at: '2024-01-10T10:00:00Z',
							tenant_signed_at: null,
							sent_for_signature_at: '2024-01-09T10:00:00Z',
							property_owner_id: ownerId,
							primary_tenant_id: 'tenant-456'
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			const status = await service.getSignatureStatus('lease-123', ownerId)

			expect(status).toEqual({
				lease_id: 'lease-123',
				status: 'pending_signature',
				owner_signed: true,
				owner_signed_at: '2024-01-10T10:00:00Z',
				tenant_signed: false,
				tenant_signed_at: null,
				sent_for_signature_at: '2024-01-09T10:00:00Z',
				both_signed: false
			})
		})

		it('should return signature status when tenant requests', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							lease_status: 'pending_signature',
							owner_signed_at: '2024-01-10T10:00:00Z',
							tenant_signed_at: null,
							sent_for_signature_at: '2024-01-09T10:00:00Z',
							property_owner_id: ownerId,
							primary_tenant_id: 'tenant-456'
						})
					}
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456' })
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			const status = await service.getSignatureStatus('lease-123', tenantUserId)

			expect(status.lease_id).toBe('lease-123')
		})

		it('should throw ForbiddenException when unauthorized user requests', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							lease_status: 'pending_signature',
							owner_signed_at: null,
							tenant_signed_at: null,
							sent_for_signature_at: '2024-01-09T10:00:00Z',
							property_owner_id: ownerId,
							primary_tenant_id: 'tenant-456'
						})
					}
					if (table === 'tenants') {
						return createMockChain(null) // No matching tenant
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.getSignatureStatus('lease-123', 'random-user'))
				.rejects.toThrow(ForbiddenException)
		})

		it('should indicate when both parties have signed', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							lease_status: 'active',
							owner_signed_at: '2024-01-10T10:00:00Z',
							tenant_signed_at: '2024-01-11T10:00:00Z',
							sent_for_signature_at: '2024-01-09T10:00:00Z',
							property_owner_id: ownerId,
							primary_tenant_id: 'tenant-456'
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			const status = await service.getSignatureStatus('lease-123', ownerId)

			expect(status.both_signed).toBe(true)
			expect(status.owner_signed).toBe(true)
			expect(status.tenant_signed).toBe(true)
		})
	})
})
