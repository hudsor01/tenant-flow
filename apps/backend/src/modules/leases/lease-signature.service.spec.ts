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
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LeaseSignatureService } from './lease-signature.service'
import { SupabaseService } from '../../database/supabase.service'
import { DocuSealService } from '../docuseal/docuseal.service'
import { LeaseSubscriptionService } from './lease-subscription.service'
import { LeaseDocumentService } from './lease-document.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


describe('LeaseSignatureService', () => {
	let service: LeaseSignatureService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>
	let mockDocuSealService: jest.Mocked<Partial<DocuSealService>>
	let mockLeaseDocumentService: jest.Mocked<Partial<LeaseDocumentService>>
	let mockLeaseSubscriptionService: jest.Mocked<Partial<LeaseSubscriptionService>>

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

	// Helper to create RPC mock result for sign_lease_and_check_activation
	const createSignLeaseRpcResult = (success: boolean, bothSigned: boolean, errorMessage: string | null = null) => ({
		data: [{ success, both_signed: bothSigned, error_message: errorMessage }],
		error: null
	})

	beforeEach(async () => {
		mockEventEmitter = {
			emit: jest.fn()
		}

		mockDocuSealService = {
			isEnabled: jest.fn().mockReturnValue(false),
			createLeaseSubmission: jest.fn(),
			getSubmitterSigningUrl: jest.fn(),
			archiveSubmission: jest.fn(),
			getSubmission: jest.fn(),
			resendToSubmitter: jest.fn()
		}

		mockLeaseDocumentService = {
			getSigningUrl: jest.fn(),
			cancelSignatureRequest: jest.fn(),
			resendSignatureRequest: jest.fn(),
			getSignedDocumentUrl: jest.fn()
		}

		mockLeaseSubscriptionService = {
			activateLease: jest.fn().mockResolvedValue(undefined)
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeaseSignatureService,
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: DocuSealService, useValue: mockDocuSealService },
				{ provide: LeaseDocumentService, useValue: mockLeaseDocumentService },
				{ provide: LeaseSubscriptionService, useValue: mockLeaseSubscriptionService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
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
							property_owner_id: propertyOwnerId,
							property_owner: { user_id: ownerId }
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
							property_owner_id: 'different-property-owner', // Not the requesting owner
							property_owner: { user_id: 'different-user-id' }
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
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

			// Lease activation should NOT happen at this stage
			expect(mockLeaseSubscriptionService.activateLease).not.toHaveBeenCalled()
		})

		describe('email validation with DocuSeal', () => {
			it('should throw BadRequestException when owner email is missing for DocuSeal submission', async () => {
				mockDocuSealService.isEnabled = jest.fn().mockReturnValue(true)

				mockSupabaseService.getAdminClient = jest.fn(() => ({
					from: jest.fn((table: string) => {
						if (table === 'leases') {
							return createMockChain({
								id: leaseId,
								lease_status: 'draft',
								property_owner_id: propertyOwnerId,
								primary_tenant_id: 'tenant-456',
								property_owner: { user_id: ownerId }
							})
						}
						if (table === 'property_owners') {
							return createMockChain({ id: propertyOwnerId, user_id: ownerId })
						}
						if (table === 'users') {
							// Return null email for owner
							return createMockChain({ email: null, first_name: 'Test', last_name: 'Owner' })
						}
						if (table === 'tenants') {
							return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
						}
						return createMockChain()
					})
				})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

				await expect(service.sendForSignature(ownerId, leaseId, { templateId: 123 }))
					.rejects.toThrow(BadRequestException)
				await expect(service.sendForSignature(ownerId, leaseId, { templateId: 123 }))
					.rejects.toThrow('property owner email is missing')
			})

			it('should throw BadRequestException when tenant email is missing for DocuSeal submission', async () => {
				mockDocuSealService.isEnabled = jest.fn().mockReturnValue(true)

				let userQueryCount = 0
				mockSupabaseService.getAdminClient = jest.fn(() => ({
					from: jest.fn((table: string) => {
						if (table === 'leases') {
							return createMockChain({
								id: leaseId,
								lease_status: 'draft',
								property_owner_id: propertyOwnerId,
								primary_tenant_id: 'tenant-456',
								property_owner: { user_id: ownerId }
							})
						}
						if (table === 'property_owners') {
							return createMockChain({ id: propertyOwnerId, user_id: ownerId })
						}
						if (table === 'users') {
							userQueryCount++
							// First query is for owner (return valid email), second is for tenant (return null)
							if (userQueryCount === 1) {
								return createMockChain({ email: 'owner@test.com', first_name: 'Test', last_name: 'Owner' })
							}
							return createMockChain({ email: null, first_name: 'Test', last_name: 'Tenant' })
						}
						if (table === 'tenants') {
							return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
						}
						return createMockChain()
					})
				})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

				await expect(service.sendForSignature(ownerId, leaseId, { templateId: 123 }))
					.rejects.toThrow('tenant email is missing')
			})

			it('should proceed without email validation when DocuSeal is disabled', async () => {
				mockDocuSealService.isEnabled = jest.fn().mockReturnValue(false)

				mockSupabaseService.getAdminClient = jest.fn(() => ({
					from: jest.fn((table: string) => {
						if (table === 'leases') {
							const chain = createMockChain({
								id: leaseId,
								lease_status: 'draft',
								property_owner_id: propertyOwnerId,
								primary_tenant_id: 'tenant-456',
								property_owner: { user_id: ownerId }
							})
							chain.update = jest.fn(() => chain)
							return chain
						}
						if (table === 'property_owners') {
							return createMockChain({ id: propertyOwnerId, user_id: ownerId })
						}
						if (table === 'users') {
							// Return null emails - should still work since DocuSeal is disabled
							return createMockChain({ email: null, first_name: 'Test', last_name: 'User' })
						}
						if (table === 'tenants') {
							return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
						}
						return createMockChain()
					})
				})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

				// Should not throw - DocuSeal is disabled
				await expect(service.sendForSignature(ownerId, leaseId)).resolves.not.toThrow()
			})

			it('should proceed without email validation when no templateId provided', async () => {
				mockDocuSealService.isEnabled = jest.fn().mockReturnValue(true)

				mockSupabaseService.getAdminClient = jest.fn(() => ({
					from: jest.fn((table: string) => {
						if (table === 'leases') {
							const chain = createMockChain({
								id: leaseId,
								lease_status: 'draft',
								property_owner_id: propertyOwnerId,
								primary_tenant_id: 'tenant-456',
								property_owner: { user_id: ownerId }
							})
							chain.update = jest.fn(() => chain)
							return chain
						}
						if (table === 'property_owners') {
							return createMockChain({ id: propertyOwnerId, user_id: ownerId })
						}
						if (table === 'users') {
							// Return null emails - should still work since no templateId
							return createMockChain({ email: null, first_name: 'Test', last_name: 'User' })
						}
						if (table === 'tenants') {
							return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
						}
						return createMockChain()
					})
				})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

				// Should not throw - no templateId means no DocuSeal
				await expect(service.sendForSignature(ownerId, leaseId)).resolves.not.toThrow()
			})
		})
	})

	describe('signLease (as owner)', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-user-123' // auth.users.id
		const propertyOwnerId = 'property-owner-456' // property_owners.id (FK in leases)
		const signatureIp = '192.168.1.1'

		it('should call atomic RPC for owner signature', async () => {
			let rpcCalled = false
			let rpcParams: Record<string, unknown> = {}

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: propertyOwnerId,
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				}),
				rpc: jest.fn((name: string, params: Record<string, unknown>) => {
					rpcCalled = true
					rpcParams = { name, params }
					return Promise.resolve(createSignLeaseRpcResult(true, false))
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsOwner(ownerId, leaseId, signatureIp)

			expect(rpcCalled).toBe(true)
			expect(rpcParams.name).toBe('sign_lease_and_check_activation')
			expect((rpcParams.params as Record<string, unknown>).p_signer_type).toBe('owner')
			expect((rpcParams.params as Record<string, unknown>).p_signature_ip).toBe(signatureIp)
		})

		it('should NOT activate lease if only owner has signed (RPC returns both_signed=false)', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: propertyOwnerId,
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(createSignLeaseRpcResult(true, false))) // both_signed = false
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsOwner(ownerId, leaseId, signatureIp)

			// Lease activation should NOT happen
			expect(mockLeaseSubscriptionService.activateLease).not.toHaveBeenCalled()
			// Event for partial signing should be emitted
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.owner_signed',
				expect.objectContaining({ lease_id: leaseId })
			)
		})

		it('should activate lease when RPC returns both_signed=true', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: propertyOwnerId,
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				}),
				rpc: jest.fn((rpcName: string) => {
					if (rpcName === 'sign_lease_and_check_activation') {
						return Promise.resolve(createSignLeaseRpcResult(true, true)) // both_signed = true
					}
					return Promise.resolve({ data: null, error: null })
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsOwner(ownerId, leaseId, signatureIp)

			// LeaseSubscriptionService.activateLease should be called
			expect(mockLeaseSubscriptionService.activateLease).toHaveBeenCalledWith(
				expect.anything(), // supabase client
				expect.objectContaining({
					id: leaseId,
					property_owner_id: propertyOwnerId,
					rent_amount: 150000,
					primary_tenant_id: 'tenant-456'
				}),
				expect.objectContaining({
					owner_signed_at: expect.any(String),
					owner_signature_ip: signatureIp
				})
			)
		})

		it('should throw BadRequestException when RPC returns validation error (already signed)', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: propertyOwnerId,
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: ownerId })
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(
					createSignLeaseRpcResult(false, false, 'Owner has already signed this lease')
				))
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsOwner(ownerId, leaseId, signatureIp))
				.rejects.toThrow(BadRequestException)
		})
	})

	describe('signLease (as tenant)', () => {
		const leaseId = 'lease-123'
		const tenantUserId = 'user-789'
		const signatureIp = '192.168.1.2'

		it('should call atomic RPC for tenant signature', async () => {
			let rpcCalled = false
			let rpcParams: Record<string, unknown> = {}

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId, stripe_customer_id: null })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: 'owner-123',
							primary_tenant_id: 'tenant-456',
							rent_amount: 150000
						})
					}
					return createMockChain()
				}),
				rpc: jest.fn((name: string, params: Record<string, unknown>) => {
					rpcCalled = true
					rpcParams = { name, params }
					return Promise.resolve(createSignLeaseRpcResult(true, false))
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp)

			expect(rpcCalled).toBe(true)
			expect(rpcParams.name).toBe('sign_lease_and_check_activation')
			expect((rpcParams.params as Record<string, unknown>).p_signer_type).toBe('tenant')
			expect((rpcParams.params as Record<string, unknown>).p_signature_ip).toBe(signatureIp)
		})

		it('should NOT activate lease if only tenant has signed (RPC returns both_signed=false)', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId, stripe_customer_id: null })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: 'owner-123',
							primary_tenant_id: 'tenant-456',
							rent_amount: 150000
						})
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(createSignLeaseRpcResult(true, false))) // both_signed = false
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp)

			// Lease activation should NOT happen
			expect(mockLeaseSubscriptionService.activateLease).not.toHaveBeenCalled()
			// Event for partial signing should be emitted
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.tenant_signed',
				expect.objectContaining({ lease_id: leaseId, tenant_id: 'tenant-456' })
			)
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
							property_owner_id: 'owner-123',
							primary_tenant_id: 'different-tenant', // Not this tenant!
							rent_amount: 150000
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp))
				.rejects.toThrow(ForbiddenException)
		})

		it('should throw BadRequestException when RPC returns validation error (already signed)', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: 'owner-123',
							primary_tenant_id: 'tenant-456',
							rent_amount: 150000
						})
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(
					createSignLeaseRpcResult(false, false, 'Tenant has already signed this lease')
				))
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp))
				.rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException when RPC returns status validation error (lease not pending)', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: tenantUserId })
					}
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							property_owner_id: 'owner-123',
							primary_tenant_id: 'tenant-456',
							rent_amount: 150000
						})
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(
					createSignLeaseRpcResult(false, false, 'Lease must be pending signature for tenant to sign')
				))
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(service.signLeaseAsTenant(tenantUserId, leaseId, signatureIp))
				.rejects.toThrow(BadRequestException)
		})
	})

	describe('concurrency and race conditions', () => {
		const ownerUserId = 'owner-user-123'
		const tenantUserId = 'tenant-user-456'
		const leaseId = 'lease-concurrency-1'

		const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

		const buildInMemorySupabaseClient = (
			ownerId: string,
			leaseState: {
				id: string
				lease_status: string
				property_owner_id: string
				primary_tenant_id: string
				rent_amount: number
				owner_signed_at: string | null
				tenant_signed_at: string | null
				owner_signature_ip?: string | null
				tenant_signature_ip?: string | null
			},
			tenantRecord: { id: string; user_id: string; stripe_customer_id?: string | null },
			options: { rpcDelayMs?: number } = {}
		) => {
			let isLocked = false
			const rpcDelayMs = options.rpcDelayMs ?? 5

			const makeChain = (getData: () => unknown) => {
				const chain: Record<string, jest.Mock> = {
					select: jest.fn(() => chain),
					eq: jest.fn(() => chain),
					single: jest.fn(async () => ({ data: getData(), error: null })),
					update: jest.fn(() => chain),
					is: jest.fn(() => chain),
					order: jest.fn(() => chain)
				}

				return chain
			}

			const rpc = jest.fn(async (name: string, params: Record<string, unknown>) => {
				if (name === 'sign_lease_and_check_activation') {
					// Simulate the SELECT FOR UPDATE lock inside the RPC
					while (isLocked) {
						await delay(1)
					}
					isLocked = true
					if (rpcDelayMs > 0) {
						await delay(rpcDelayMs)
					}

					if (params.p_signer_type === 'owner') {
						if (leaseState.owner_signed_at) {
							isLocked = false
							return { data: [{ success: false, both_signed: false, error_message: 'Owner has already signed this lease' }], error: null }
						}

						leaseState.owner_signed_at = params.p_signed_at as string
						leaseState.owner_signature_ip = params.p_signature_ip as string
						const bothSigned = Boolean(leaseState.tenant_signed_at)
						isLocked = false
						return { data: [{ success: true, both_signed: bothSigned, error_message: null }], error: null }
					}

					if (params.p_signer_type === 'tenant') {
						if (leaseState.tenant_signed_at) {
							isLocked = false
							return { data: [{ success: false, both_signed: false, error_message: 'Tenant has already signed this lease' }], error: null }
						}

						leaseState.tenant_signed_at = params.p_signed_at as string
						leaseState.tenant_signature_ip = params.p_signature_ip as string
						const bothSigned = Boolean(leaseState.owner_signed_at)
						isLocked = false
						return { data: [{ success: true, both_signed: bothSigned, error_message: null }], error: null }
					}
				}

				if (name === 'activate_lease_with_pending_subscription') {
					return { data: [{ success: true }], error: null }
				}

				return { data: null, error: null }
			})

			const from = jest.fn((table: string) => {
				switch (table) {
					case 'leases':
						return makeChain(() => ({
							...leaseState,
							property_owner: { user_id: ownerId }
						}))
					case 'tenants':
						return makeChain(() => tenantRecord)
					case 'property_owners':
						return makeChain(() => ({
							id: leaseState.property_owner_id,
							user_id: ownerId,
							stripe_account_id: 'acct_123',
							charges_enabled: true,
							payouts_enabled: true
						}))
					case 'users':
						return makeChain(() => ({ email: 'tenant@test.com', first_name: 'Test', last_name: 'Tenant' }))
					default:
						return makeChain(() => ({}))
				}
			})

			return { from, rpc }
		}

		it('handles owner and tenant signing concurrently without double activation', async () => {
			const leaseState = {
				id: leaseId,
				lease_status: 'pending_signature',
				property_owner_id: 'property-owner-001',
				primary_tenant_id: 'tenant-001',
				rent_amount: 250000,
				owner_signed_at: null,
				tenant_signed_at: null
			}

			const tenantRecord = { id: 'tenant-001', user_id: tenantUserId, stripe_customer_id: null }
			const supabaseClient = buildInMemorySupabaseClient(ownerUserId, leaseState, tenantRecord)
			mockSupabaseService.getAdminClient = jest.fn(() => supabaseClient) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await Promise.all([
				service.signLeaseAsOwner(ownerUserId, leaseId, '10.0.0.1'),
				service.signLeaseAsTenant(tenantUserId, leaseId, '10.0.0.2')
			])

			expect(leaseState.owner_signed_at).toBeTruthy()
			expect(leaseState.tenant_signed_at).toBeTruthy()
			// LeaseSubscriptionService.activateLease should be called exactly once (by whoever signs last and triggers both_signed=true)
			expect(mockLeaseSubscriptionService.activateLease).toHaveBeenCalledTimes(1)
			expect(supabaseClient.rpc.mock.calls.filter(([name]) => name === 'sign_lease_and_check_activation')).toHaveLength(2)
		})

		it('prevents duplicate tenant signatures when requests race each other', async () => {
			const leaseState = {
				id: leaseId,
				lease_status: 'pending_signature',
				property_owner_id: 'property-owner-002',
				primary_tenant_id: 'tenant-002',
				rent_amount: 180000,
				owner_signed_at: null,
				tenant_signed_at: null
			}

			const tenantRecord = { id: 'tenant-002', user_id: tenantUserId, stripe_customer_id: null }
			const supabaseClient = buildInMemorySupabaseClient(ownerUserId, leaseState, tenantRecord)
			mockSupabaseService.getAdminClient = jest.fn(() => supabaseClient) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			const results = await Promise.allSettled([
				service.signLeaseAsTenant(tenantUserId, leaseId, '10.0.0.3'),
				service.signLeaseAsTenant(tenantUserId, leaseId, '10.0.0.4')
			])

			const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<void>[]
			const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]

			expect(fulfilled).toHaveLength(1)
			expect(rejected).toHaveLength(1)
			expect(rejected[0]?.reason).toBeInstanceOf(BadRequestException)
			expect(leaseState.tenant_signed_at).toBeTruthy()
			// Lease not activated since owner hasn't signed yet (both_signed=false)
			expect(mockLeaseSubscriptionService.activateLease).not.toHaveBeenCalled()
			expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1)
			expect(supabaseClient.rpc.mock.calls.filter(([name]) => name === 'sign_lease_and_check_activation')).toHaveLength(2)
		})
	})

	describe('activateLease delegation to LeaseSubscriptionService', () => {
		// Note: Detailed Stripe customer/subscription tests are in lease-subscription.service.spec.ts
		// These tests verify LeaseSignatureService correctly delegates to LeaseSubscriptionService

		it('should call LeaseSubscriptionService.activateLease with lease data when tenant signs last', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
					}
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							property_owner_id: 'owner-123',
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456'
						})
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(createSignLeaseRpcResult(true, true))) // both_signed = true
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsTenant('user-789', 'lease-123', '192.168.1.1')

			expect(mockLeaseSubscriptionService.activateLease).toHaveBeenCalledWith(
				expect.anything(), // supabase client
				expect.objectContaining({
					id: 'lease-123',
					property_owner_id: 'owner-123',
					rent_amount: 150000,
					primary_tenant_id: 'tenant-456'
				}),
				expect.objectContaining({
					tenant_signed_at: expect.any(String),
					tenant_signature_ip: '192.168.1.1'
				})
			)
		})

		it('should call LeaseSubscriptionService.activateLease with signature data when owner signs last', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							property_owner_id: 'owner-123',
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: 'owner-user-123' }
						})
					}
					if (table === 'property_owners') {
						return createMockChain({ user_id: 'owner-user-123' })
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(createSignLeaseRpcResult(true, true))) // both_signed = true
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsOwner('owner-user-123', 'lease-123', '10.0.0.1')

			expect(mockLeaseSubscriptionService.activateLease).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					id: 'lease-123',
					property_owner_id: 'owner-123'
				}),
				expect.objectContaining({
					owner_signed_at: expect.any(String),
					owner_signature_ip: '10.0.0.1'
				})
			)
		})

		it('should NOT call LeaseSubscriptionService.activateLease when only one party has signed', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'tenants') {
						return createMockChain({ id: 'tenant-456', user_id: 'user-789' })
					}
					if (table === 'leases') {
						return createMockChain({
							id: 'lease-123',
							property_owner_id: 'owner-123',
							rent_amount: 150000,
							primary_tenant_id: 'tenant-456'
						})
					}
					return createMockChain()
				}),
				rpc: jest.fn(() => Promise.resolve(createSignLeaseRpcResult(true, false))) // both_signed = false
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.signLeaseAsTenant('user-789', 'lease-123', '192.168.1.1')

			// LeaseSubscriptionService.activateLease should NOT be called
			expect(mockLeaseSubscriptionService.activateLease).not.toHaveBeenCalled()
			// Partial signing event should be emitted instead
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.tenant_signed',
				expect.objectContaining({ lease_id: 'lease-123' })
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: 'different-owner' }
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
							primary_tenant_id: 'tenant-456',
							property_owner: { user_id: ownerId }
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

	describe('resendSignatureRequest', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-user-123'
		const propertyOwnerId = 'property-owner-456'

		it('should resend signature request to pending submitters', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn().mockResolvedValue(undefined)

			await service.resendSignatureRequest(ownerId, leaseId)

			expect(mockLeaseDocumentService.resendSignatureRequest).toHaveBeenCalledWith(ownerId, leaseId, undefined)
		})

		it('should pass message option when provided', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn().mockResolvedValue(undefined)

			await service.resendSignatureRequest(ownerId, leaseId, { message: 'Please sign urgently' })

			expect(mockLeaseDocumentService.resendSignatureRequest).toHaveBeenCalledWith(ownerId, leaseId, { message: 'Please sign urgently' })
		})

		it('should delegate to leaseDocumentService', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn().mockResolvedValue(undefined)

			await service.resendSignatureRequest(ownerId, leaseId)

			expect(mockLeaseDocumentService.resendSignatureRequest).toHaveBeenCalledTimes(1)
			expect(mockLeaseDocumentService.resendSignatureRequest).toHaveBeenCalledWith(ownerId, leaseId, undefined)
		})

		it('should propagate NotFoundException when lease not found', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn()
				.mockRejectedValue(new NotFoundException('Lease not found'))

			await expect(service.resendSignatureRequest(ownerId, 'nonexistent-lease'))
				.rejects.toThrow('Lease not found')
		})

		it('should propagate ForbiddenException when user does not own the lease', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn()
				.mockRejectedValue(new ForbiddenException('Not authorized'))

			await expect(service.resendSignatureRequest(ownerId, leaseId))
				.rejects.toThrow(ForbiddenException)
		})

		it('should propagate BadRequestException when lease is not in pending_signature status', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn()
				.mockRejectedValue(new BadRequestException('Lease not pending signature'))

			await expect(service.resendSignatureRequest(ownerId, leaseId))
				.rejects.toThrow(BadRequestException)
		})

		it('should propagate BadRequestException when no DocuSeal submission exists', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn()
				.mockRejectedValue(new BadRequestException('No DocuSeal submission found for this lease'))

			await expect(service.resendSignatureRequest(ownerId, leaseId))
				.rejects.toThrow('No DocuSeal submission found for this lease')
		})

		it('should propagate BadRequestException when DocuSeal is disabled', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn()
				.mockRejectedValue(new BadRequestException('No DocuSeal submission found for this lease. Cannot resend.'))

			await expect(service.resendSignatureRequest(ownerId, leaseId))
				.rejects.toThrow('No DocuSeal submission found for this lease')
		})

		it('should propagate BadRequestException when all parties have already signed', async () => {
			mockLeaseDocumentService.resendSignatureRequest = jest.fn()
				.mockRejectedValue(new BadRequestException('All parties have already signed. Nothing to resend.'))

			await expect(service.resendSignatureRequest(ownerId, leaseId))
				.rejects.toThrow('All parties have already signed')
		})
	})
})
