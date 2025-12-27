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
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LeaseSignatureService } from '../../src/modules/leases/lease-signature.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { DocuSealService } from '../../src/modules/docuseal/docuseal.service'
import { LeaseSubscriptionService } from '../../src/modules/leases/lease-subscription.service'
import { LeasesService } from '../../src/modules/leases/leases.service'
import { LeasePdfMapperService } from '../../src/modules/pdf/lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from '../../src/modules/pdf/lease-pdf-generator.service'
import { PdfStorageService } from '../../src/modules/pdf/pdf-storage.service'
import { SilentLogger } from '../../src/__test__/silent-logger'
import { AppLogger } from '../../src/logger/app-logger.service'
import { SseService } from '../../src/modules/notifications/sse/sse.service'

describe('Property 11: DocuSeal Submission Creation', () => {
	let service: LeaseSignatureService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>
	let mockDocuSealService: jest.Mocked<Partial<DocuSealService>>
	let mockLeaseSubscriptionService: jest.Mocked<
		Partial<LeaseSubscriptionService>
	>
	let mockLeasesService: jest.Mocked<LeasesService>
	let mockPdfMapper: jest.Mocked<LeasePdfMapperService>
	let mockPdfGenerator: jest.Mocked<LeasePdfGeneratorService>
	let mockPdfStorage: jest.Mocked<PdfStorageService>

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

		mockEventEmitter = {
			emit: jest.fn()
		}

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

		mockLeasesService = {
			findOne: jest.fn(),
			getLeaseDataForPdf: jest.fn().mockResolvedValue({
				id: 'lease-123',
				rent_amount: 150000,
				unit: { unit_number: '101' },
				property: { name: 'Test Property' },
				tenant: {
					user: {
						id: 'tenant-user-id',
						first_name: 'Test',
						last_name: 'Tenant',
						email: 'tenant@example.com'
					}
				},
				property_owner: {
					user: {
						id: 'owner-user-id',
						first_name: 'Property',
						last_name: 'Owner',
						email: 'owner@example.com'
					}
				}
			})
		}

		mockPdfMapper = {
			mapToPdfData: jest.fn(),
			mapLeaseToPdfFields: jest.fn().mockReturnValue({
				fields: {},
				missing: { isComplete: true, fields: [] }
			}),
			mergeMissingFields: jest.fn((autoFilled, manual) => ({ ...autoFilled, ...manual })),
			validateMissingFields: jest.fn().mockReturnValue({ isValid: true, errors: [] })
		}

		mockPdfGenerator = {
			generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
			generateFilledPdf: jest.fn().mockResolvedValue(Buffer.from('filled-pdf-content'))
		}

		mockPdfStorage = {
		uploadPdf: jest.fn().mockResolvedValue('https://storage.example.com/lease.pdf'),
		getSignedUrl: jest.fn().mockResolvedValue('https://storage.example.com/lease.pdf?signed=true'),
		uploadLeasePdf: jest.fn().mockResolvedValue({
			publicUrl: 'https://storage.example.com/lease.pdf',
			path: 'leases/test-lease.pdf'
		})
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
				LeaseSignatureService,
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: DocuSealService, useValue: mockDocuSealService },
				{
					provide: LeaseSubscriptionService,
					useValue: mockLeaseSubscriptionService
				},
				{ provide: LeasesService, useValue: mockLeasesService },
				{ provide: LeasePdfMapperService, useValue: mockPdfMapper },
				{ provide: LeasePdfGeneratorService, useValue: mockPdfGenerator },
				{ provide: PdfStorageService, useValue: mockPdfStorage },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				},
				{
					provide: SseService,
					useValue: { broadcast: jest.fn().mockResolvedValue(undefined) }
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
					propertyAddress: fc
						.string({ minLength: 5, maxLength: 100 })
						.filter(s => s.trim().length >= 5),
					unitNumber: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
					ownerEmail: fc.emailAddress(),
					ownerFirstName: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(s => s.trim().length > 0),
					ownerLastName: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(s => s.trim().length > 0),
					tenantEmail: fc.emailAddress(),
					tenantFirstName: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(s => s.trim().length > 0),
					tenantLastName: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(s => s.trim().length > 0),
					templateId: fc.integer({ min: 1, max: 10000 }),
					docusealSubmissionId: fc.integer({ min: 1, max: 999999 })
				}),
				async leaseData => {
					// Reset captured update for each test run
					capturedLeaseUpdate = null

					// Mock DocuSeal to return a submission with the generated ID
				mockDocuSealService.createSubmissionFromPdf = jest
					.fn()
					.mockResolvedValue({
						id: leaseData.docusealSubmissionId,
						status: 'pending',
						submitters: []
					})

					// Track user query count to return different data for owner vs tenant
					let userQueryCount = 0

					// Setup Supabase mock with the generated lease data
					mockSupabaseService.getAdminClient = jest.fn(() => ({
						from: jest.fn((table: string) => {
							if (table === 'leases') {
								const chain = createMockChain({
									id: leaseData.leaseId,
									lease_status: 'draft', // Must be draft for sendForSignature
									owner_user_id: leaseData.ownerUserId,
									primary_tenant_id: leaseData.tenantId,
									rent_amount: leaseData.rentAmount,
									start_date: '2025-01-01',
									end_date: '2026-01-01',
									property_owner: { user_id: leaseData.ownerUserId },
									unit: {
										unit_number: leaseData.unitNumber ?? undefined,
										property: {
											name: 'Test Property',
											address: leaseData.propertyAddress
										}
									}
								})
								return chain
							}
							if (table === 'stripe_connected_accounts') {
								return createMockChain({
									id: leaseData.propertyOwnerId,
									user_id: leaseData.ownerUserId
								})
							}
							if (table === 'tenants') {
								return createMockChain({
									id: leaseData.tenantId,
									user_id: leaseData.tenantUserId
								})
							}
							if (table === 'users') {
								userQueryCount++
								// First query is for owner, second is for tenant
								if (userQueryCount === 1) {
									return createMockChain({
										email: leaseData.ownerEmail,
										first_name: leaseData.ownerFirstName,
										last_name: leaseData.ownerLastName
									})
								}
								return createMockChain({
									email: leaseData.tenantEmail,
									first_name: leaseData.tenantFirstName,
									last_name: leaseData.tenantLastName
								})
							}
							return createMockChain()
						})
					})) as unknown as jest.MockedFunction<
						() => ReturnType<SupabaseService['getAdminClient']>
					>

					// Execute sendForSignature with DocuSeal template
					await service.sendForSignature(
						leaseData.ownerUserId,
						leaseData.leaseId,
						{ templateId: leaseData.templateId, token: 'mock-jwt-token' }
					)

					// PROPERTY ASSERTIONS:

					// 1. DocuSeal submission must be created from PDF (Requirement 6.2)
				expect(
					mockDocuSealService.createSubmissionFromPdf
				).toHaveBeenCalledTimes(1)
				expect(
					mockDocuSealService.createSubmissionFromPdf
				).toHaveBeenCalledWith(
					expect.objectContaining({
						leaseId: leaseData.leaseId,
						pdfUrl: expect.stringContaining('storage.example.com'),
						ownerEmail: leaseData.ownerEmail,
						tenantEmail: leaseData.tenantEmail
					})
				)

					// 2. Lease status must be updated to 'pending_signature' (Requirement 6.3)
					expect(capturedLeaseUpdate).not.toBeNull()
					expect(capturedLeaseUpdate?.lease_status).toBe('pending_signature')

					// 3. docuseal_submission_id must be stored on the lease (Requirement 6.3)
					expect(capturedLeaseUpdate?.docuseal_submission_id).toBe(
						String(leaseData.docusealSubmissionId)
					)

					// 4. sent_for_signature_at timestamp must be set
					expect(capturedLeaseUpdate?.sent_for_signature_at).toBeDefined()
					expect(typeof capturedLeaseUpdate?.sent_for_signature_at).toBe(
						'string'
					)

					// 5. Event must be emitted for notification service
					expect(mockEventEmitter.emit).toHaveBeenCalledWith(
						'lease.sent_for_signature',
						expect.objectContaining({
							lease_id: leaseData.leaseId,
							tenant_id: leaseData.tenantId,
							docuseal_submission_id: String(leaseData.docusealSubmissionId)
						})
					)
				}
			),
			{ numRuns: 50 } // Run 50 iterations with different generated data
		)
	})

	/**
	 * Property: DocuSeal failure should not update lease status
	 * For any draft lease where DocuSeal submission fails,
	 * the lease should still transition to pending_signature but without docuseal_submission_id.
	 *
	 * This tests the graceful degradation behavior.
	 */
	it('should gracefully handle DocuSeal failure and still update lease status', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					leaseId: fc.uuid(),
					ownerUserId: fc.uuid(),
					propertyOwnerId: fc.uuid(),
					tenantId: fc.uuid(),
					tenantUserId: fc.uuid(),
					templateId: fc.integer({ min: 1, max: 10000 }),
					ownerEmail: fc.emailAddress(),
					tenantEmail: fc.emailAddress()
				}),
				async leaseData => {
					capturedLeaseUpdate = null

					// Mock DocuSeal to throw an error
					mockDocuSealService.createLeaseSubmission = jest
						.fn()
						.mockRejectedValue(
							new Error('DocuSeal API error: 500 Internal Server Error')
						)

					let userQueryCount = 0

					mockSupabaseService.getAdminClient = jest.fn(() => ({
						from: jest.fn((table: string) => {
							if (table === 'leases') {
								return createMockChain({
									id: leaseData.leaseId,
									lease_status: 'draft',
									owner_user_id: leaseData.ownerUserId,
									primary_tenant_id: leaseData.tenantId,
									rent_amount: 150000,
									start_date: '2025-01-01',
									end_date: '2026-01-01',
									property_owner: { user_id: leaseData.ownerUserId },
									unit: {
										unit_number: '101',
										property: { name: 'Test', address: '123 Test St' }
									}
								})
							}
							if (table === 'stripe_connected_accounts') {
								return createMockChain({
									id: leaseData.propertyOwnerId,
									user_id: leaseData.ownerUserId
								})
							}
							if (table === 'tenants') {
								return createMockChain({
									id: leaseData.tenantId,
									user_id: leaseData.tenantUserId
								})
							}
							if (table === 'users') {
								userQueryCount++
								if (userQueryCount === 1) {
									return createMockChain({
										email: leaseData.ownerEmail,
										first_name: 'Owner',
										last_name: 'Test'
									})
								}
								return createMockChain({
									email: leaseData.tenantEmail,
									first_name: 'Tenant',
									last_name: 'Test'
								})
							}
							return createMockChain()
						})
					})) as unknown as jest.MockedFunction<
						() => ReturnType<SupabaseService['getAdminClient']>
					>

					// Execute - should not throw despite DocuSeal failure
					await service.sendForSignature(
						leaseData.ownerUserId,
						leaseData.leaseId,
						{ templateId: leaseData.templateId, token: 'mock-jwt-token' }
					)

					// PROPERTY ASSERTIONS:

					// 1. Lease status should still be updated to pending_signature
					expect(capturedLeaseUpdate).not.toBeNull()
					expect(capturedLeaseUpdate?.lease_status).toBe('pending_signature')

					// 2. docuseal_submission_id should NOT be set (DocuSeal failed)
					expect(capturedLeaseUpdate?.docuseal_submission_id).toBeUndefined()

					// 3. sent_for_signature_at should still be set
					expect(capturedLeaseUpdate?.sent_for_signature_at).toBeDefined()
				}
			),
			{ numRuns: 20 }
		)
	})
})
