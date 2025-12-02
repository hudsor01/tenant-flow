/**
 * TDD Tests for DocuSeal Webhook Service
 *
 * Handles business logic for DocuSeal signature events:
 * - Emits events when parties sign (via metadata.lease_id)
 * - Stores signed documents in documents table
 * - Triggers lease activation events when submission completes
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
		it('should emit lease.owner_signed event when owner signs', async () => {
			const leaseId = 'lease-uuid-123'

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature'
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.handleFormCompleted({
				id: 123,
				submission_id: 456,
				email: 'owner@example.com',
				role: 'Property Owner',
				completed_at: '2025-01-15T10:00:00Z',
				metadata: { lease_id: leaseId }
			})

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.owner_signed',
				expect.objectContaining({
					lease_id: leaseId,
					signed_at: '2025-01-15T10:00:00Z',
					email: 'owner@example.com',
					via: 'docuseal'
				})
			)
		})

		it('should emit lease.tenant_signed event when tenant signs', async () => {
			const leaseId = 'lease-uuid-123'

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature'
						})
					}
					return createMockChain()
				})
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await service.handleFormCompleted({
				id: 123,
				submission_id: 456,
				email: 'tenant@example.com',
				role: 'Tenant',
				completed_at: '2025-01-15T10:00:00Z',
				metadata: { lease_id: leaseId }
			})

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'lease.tenant_signed',
				expect.objectContaining({
					lease_id: leaseId,
					signed_at: '2025-01-15T10:00:00Z',
					email: 'tenant@example.com',
					via: 'docuseal'
				})
			)
		})

		it('should skip if no lease_id in metadata', async () => {
			await service.handleFormCompleted({
				id: 123,
				submission_id: 999,
				email: 'unknown@example.com',
				role: 'Tenant',
				completed_at: '2025-01-15T10:00:00Z'
				// No metadata with lease_id
			})

			// Verify no event was emitted since no lease_id
			expect(mockEventEmitter.emit).not.toHaveBeenCalled()
		})

		it('should skip if lease not found', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(null)) // No lease found
			})) as unknown as jest.MockedFunction<() => ReturnType<SupabaseService['getAdminClient']>>

			await expect(
				service.handleFormCompleted({
					id: 123,
					submission_id: 999,
					email: 'unknown@example.com',
					role: 'Tenant',
					completed_at: '2025-01-15T10:00:00Z',
					metadata: { lease_id: 'non-existent-lease' }
				})
			).resolves.toBeUndefined()

			expect(mockEventEmitter.emit).not.toHaveBeenCalled()
		})
	})

	describe('handleSubmissionCompleted', () => {
		it('should emit docuseal.submission_completed event when all parties have signed', async () => {
			const submissionId = 456
			const leaseId = 'lease-uuid-123'

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature'
						})
					}
					if (table === 'documents') {
						const chain = createMockChain()
						chain.insert = jest.fn(() => Promise.resolve({ error: null }))
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
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature'
						})
					}
					if (table === 'documents') {
						const chain = createMockChain()
						chain.insert = jest.fn(() => Promise.resolve({ error: null }))
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

		it('should skip if no lease_id in metadata', async () => {
			await service.handleSubmissionCompleted({
				id: 456,
				status: 'completed',
				completed_at: '2025-01-15T10:00:00Z',
				submitters: [],
				documents: []
				// No metadata with lease_id
			})

			expect(mockEventEmitter.emit).not.toHaveBeenCalled()
		})

		it('should store signed document in documents table', async () => {
			const submissionId = 456
			const leaseId = 'lease-uuid-123'
			let insertedDocument: Record<string, unknown> | null = null

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					if (table === 'leases') {
						return createMockChain({
							id: leaseId,
							lease_status: 'pending_signature'
						})
					}
					if (table === 'documents') {
						const chain = createMockChain()
						chain.insert = jest.fn((data: Record<string, unknown>) => {
							insertedDocument = data
							return Promise.resolve({ error: null })
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

			expect(insertedDocument).toMatchObject({
				entity_type: 'lease',
				entity_id: leaseId,
				document_type: 'signed_lease',
				storage_url: 'https://docuseal.example.com/download/123'
			})
		})
	})
})
