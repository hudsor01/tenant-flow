/**
 * Webhook Service Tests
 *
 * Comprehensive test coverage for webhook service:
 * - Idempotency: Database-backed event tracking
 * - Race conditions: INSERT-based locking (SECURITY FIX #5)
 * - Event lifecycle: Processing, completion
 *
 * Related test files:
 * - stripe-event-cleanup.service.spec.ts: Cleanup and cron tests
 * - stripe-event-statistics.service.spec.ts: Statistics and batch tests
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { WebhookService } from './webhook.service'
import { SupabaseService } from '../../../database/supabase.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('WebhookService', () => {
	let service: WebhookService
	let supabase: jest.Mocked<SupabaseService>

	// Mock Supabase client with chainable methods
	const createMockSupabaseClient = () => ({
		from: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		lt: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		single: jest.fn().mockReturnThis(),
		rpc: jest.fn().mockResolvedValue({
			data: [{ lock_acquired: true }],
			error: null
		})
	})

	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>

	beforeEach(async () => {
		mockSupabaseClient = createMockSupabaseClient()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				WebhookService,
				{
					provide: SupabaseService,
					useValue: {
						getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
					}
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		// Suppress logger output in tests
		module.useLogger(false)

		service = module.get<WebhookService>(WebhookService)
		supabase = module.get(SupabaseService) as jest.Mocked<SupabaseService>
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('isEventProcessed', () => {
		it('should return true if event exists in database', async () => {
			const eventId = 'evt_test_processed'

			mockSupabaseClient.single.mockResolvedValue({
				data: { id: 'record_123' },
				error: null
			})

			const result = await service.isEventProcessed(eventId)

			expect(result).toBe(true)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('webhook_events')
			expect(mockSupabaseClient.select).toHaveBeenCalledWith('id')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('external_id', eventId)
		})

		it('should return false if event does not exist', async () => {
			const eventId = 'evt_test_new'

			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116', message: 'No rows returned' }
			})

			const result = await service.isEventProcessed(eventId)

			expect(result).toBe(false)
		})

		it('should return false on database errors (fail-open)', async () => {
			const eventId = 'evt_test_error'

			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { code: 'PGRST500', message: 'Database unavailable' }
			})

			const result = await service.isEventProcessed(eventId)

			// Should fail-open to prevent blocking webhooks
			expect(result).toBe(false)
		})

		it('should handle exceptions gracefully', async () => {
			const eventId = 'evt_test_exception'

			mockSupabaseClient.single.mockRejectedValue(
				new Error('Connection timeout')
			)

			const result = await service.isEventProcessed(eventId)

			// Should fail-open
			expect(result).toBe(false)
		})
	})

	describe('recordEventProcessing', () => {
		it('should acquire lock using RPC', async () => {
			const eventId = 'evt_record_rpc'
			const eventType = 'payment_intent.succeeded'

			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: true }],
				error: null
			})

			const result = await service.recordEventProcessing(eventId, eventType, {
				sample: true
			})

			expect(result).toBe(true)
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				'acquire_webhook_event_lock_with_id',
				expect.objectContaining({
					p_external_id: eventId,
					p_event_type: eventType,
					p_webhook_source: 'stripe',
					p_raw_payload: { sample: true }
				})
			)
		})

		it('should return false when lock already held', async () => {
			const eventId = 'evt_record_taken'
			const eventType = 'payment_intent.succeeded'

			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: false }],
				error: null
			})

			const result = await service.recordEventProcessing(eventId, eventType)

			expect(result).toBe(false)
		})

		it('should throw when RPC fails', async () => {
			const eventId = 'evt_record_rpc_error'
			const eventType = 'payment_intent.succeeded'
			const rpcError = { code: 'PGRST500', message: 'Database unavailable' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: true }],
				error: rpcError
			})

			await expect(
				service.recordEventProcessing(eventId, eventType)
			).rejects.toBe(rpcError)
		})

		it('should send correct parameters to RPC', async () => {
			const eventId = 'evt_record_params'
			const eventType = 'payment_intent.succeeded'
			const rawPayload = { test: 'data' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: true }],
				error: null
			})

			await service.recordEventProcessing(eventId, eventType, rawPayload)

			// Verify RPC function name and parameters
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				'acquire_webhook_event_lock_with_id',
				{
					p_webhook_source: 'stripe',
					p_external_id: eventId,
					p_event_type: eventType,
					p_raw_payload: rawPayload
				}
			)
		})

		it('should treat missing RPC rows as lock failures', async () => {
			const eventId = 'evt_record_missing'
			const eventType = 'payment_intent.succeeded'

			mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null })

			const result = await service.recordEventProcessing(eventId, eventType)

			expect(result).toBe(false)
		})
	})

	describe('markEventProcessed', () => {
		it('should update event status to processed', async () => {
			const eventId = 'evt_test_mark_processed'

			// Service calls: .from().update().eq('webhook_source', ...).eq('external_id', ...)
			// First .eq() returns mock to continue chain, second .eq() returns result
			mockSupabaseClient.eq
				.mockReturnValueOnce(mockSupabaseClient) // First .eq() - continue chain
				.mockResolvedValueOnce({ error: null }) // Second .eq() - return success

			await service.markEventProcessed(eventId)

			expect(mockSupabaseClient.update).toHaveBeenCalledWith({
				processed_at: expect.any(String),
				status: 'processed'
			})
			expect(mockSupabaseClient.eq).toHaveBeenNthCalledWith(
				1,
				'webhook_source',
				'stripe'
			)
			expect(mockSupabaseClient.eq).toHaveBeenNthCalledWith(
				2,
				'external_id',
				eventId
			)
		})

		it('should update processed_at timestamp', async () => {
			const eventId = 'evt_test_timestamp_update'

			// Service calls: .from().update().eq('webhook_source', ...).eq('external_id', ...)
			// First .eq() returns mock to continue chain, second .eq() returns result
			mockSupabaseClient.eq
				.mockReturnValueOnce(mockSupabaseClient) // First .eq() - continue chain
				.mockResolvedValueOnce({ error: null }) // Second .eq() - return success

			const beforeTime = Date.now()
			await service.markEventProcessed(eventId)
			const afterTime = Date.now()

			const updateCall = (mockSupabaseClient.update as jest.Mock).mock
				.calls[0][0]
			const timestamp = updateCall.processed_at

			// Timestamp should be valid ISO string within time range
			const timestampMs = new Date(timestamp).getTime()
			expect(timestampMs).toBeGreaterThanOrEqual(beforeTime)
			expect(timestampMs).toBeLessThanOrEqual(afterTime)
		})

		it('should throw error if database update fails', async () => {
			const eventId = 'evt_test_update_fail'

			// Service calls: .from().update().eq('webhook_source', ...).eq('external_id', ...)
			// First .eq() returns mock to continue chain, second .eq() returns error result
			mockSupabaseClient.eq
				.mockReturnValueOnce(mockSupabaseClient) // First .eq() - continue chain
				.mockResolvedValueOnce({
					// Second .eq() - return error
					error: {
						code: 'PGRST500',
						message: 'Update failed'
					}
				})

			await expect(service.markEventProcessed(eventId)).rejects.toMatchObject({
				code: 'PGRST500'
			})
		})

		it('should handle exceptions gracefully', async () => {
			const eventId = 'evt_test_exception'

			// Service calls: .from().update().eq('webhook_source', ...).eq('external_id', ...)
			// First .eq() should return the mock (to continue chain), second should reject
			mockSupabaseClient.eq
				.mockReturnValueOnce(mockSupabaseClient) // First .eq() - continue chain
				.mockRejectedValueOnce(new Error('Network error')) // Second .eq() - reject

			await expect(service.markEventProcessed(eventId)).rejects.toThrow(
				'Network error'
			)
		})
	})

	describe('processWebhookEvent', () => {
		it('should process event and mark as processed on success', async () => {
			const eventId = 'evt_process_success'
			const eventType = 'payment_intent.succeeded'
			const processFunction = jest.fn().mockResolvedValue(undefined)

			// Mock lock acquisition
			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: true }],
				error: null
			})

			// Mock mark processed
			mockSupabaseClient.eq
				.mockReturnValueOnce(mockSupabaseClient)
				.mockResolvedValueOnce({ error: null })

			const result = await service.processWebhookEvent(
				eventId,
				eventType,
				processFunction
			)

			expect(result).toBe(true)
			expect(processFunction).toHaveBeenCalled()
		})

		it('should return false if lock not acquired', async () => {
			const eventId = 'evt_process_locked'
			const eventType = 'payment_intent.succeeded'
			const processFunction = jest.fn()

			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: false }],
				error: null
			})

			const result = await service.processWebhookEvent(
				eventId,
				eventType,
				processFunction
			)

			expect(result).toBe(false)
			expect(processFunction).not.toHaveBeenCalled()
		})

		it('should mark as processed even if processing fails', async () => {
			const eventId = 'evt_process_error'
			const eventType = 'payment_intent.succeeded'
			const processError = new Error('Processing failed')
			const processFunction = jest.fn().mockRejectedValue(processError)

			// Mock lock acquisition
			mockSupabaseClient.rpc.mockResolvedValue({
				data: [{ lock_acquired: true }],
				error: null
			})

			// Mock mark processed (called after error)
			mockSupabaseClient.eq
				.mockReturnValueOnce(mockSupabaseClient)
				.mockResolvedValueOnce({ error: null })

			await expect(
				service.processWebhookEvent(eventId, eventType, processFunction)
			).rejects.toThrow('Processing failed')

			// Should still attempt to mark as processed
			expect(mockSupabaseClient.update).toHaveBeenCalled()
		})
	})

	describe('Idempotency Workflow Integration', () => {
		it('should handle complete workflow: check -> record -> mark processed', async () => {
			const eventId = 'evt_test_workflow'
			const eventType = 'payment_intent.succeeded'

			// Step 1: Check if processed (not processed) - create fresh chain
			const checkChain1 = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116', message: 'No rows' }
				})
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(checkChain1)

			const isProcessed = await service.isEventProcessed(eventId)
			expect(isProcessed).toBe(false)

			// Step 2: Record processing (acquire lock) - fresh chain
			const recordChain = {
				rpc: jest.fn().mockResolvedValue({
					data: [{ lock_acquired: true }],
					error: null
				})
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(recordChain)

			const lockAcquired = await service.recordEventProcessing(
				eventId,
				eventType
			)
			expect(lockAcquired).toBe(true)

			// Step 3: Mark as processed - fresh chain
			// Service calls .eq() twice: .eq('webhook_source', ...).eq('external_id', ...)
			const updateChain = {
				from: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest
					.fn()
					.mockReturnValueOnce({
						eq: jest.fn().mockResolvedValue({ error: null })
					}) // First .eq() returns chainable, second .eq() returns result
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(updateChain)

			await service.markEventProcessed(eventId)

			// Step 4: Verify now shows as processed - fresh chain
			const checkChain2 = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: 'record_id' },
					error: null
				})
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(checkChain2)

			const nowProcessed = await service.isEventProcessed(eventId)
			expect(nowProcessed).toBe(true)
		})

		it('should handle retry after failed processing (idempotent recovery)', async () => {
			const eventId = 'evt_test_retry'
			const eventType = 'payment_intent.succeeded'

			// First attempt: Lock acquired - fresh chain
			const lockChain1 = {
				rpc: jest.fn().mockResolvedValue({
					data: [{ lock_acquired: true }],
					error: null
				})
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(lockChain1)

			const firstLock = await service.recordEventProcessing(eventId, eventType)
			expect(firstLock).toBe(true)

			// Processing fails, status remains 'processing'

			// Retry attempt: Should fail to acquire lock (already processing) - fresh chain
			const lockChain2 = {
				rpc: jest.fn().mockResolvedValue({
					data: [{ lock_acquired: false }],
					error: null
				})
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(lockChain2)

			const retryLock = await service.recordEventProcessing(eventId, eventType)
			expect(retryLock).toBe(false)

			// After manual investigation, mark as processed - fresh chain
			// Service calls .eq() twice: .eq('webhook_source', ...).eq('external_id', ...)
			const updateChain = {
				from: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest
					.fn()
					.mockReturnValueOnce({
						eq: jest.fn().mockResolvedValue({ error: null })
					}) // First .eq() returns chainable, second .eq() returns result
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(updateChain)

			await service.markEventProcessed(eventId)

			// New retry should show as processed - fresh chain
			const checkChain = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: 'record_id' },
					error: null
				})
			}

			supabase.getAdminClient = jest.fn().mockReturnValue(checkChain)

			const nowProcessed = await service.isEventProcessed(eventId)
			expect(nowProcessed).toBe(true)
		})
	})
})
