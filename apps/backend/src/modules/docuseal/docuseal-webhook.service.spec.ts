/**
 * TDD Tests for DocuSeal Webhook Service
 *
 * Handles business logic for DocuSeal signature events:
 * - Updates lease signature status when parties sign
 * - Triggers lease activation when both parties complete
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { DocuSealWebhookService } from './docuseal-webhook.service'
import { SupabaseService } from '../../database/supabase.service'

describe('DocuSealWebhookService', () => {
	let service: DocuSealWebhookService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockEventEmitter: jest.Mocked<Partial<EventEmitter2>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (resolveData: unknown = null, resolveError: unknown = null) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'gte', 'lte', 'order', 'maybeSingle']

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.single = jest.fn(() => Promise.resolve({
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

		mockEventEmitter = {
			emit: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DocuSealWebhookService,
				{ provide: Logger, useValue: mockLogger },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		service = module.get<DocuSealWebhookService>(DocuSealWebhookService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('handleFormCompleted', () => {
		it('should update owner_signed_at when owner signs', async () => {
			const submissionId = 456
			const leaseId = 'lease-uuid-123'
			let updateData: Record<string, unknown> | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							docuseal_submission_id: String(submissionId),
							owner_signed_at: null,
							tenant_signed_at: null
						})

						chain.update = jest.fn((data: Record<string, unknown>) => {
							updateData = data
							return chain
						})

						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.handleFormCompleted({
				id: 123,
				submission_id: submissionId,
				email: 'owner@example.com',
				role: 'Property Owner',
				completed_at: '2025-01-15T10:00:00Z',
				metadata: { lease_id: leaseId }
			})

			expect(updateData).toMatchObject({
				owner_signed_at: expect.any(String),
				owner_signature_ip: null,
				owner_signature_method: 'docuseal'
			})
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.owner_signed',
				expect.objectContaining({ lease_id: leaseId })
			)
		})

		it('should update tenant_signed_at when tenant signs', async () => {
			const submissionId = 456
			const leaseId = 'lease-uuid-123'
			let updateData: Record<string, unknown> | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							docuseal_submission_id: String(submissionId),
							owner_signed_at: null,
							tenant_signed_at: null
						})

						chain.update = jest.fn((data: Record<string, unknown>) => {
							updateData = data
							return chain
						})

						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.handleFormCompleted({
				id: 123,
				submission_id: submissionId,
				email: 'tenant@example.com',
				role: 'Tenant',
				completed_at: '2025-01-15T10:00:00Z',
				metadata: { lease_id: leaseId }
			})

			expect(updateData).toMatchObject({
				tenant_signed_at: expect.any(String),
				tenant_signature_ip: null,
				tenant_signature_method: 'docuseal'
			})
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.tenant_signed',
				expect.objectContaining({ lease_id: leaseId })
			)
		})

		it('should skip if lease not found by docuseal_submission_id', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(null)) // No lease found
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			// Should not throw, just skip processing
			await expect(
				service.handleFormCompleted({
					id: 123,
					submission_id: 999,
					email: 'unknown@example.com',
					role: 'Tenant',
					completed_at: '2025-01-15T10:00:00Z'
				})
			).resolves.toBeUndefined()

			// Verify no event was emitted since lease wasn't found
			expect(mockEventEmitter.emit).not.toHaveBeenCalled()
		})
	})

	describe('handleSubmissionCompleted', () => {
		it('should activate lease when all parties have signed', async () => {
			const submissionId = 456
			const leaseId = 'lease-uuid-123'

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							docuseal_submission_id: String(submissionId),
							lease_status: 'pending_signature',
							owner_signed_at: '2025-01-15T09:00:00Z',
							tenant_signed_at: '2025-01-15T10:00:00Z'
						})

						chain.update = jest.fn(() => chain)

						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.handleSubmissionCompleted({
				id: submissionId,
				status: 'completed',
				completed_at: '2025-01-15T10:00:00Z',
				submitters: [
					{ email: 'owner@example.com', role: 'Property Owner', completed_at: '2025-01-15T09:00:00Z' },
					{ email: 'tenant@example.com', role: 'Tenant', completed_at: '2025-01-15T10:00:00Z' }
				],
				documents: [
					{ name: 'lease-agreement.pdf', url: 'https://docuseal.example.com/download/123' }
				],
				metadata: { lease_id: leaseId }
			})

			// Note: Actual activation with Stripe happens via event handler
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'docuseal.submission_completed',
				expect.objectContaining({
					lease_id: leaseId,
					submission_id: submissionId
				})
			)
		})

		it('should include document URL in event', async () => {
			const submissionId = 456
			const leaseId = 'lease-uuid-123'

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						const chain = createMockChain({
							id: leaseId,
							docuseal_submission_id: String(submissionId),
							lease_status: 'pending_signature'
						})
						return chain
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.handleSubmissionCompleted({
				id: submissionId,
				status: 'completed',
				completed_at: '2025-01-15T10:00:00Z',
				submitters: [],
				documents: [
					{ name: 'lease-agreement.pdf', url: 'https://docuseal.example.com/download/123' }
				],
				metadata: { lease_id: leaseId }
			})

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'docuseal.submission_completed',
				expect.objectContaining({
					document_url: 'https://docuseal.example.com/download/123'
				})
			)
		})
	})
})
