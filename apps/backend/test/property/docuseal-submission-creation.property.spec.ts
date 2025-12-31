/**
 * Property 11: DocuSeal Submission Creation
 * Feature: lease-creation-wizard, Property 11: DocuSeal submission creation
 * Validates: Requirements 6.2, 6.3
 *
 * For any draft lease sent for signature with DocuSeal enabled,
 * a DocuSeal submission must be created and the lease must be updated
 * with status 'pending_signature' and the docuseal_submission_id.
 *
 * This test verifies the core business logic of the sendForSignature flow
 * when DocuSeal integration is enabled.
 */

import * as fc from 'fast-check'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { LeaseSignatureService } from '../../src/modules/leases/lease-signature.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { DocuSealService } from '../../src/modules/docuseal/docuseal.service'
import { LeaseSubscriptionService } from '../../src/modules/leases/lease-subscription.service'
import { SignatureValidationHelper } from '../../src/modules/leases/helpers/signature-validation.helper'
import { LeasePdfHelper } from '../../src/modules/leases/helpers/lease-pdf.helper'
import { SignatureNotificationHelper } from '../../src/modules/leases/helpers/signature-notification.helper'
import { SilentLogger } from '../../src/__test__/silent-logger'
import { AppLogger } from '../../src/logger/app-logger.service'

describe('Property 11: DocuSeal Submission Creation', () => {
	let service: LeaseSignatureService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockDocuSealService: jest.Mocked<Partial<DocuSealService>>
	let mockLeaseSubscriptionService: jest.Mocked<
		Partial<LeaseSubscriptionService>
	>
	let mockSignatureValidationHelper: jest.Mocked<SignatureValidationHelper>
	let mockLeasePdfHelper: jest.Mocked<LeasePdfHelper>
	let mockSignatureNotificationHelper: jest.Mocked<SignatureNotificationHelper>

	// Track what data was updated in the lease
	let capturedLeaseUpdate: Record<string, unknown> | null = null

	// Helper to create a flexible Supabase query chain
	const createMockChain = (
		resolveData: unknown = [],
		resolveError: unknown = null
	) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = [
			'select',
			'insert',
			'delete',
			'eq',
			'neq',
			'is',
			'in',
			'or',
			'gte',
			'lte',
			'order',
			'maybeSingle'
		]

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.update = jest.fn((data: Record<string, unknown>) => {
			capturedLeaseUpdate = data
			return chain
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

		return chain
	}

	beforeEach(async () => {
		capturedLeaseUpdate = null

		mockDocuSealService = {
			isEnabled: jest.fn().mockReturnValue(true), // DocuSeal is enabled for this property test
			createLeaseSubmission: jest.fn(),
			createSubmissionFromPdf: jest.fn(),
			getSubmitterSigningUrl: jest.fn(),
			archiveSubmission: jest.fn()
		}

		mockLeaseSubscriptionService = {
			activateLease: jest.fn().mockResolvedValue(undefined)
		}

		mockSignatureValidationHelper = {
			ensureLeaseOwner: jest.fn(),
			ensureLeaseStatus: jest.fn(),
			ensureTenantAssigned: jest.fn()
		} as unknown as jest.Mocked<SignatureValidationHelper>

		mockLeasePdfHelper = {
			preparePdfAndSubmission: jest.fn().mockResolvedValue({
				pdfUrl: 'https://storage.example.com/lease.pdf',
				docusealSubmissionId: 'docuseal-submission-123'
			})
		} as unknown as jest.Mocked<LeasePdfHelper>

		mockSignatureNotificationHelper = {
			emitLeaseSentForSignature: jest.fn(),
			emitOwnerSigned: jest.fn(),
			emitTenantSigned: jest.fn(),
			emitSignatureCancelled: jest.fn(),
			broadcastSignatureUpdate: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<SignatureNotificationHelper>

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getAdminClient']>
			>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeaseSignatureService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: DocuSealService, useValue: mockDocuSealService },
				{
					provide: LeaseSubscriptionService,
					useValue: mockLeaseSubscriptionService
				},
				{
					provide: SignatureValidationHelper,
					useValue: mockSignatureValidationHelper
				},
				{ provide: LeasePdfHelper, useValue: mockLeasePdfHelper },
				{
					provide: SignatureNotificationHelper,
					useValue: mockSignatureNotificationHelper
				},
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

	/**
	 * Property 11: DocuSeal submission creation
	 * For any draft lease sent for signature with DocuSeal enabled,
	 * a DocuSeal submission must be created and the lease must be updated
	 * with status 'pending_signature' and the docuseal_submission_id.
	 *
	 * **Feature: lease-creation-wizard, Property 11: DocuSeal submission creation**
	 * **Validates: Requirements 6.2, 6.3**
	 */
	it('should create DocuSeal submission and update lease status for any valid draft lease', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate valid lease data
				fc.record({
					leaseId: fc.uuid(),
					ownerUserId: fc.uuid(),
					propertyOwnerId: fc.uuid(),
					tenantId: fc.uuid(),
					tenantUserId: fc.uuid(),
					rentAmount: fc.integer({ min: 50000, max: 1000000 }), // $500 - $10,000 in cents
					propertyAddress: fc.string({ minLength: 10, maxLength: 100 }),
					docusealSubmissionId: fc.string({ minLength: 10, maxLength: 50 })
				}),
				async ({
					leaseId,
					ownerUserId,
					tenantId,
					docusealSubmissionId
				}) => {
					// Setup mock to return the draft lease
					const mockLease = {
						id: leaseId,
						owner_user_id: ownerUserId,
						primary_tenant_id: tenantId,
						lease_status: 'draft'
					}

					const leaseChain = createMockChain(mockLease)
					;(mockSupabaseService.getAdminClient as jest.Mock).mockReturnValue({
						from: jest.fn((table: string) => {
							if (table === 'leases') {
								return leaseChain
							}
							return createMockChain()
						})
					})

					// Update LeasePdfHelper mock to return specific submission ID
					mockLeasePdfHelper.preparePdfAndSubmission.mockResolvedValue({
						pdfUrl: 'https://storage.example.com/lease.pdf',
						docusealSubmissionId
					})

					// Call the service method
					await service.sendForSignature(ownerUserId, leaseId, {
						message: 'Please sign',
						token: 'test-jwt-token'
					})

					// PROPERTY: Lease must be updated with pending_signature status
					expect(capturedLeaseUpdate).toBeDefined()
					expect(capturedLeaseUpdate?.lease_status).toBe('pending_signature')

					// PROPERTY: DocuSeal submission ID must be stored
					expect(capturedLeaseUpdate?.docuseal_submission_id).toBe(
						docusealSubmissionId
					)

					// PROPERTY: sent_for_signature_at timestamp must be set
					expect(capturedLeaseUpdate?.sent_for_signature_at).toBeDefined()
					const sentAt = new Date(
						capturedLeaseUpdate?.sent_for_signature_at as string
					)
					expect(sentAt.getTime()).toBeGreaterThan(Date.now() - 5000)
					expect(sentAt.getTime()).toBeLessThanOrEqual(Date.now())

					// PROPERTY: LeasePdfHelper should be called with correct parameters
					expect(
						mockLeasePdfHelper.preparePdfAndSubmission
					).toHaveBeenCalledWith(
						expect.objectContaining({
							leaseId,
							ownerId: ownerUserId,
							options: expect.objectContaining({
								message: 'Please sign',
								token: 'test-jwt-token'
							})
						})
					)

					// PROPERTY: Notification should be emitted
					expect(
						mockSignatureNotificationHelper.emitLeaseSentForSignature
					).toHaveBeenCalledWith(
						expect.objectContaining({
							leaseId,
							tenantId,
							docusealSubmissionId,
							pdfUrl: 'https://storage.example.com/lease.pdf'
						})
					)
				}
			),
			{ numRuns: 10 } // Reduce runs for faster tests
		)
	})

	/**
	 * Property 11b: Non-draft leases should be rejected
	 */
	it('should call validation helper to ensure lease is in draft status', async () => {
		const leaseId = 'test-lease-id'
		const ownerUserId = 'owner-user-id'

		const mockLease = {
			id: leaseId,
			owner_user_id: ownerUserId,
			primary_tenant_id: 'tenant-id',
			lease_status: 'active' // Not draft
		}

		const leaseChain = createMockChain(mockLease)
		;(mockSupabaseService.getAdminClient as jest.Mock).mockReturnValue({
			from: jest.fn(() => leaseChain)
		})

		await service.sendForSignature(ownerUserId, leaseId, {
			token: 'test-jwt-token'
		})

		// Validation helper should be called to check lease status
		expect(mockSignatureValidationHelper.ensureLeaseStatus).toHaveBeenCalled()
	})
})
