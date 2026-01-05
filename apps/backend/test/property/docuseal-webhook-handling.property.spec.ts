/**
 * Property Tests for DocuSeal Webhook Handling
 * Feature: lease-creation-wizard
 *
 * Property 12: Owner signature webhook handling
 * Property 13: Tenant signature webhook handling
 * Property 14: Lease activation on both signatures
 *
 * Validates: Requirements 7.3, 7.4, 8.3, 8.4
 *
 * These tests verify the business logic for DocuSeal signature webhooks:
 * - form.completed: Updates correct timestamp when owner/tenant signs
 * - submission.completed: Emits activation event when all parties complete
 */

import * as fc from 'fast-check'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { DocuSealWebhookService } from '../../src/modules/docuseal/docuseal-webhook.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { SilentLogger } from '../../src/__tests__/silent-logger'
import { AppLogger } from '../../src/logger/app-logger.service'
import { SseService } from '../../src/modules/notifications/sse/sse.service'

describe('DocuSeal Webhook Handling Property Tests', () => {
	let service: DocuSealWebhookService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>

	// Track emitted events
	let emittedEvents: Array<{ event: string; payload: unknown }> = []

	// Track database updates
	let capturedLeaseUpdate: Record<string, unknown> | null = null

	// Helper to create a flexible Supabase query chain
	const createMockChain = (
		resolveData: unknown = null,
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
			'order'
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

	beforeEach(async () => {
		emittedEvents = []
		capturedLeaseUpdate = null

		mockEventEmitter = {
			emit: jest.fn((event: string, payload: unknown) => {
				emittedEvents.push({ event, payload })
				return true
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
				DocuSealWebhookService,
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: SupabaseService, useValue: mockSupabaseService },
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

		service = module.get<DocuSealWebhookService>(DocuSealWebhookService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	/**
	 * Property 12: Owner signature webhook handling
	 * For any valid form.completed webhook with owner role,
	 * the owner_signed_at timestamp must be updated and lease.owner_signed event emitted.
	 *
	 * **Feature: lease-creation-wizard, Property 12: Owner signature webhook handling**
	 * **Validates: Requirements 7.3, 7.4**
	 */
	describe('Property 12: Owner signature webhook handling', () => {
		it('should update owner_signed_at for any valid owner signature webhook', async () => {
			await fc.assert(
				fc.asyncProperty(
					// Generate valid owner signature webhook data
					fc.record({
						submitterId: fc.integer({ min: 1, max: 999999 }),
						submissionId: fc.integer({ min: 1, max: 999999 }),
						leaseId: fc.uuid(),
						ownerEmail: fc.emailAddress(),
						completedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2026-12-31')
						}),
						// Various owner role formats DocuSeal might use
						ownerRole: fc.constantFrom(
							'Property Owner',
							'Co-Owner',
							'Owner',
							'property owner',
							'OWNER'
						)
					}),
					async webhookData => {
						// Reset tracking
						emittedEvents = []
						capturedLeaseUpdate = null

						// Setup mock to return lease found by submission ID
						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn((table: string) => {
								if (table === 'leases') {
									const chain = createMockChain({
										id: webhookData.leaseId,
										lease_status: 'pending_signature',
										owner_signed_at: null, // Not yet signed
										tenant_signed_at: null
									})
									return chain
								}
								return createMockChain()
							})
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						// Execute webhook handler
						await service.handleFormCompleted({
							id: webhookData.submitterId,
							submission_id: webhookData.submissionId,
							email: webhookData.ownerEmail,
							role: webhookData.ownerRole,
							completed_at: webhookData.completedAt.toISOString()
						})

						// PROPERTY ASSERTIONS:

						// 1. owner_signed_at must be updated
						expect(capturedLeaseUpdate).not.toBeNull()
						expect(capturedLeaseUpdate?.owner_signed_at).toBeDefined()
						expect(typeof capturedLeaseUpdate?.owner_signed_at).toBe('string')

						// 2. Signature method must be 'docuseal'
						expect(capturedLeaseUpdate?.owner_signature_method).toBe('docuseal')

						// 3. lease.owner_signed event must be emitted
						const ownerSignedEvent = emittedEvents.find(
							e => e.event === 'lease.owner_signed'
						)
						expect(ownerSignedEvent).toBeDefined()
						expect(ownerSignedEvent?.payload).toMatchObject({
							lease_id: webhookData.leaseId,
							via: 'docuseal'
						})
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should NOT update owner_signed_at if already signed', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record({
						submitterId: fc.integer({ min: 1, max: 999999 }),
						submissionId: fc.integer({ min: 1, max: 999999 }),
						leaseId: fc.uuid(),
						ownerEmail: fc.emailAddress(),
						existingSignedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2025-06-01')
						}),
						newCompletedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2025-06-02'),
							max: new Date('2026-12-31')
						})
					}),
					async webhookData => {
						emittedEvents = []
						capturedLeaseUpdate = null

						// Setup mock with owner already signed
						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn((table: string) => {
								if (table === 'leases') {
									return createMockChain({
										id: webhookData.leaseId,
										lease_status: 'pending_signature',
										owner_signed_at: webhookData.existingSignedAt.toISOString(), // Already signed
										tenant_signed_at: null
									})
								}
								return createMockChain()
							})
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						await service.handleFormCompleted({
							id: webhookData.submitterId,
							submission_id: webhookData.submissionId,
							email: webhookData.ownerEmail,
							role: 'Property Owner',
							completed_at: webhookData.newCompletedAt.toISOString()
						})

						// PROPERTY ASSERTION: No update should occur if already signed
						expect(capturedLeaseUpdate).toBeNull()
						expect(emittedEvents).toHaveLength(0)
					}
				),
				{ numRuns: 25 }
			)
		})
	})

	/**
	 * Property 13: Tenant signature webhook handling
	 * For any valid form.completed webhook with tenant role,
	 * the tenant_signed_at timestamp must be updated and lease.tenant_signed event emitted.
	 *
	 * **Feature: lease-creation-wizard, Property 13: Tenant signature webhook handling**
	 * **Validates: Requirements 8.3, 8.4**
	 */
	describe('Property 13: Tenant signature webhook handling', () => {
		it('should update tenant_signed_at for any valid tenant signature webhook', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record({
						submitterId: fc.integer({ min: 1, max: 999999 }),
						submissionId: fc.integer({ min: 1, max: 999999 }),
						leaseId: fc.uuid(),
						tenantEmail: fc.emailAddress(),
						completedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2026-12-31')
						}),
						// Various tenant role formats DocuSeal might use
						tenantRole: fc.constantFrom(
							'Tenant',
							'Sub-Tenant',
							'tenant',
							'TENANT'
						)
					}),
					async webhookData => {
						emittedEvents = []
						capturedLeaseUpdate = null

						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn((table: string) => {
								if (table === 'leases') {
									return createMockChain({
										id: webhookData.leaseId,
										lease_status: 'pending_signature',
										owner_signed_at: null,
										tenant_signed_at: null // Not yet signed
									})
								}
								return createMockChain()
							})
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						await service.handleFormCompleted({
							id: webhookData.submitterId,
							submission_id: webhookData.submissionId,
							email: webhookData.tenantEmail,
							role: webhookData.tenantRole,
							completed_at: webhookData.completedAt.toISOString()
						})

						// PROPERTY ASSERTIONS:

						// 1. tenant_signed_at must be updated
						expect(capturedLeaseUpdate).not.toBeNull()
						expect(capturedLeaseUpdate?.tenant_signed_at).toBeDefined()
						expect(typeof capturedLeaseUpdate?.tenant_signed_at).toBe('string')

						// 2. Signature method must be 'docuseal'
						expect(capturedLeaseUpdate?.tenant_signature_method).toBe(
							'docuseal'
						)

						// 3. lease.tenant_signed event must be emitted
						const tenantSignedEvent = emittedEvents.find(
							e => e.event === 'lease.tenant_signed'
						)
						expect(tenantSignedEvent).toBeDefined()
						expect(tenantSignedEvent?.payload).toMatchObject({
							lease_id: webhookData.leaseId,
							via: 'docuseal'
						})
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should NOT update tenant_signed_at if already signed', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record({
						submitterId: fc.integer({ min: 1, max: 999999 }),
						submissionId: fc.integer({ min: 1, max: 999999 }),
						leaseId: fc.uuid(),
						tenantEmail: fc.emailAddress(),
						existingSignedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2025-06-01')
						})
					}),
					async webhookData => {
						emittedEvents = []
						capturedLeaseUpdate = null

						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn((table: string) => {
								if (table === 'leases') {
									return createMockChain({
										id: webhookData.leaseId,
										lease_status: 'pending_signature',
										owner_signed_at: null,
										tenant_signed_at: webhookData.existingSignedAt.toISOString() // Already signed
									})
								}
								return createMockChain()
							})
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						await service.handleFormCompleted({
							id: webhookData.submitterId,
							submission_id: webhookData.submissionId,
							email: webhookData.tenantEmail,
							role: 'Tenant',
							completed_at: new Date().toISOString()
						})

						// PROPERTY ASSERTION: No update should occur if already signed
						expect(capturedLeaseUpdate).toBeNull()
						expect(emittedEvents).toHaveLength(0)
					}
				),
				{ numRuns: 25 }
			)
		})
	})

	/**
	 * Property 14: Lease activation on both signatures
	 * For any submission.completed webhook where both parties have signed,
	 * the docuseal.submission_completed event must be emitted with document URL.
	 *
	 * Note: Actual lease activation to 'active' status happens via an event listener
	 * that processes this event and calls LeaseSubscriptionService.activateLease().
	 *
	 * **Feature: lease-creation-wizard, Property 14: Lease activation on both signatures**
	 * **Validates: Requirements 7.3, 7.4, 8.3, 8.4**
	 */
	describe('Property 14: Lease activation on both signatures', () => {
		it('should emit docuseal.submission_completed for any valid completed submission', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record({
						submissionId: fc.integer({ min: 1, max: 999999 }),
						leaseId: fc.uuid(),
						ownerEmail: fc.emailAddress(),
						tenantEmail: fc.emailAddress(),
						ownerCompletedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2025-06-01')
						}),
						tenantCompletedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2025-06-02'),
							max: new Date('2026-12-31')
						}),
						documentUrl: fc.webUrl()
					}),
					async webhookData => {
						emittedEvents = []

						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn((table: string) => {
								if (table === 'leases') {
									return createMockChain({
										id: webhookData.leaseId,
										lease_status: 'pending_signature'
									})
								}
								return createMockChain()
							})
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						await service.handleSubmissionCompleted({
							id: webhookData.submissionId,
							status: 'completed',
							completed_at: webhookData.tenantCompletedAt.toISOString(),
							submitters: [
								{
									email: webhookData.ownerEmail,
									role: 'Property Owner',
									completed_at: webhookData.ownerCompletedAt.toISOString()
								},
								{
									email: webhookData.tenantEmail,
									role: 'Tenant',
									completed_at: webhookData.tenantCompletedAt.toISOString()
								}
							],
							documents: [
								{
									name: 'lease-agreement.pdf',
									url: webhookData.documentUrl
								}
							],
							metadata: { lease_id: webhookData.leaseId }
						})

						// PROPERTY ASSERTIONS:

						// 1. docuseal.submission_completed event must be emitted
						const completedEvent = emittedEvents.find(
							e => e.event === 'docuseal.submission_completed'
						)
						expect(completedEvent).toBeDefined()

						// 2. Event must contain lease_id and submission_id
						expect(completedEvent?.payload).toMatchObject({
							lease_id: webhookData.leaseId,
							submission_id: webhookData.submissionId
						})

						// 3. Event must contain document URL for signed document storage
						expect(
							(completedEvent?.payload as Record<string, unknown>)?.document_url
						).toBe(webhookData.documentUrl)
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should emit event even without document URL', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record({
						submissionId: fc.integer({ min: 1, max: 999999 }),
						leaseId: fc.uuid(),
						completedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2026-12-31')
						})
					}),
					async webhookData => {
						emittedEvents = []

						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn((table: string) => {
								if (table === 'leases') {
									return createMockChain({
										id: webhookData.leaseId,
										lease_status: 'pending_signature'
									})
								}
								return createMockChain()
							})
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						await service.handleSubmissionCompleted({
							id: webhookData.submissionId,
							status: 'completed',
							completed_at: webhookData.completedAt.toISOString(),
							submitters: [{ email: 'test@example.com', role: 'Owner' }],
							documents: [] // No documents
						})

						// PROPERTY ASSERTION: Event should still be emitted without document
						const completedEvent = emittedEvents.find(
							e => e.event === 'docuseal.submission_completed'
						)
						expect(completedEvent).toBeDefined()
						expect(
							(completedEvent?.payload as Record<string, unknown>)?.document_url
						).toBeUndefined()
					}
				),
				{ numRuns: 25 }
			)
		})

		it('should NOT emit event if lease not found', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record({
						submissionId: fc.integer({ min: 1, max: 999999 }),
						completedAt: fc.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2026-12-31')
						})
					}),
					async webhookData => {
						emittedEvents = []

						// Mock returning no lease
						mockSupabaseService.getAdminClient = jest.fn(() => ({
							from: jest.fn(() => createMockChain(null)) // No lease found
						})) as unknown as jest.MockedFunction<
							() => ReturnType<SupabaseService['getAdminClient']>
						>

						await service.handleSubmissionCompleted({
							id: webhookData.submissionId,
							status: 'completed',
							completed_at: webhookData.completedAt.toISOString(),
							submitters: [{ email: 'test@example.com', role: 'Owner' }],
							documents: []
						})

						// PROPERTY ASSERTION: No event emitted for unknown submission
						expect(emittedEvents).toHaveLength(0)
					}
				),
				{ numRuns: 25 }
			)
		})
	})
})
