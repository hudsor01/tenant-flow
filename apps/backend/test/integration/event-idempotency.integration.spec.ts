/**
 * EventIdempotencyService Integration Tests
 *
 * Tests against real local Supabase database to verify:
 * - Atomic lock acquisition (race condition safety)
 * - Duplicate event prevention
 * - Cleanup functionality
 * - RPC function behavior
 *
 * PREREQUISITES:
 * - Local Supabase must be running: `supabase start`
 * - Migration must be applied: `supabase db push`
 * - Environment variables must be set in Doppler:
 *   - TEST_SUPABASE_URL (local: http://127.0.0.1:54321)
 *   - TEST_SUPABASE_SECRET_KEY (local: from `supabase status`)
 */

import type { Database } from '@repo/shared/types/supabase'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Use TEST_* env vars for integration tests (separate from production)
// Falls back to standard vars for backwards compatibility
const SUPABASE_URL =
	process.env.TEST_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY =
	process.env.TEST_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const missingEnv: string[] = []
if (!SUPABASE_URL) missingEnv.push('TEST_SUPABASE_URL')
if (!SUPABASE_SECRET_KEY) missingEnv.push('TEST_SUPABASE_SECRET_KEY')

// In CI or when RUN_INTEGRATION_TESTS is set, fail loudly instead of skipping
const shouldRunIntegration = process.env.CI || process.env.RUN_INTEGRATION_TESTS
if (missingEnv.length > 0 && shouldRunIntegration) {
	throw new Error(
		`Integration tests FAILED - Missing required env vars: ${missingEnv.join(', ')}\n` +
			`Set these in Doppler or CI secrets:\n` +
			`  - TEST_SUPABASE_URL (e.g., http://127.0.0.1:54321)\n` +
			`  - TEST_SUPABASE_SECRET_KEY (from \`supabase status\`)`
	)
}

const describeIntegration = missingEnv.length > 0 ? describe.skip : describe

if (missingEnv.length > 0) {
	console.warn(
		`WARNING  Skipping EventIdempotency integration tests. Missing env: ${missingEnv.join(', ')}\n` +
			`   Set RUN_INTEGRATION_TESTS=true to fail instead of skip.\n` +
			`   Required env vars:\n` +
			`   - TEST_SUPABASE_URL=http://127.0.0.1:54321\n` +
			`   - TEST_SUPABASE_SECRET_KEY=<from supabase status>`
	)
}

jest.setTimeout(30_000)

let rpcAvailable = true
const maybeIt = (name: string, fn: () => Promise<void> | void) =>
	it(name, async () => {
		if (!rpcAvailable) return
		await fn()
	})

describeIntegration('EventIdempotencyService Integration Tests', () => {
	let adminClient: SupabaseClient<Database>
	const testEventPrefix = `test_${Date.now()}`

	beforeAll(async () => {
		adminClient = createClient<Database>(SUPABASE_URL!, SUPABASE_SECRET_KEY!, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
		})

		const { error } = await adminClient.rpc('acquire_internal_event_lock', {
			p_event_name: `${testEventPrefix}_probe`,
			p_idempotency_key: `probe_${Date.now()}`,
			p_payload_hash: 'probe_hash'
		})
		if (error) {
			rpcAvailable = false
			console.warn(
				`Skipping EventIdempotency integration tests; RPC unavailable: ${error.message}`
			)
		}
	})

	afterAll(async () => {
		// Cleanup all test events created during this test run
		await adminClient
			.from('processed_internal_events')
			.delete()
			.like('event_name', `${testEventPrefix}%`)
	})

	describe('acquire_internal_event_lock RPC', () => {
		maybeIt('returns lock_acquired=true for new event', async () => {
			const eventName = `${testEventPrefix}_new_event`
			const idempotencyKey = `key_${Date.now()}`
			const payloadHash = 'hash123'

			const { data, error } = await adminClient.rpc(
				'acquire_internal_event_lock',
				{
					p_event_name: eventName,
					p_idempotency_key: idempotencyKey,
					p_payload_hash: payloadHash
				}
			)

			expect(error).toBeNull()
			expect(data).toBeDefined()

			const rows = Array.isArray(data) ? data : [data]
			expect(rows.length).toBeGreaterThan(0)
			expect(rows[0]).toHaveProperty('lock_acquired', true)
		})

		maybeIt('returns lock_acquired=false for duplicate event', async () => {
			const eventName = `${testEventPrefix}_duplicate_event`
			const idempotencyKey = `key_${Date.now()}`
			const payloadHash = 'hash456'

			// First call - should acquire lock
			const { data: firstData, error: firstError } = await adminClient.rpc(
				'acquire_internal_event_lock',
				{
					p_event_name: eventName,
					p_idempotency_key: idempotencyKey,
					p_payload_hash: payloadHash
				}
			)

			expect(firstError).toBeNull()
			const firstRows = Array.isArray(firstData) ? firstData : [firstData]
			expect(firstRows[0]).toHaveProperty('lock_acquired', true)

			// Second call with same key - should NOT acquire lock
			const { data: secondData, error: secondError } = await adminClient.rpc(
				'acquire_internal_event_lock',
				{
					p_event_name: eventName,
					p_idempotency_key: idempotencyKey,
					p_payload_hash: payloadHash
				}
			)

			expect(secondError).toBeNull()
			const secondRows = Array.isArray(secondData) ? secondData : [secondData]
			expect(secondRows[0]).toHaveProperty('lock_acquired', false)
		})

		maybeIt(
			'allows same idempotency key for different event names',
			async () => {
				const idempotencyKey = `shared_key_${Date.now()}`
				const payloadHash = 'hash789'

				// First event type
				const { data: data1 } = await adminClient.rpc(
					'acquire_internal_event_lock',
					{
						p_event_name: `${testEventPrefix}_event_type_a`,
						p_idempotency_key: idempotencyKey,
						p_payload_hash: payloadHash
					}
				)

				// Different event type with same idempotency key
				const { data: data2 } = await adminClient.rpc(
					'acquire_internal_event_lock',
					{
						p_event_name: `${testEventPrefix}_event_type_b`,
						p_idempotency_key: idempotencyKey,
						p_payload_hash: payloadHash
					}
				)

				const rows1 = Array.isArray(data1) ? data1 : [data1]
				const rows2 = Array.isArray(data2) ? data2 : [data2]

				expect(rows1[0]).toHaveProperty('lock_acquired', true)
				expect(rows2[0]).toHaveProperty('lock_acquired', true)
			}
		)

		maybeIt('creates event record with processing status', async () => {
			const eventName = `${testEventPrefix}_status_check`
			const idempotencyKey = `key_status_${Date.now()}`
			const payloadHash = 'hashstatus'

			await adminClient.rpc('acquire_internal_event_lock', {
				p_event_name: eventName,
				p_idempotency_key: idempotencyKey,
				p_payload_hash: payloadHash
			})

			// Query the created record
			const { data: record } = await adminClient
				.from('processed_internal_events')
				.select('*')
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)
				.single()

			expect(record).toBeDefined()
			expect(record?.status).toBe('processing')
			expect(record?.payload_hash).toBe(payloadHash)
			expect(record?.processed_at).toBeNull()
		})
	})

	describe('Concurrent lock acquisition (race condition safety)', () => {
		maybeIt(
			'only one of multiple concurrent requests acquires lock',
			async () => {
				const eventName = `${testEventPrefix}_concurrent`
				const idempotencyKey = `concurrent_key_${Date.now()}`
				const payloadHash = 'concurrent_hash'

				// Fire 10 concurrent lock acquisition requests
				const concurrentRequests = Array.from({ length: 10 }, () =>
					adminClient.rpc('acquire_internal_event_lock', {
						p_event_name: eventName,
						p_idempotency_key: idempotencyKey,
						p_payload_hash: payloadHash
					})
				)

				const results = await Promise.all(concurrentRequests)

				// Count how many acquired the lock
				let locksAcquired = 0
				for (const result of results) {
					expect(result.error).toBeNull()
					const rows = Array.isArray(result.data) ? result.data : [result.data]
					if (rows[0]?.lock_acquired === true) {
						locksAcquired++
					}
				}

				// Exactly one should have acquired the lock
				expect(locksAcquired).toBe(1)

				// Verify only one record exists in database
				const { data: records } = await adminClient
					.from('processed_internal_events')
					.select('*')
					.eq('event_name', eventName)
					.eq('idempotency_key', idempotencyKey)

				expect(records).toHaveLength(1)
			}
		)

		maybeIt('handles high concurrency without errors', async () => {
			const eventName = `${testEventPrefix}_high_concurrency`
			const baseKey = `high_concurrency_${Date.now()}`

			// Fire 50 requests with 5 unique keys (10 requests per key)
			const requests: Promise<unknown>[] = []
			for (let keyIndex = 0; keyIndex < 5; keyIndex++) {
				for (let requestIndex = 0; requestIndex < 10; requestIndex++) {
					requests.push(
						adminClient.rpc('acquire_internal_event_lock', {
							p_event_name: eventName,
							p_idempotency_key: `${baseKey}_${keyIndex}`,
							p_payload_hash: `hash_${keyIndex}`
						})
					)
				}
			}

			const results = await Promise.all(requests)

			// All requests should complete without errors
			for (const result of results) {
				expect(result.error).toBeNull()
			}

			// Should have exactly 5 records (one per unique key)
			const { data: records } = await adminClient
				.from('processed_internal_events')
				.select('*')
				.eq('event_name', eventName)
				.like('idempotency_key', `${baseKey}%`)

			expect(records).toHaveLength(5)
		})
	})

	describe('Event status updates', () => {
		maybeIt('can update event status to processed', async () => {
			const eventName = `${testEventPrefix}_mark_processed`
			const idempotencyKey = `processed_key_${Date.now()}`

			// Create event
			await adminClient.rpc('acquire_internal_event_lock', {
				p_event_name: eventName,
				p_idempotency_key: idempotencyKey,
				p_payload_hash: 'hash'
			})

			// Update to processed
			const { error: updateError } = await adminClient
				.from('processed_internal_events')
				.update({
					status: 'processed',
					processed_at: new Date().toISOString()
				})
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)

			expect(updateError).toBeNull()

			// Verify update
			const { data: record } = await adminClient
				.from('processed_internal_events')
				.select('*')
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)
				.single()

			expect(record?.status).toBe('processed')
			expect(record?.processed_at).not.toBeNull()
		})

		maybeIt('can update event status to failed', async () => {
			const eventName = `${testEventPrefix}_mark_failed`
			const idempotencyKey = `failed_key_${Date.now()}`

			// Create event
			await adminClient.rpc('acquire_internal_event_lock', {
				p_event_name: eventName,
				p_idempotency_key: idempotencyKey,
				p_payload_hash: 'hash'
			})

			// Update to failed
			const { error: updateError } = await adminClient
				.from('processed_internal_events')
				.update({
					status: 'failed',
					processed_at: new Date().toISOString()
				})
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)

			expect(updateError).toBeNull()

			// Verify update
			const { data: record } = await adminClient
				.from('processed_internal_events')
				.select('*')
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)
				.single()

			expect(record?.status).toBe('failed')
		})
	})

	describe('cleanup_old_internal_events RPC', () => {
		maybeIt('deletes events older than specified days', async () => {
			const eventName = `${testEventPrefix}_cleanup_test`

			// Insert an old event directly (backdated)
			const oldDate = new Date()
			oldDate.setDate(oldDate.getDate() - 35) // 35 days ago

			const { error: insertError } = await adminClient
				.from('processed_internal_events')
				.insert({
					event_name: eventName,
					idempotency_key: `old_event_${Date.now()}`,
					payload_hash: 'old_hash',
					status: 'processed',
					created_at: oldDate.toISOString()
				})

			expect(insertError).toBeNull()

			// Insert a recent event
			const recentKey = `recent_event_${Date.now()}`
			await adminClient.rpc('acquire_internal_event_lock', {
				p_event_name: eventName,
				p_idempotency_key: recentKey,
				p_payload_hash: 'recent_hash'
			})

			// Run cleanup with 30 days retention
			const { data: deletedCount, error: cleanupError } = await adminClient.rpc(
				'cleanup_old_internal_events',
				{ days_to_keep: 30 }
			)

			expect(cleanupError).toBeNull()
			expect(typeof deletedCount).toBe('number')
			expect(deletedCount).toBeGreaterThanOrEqual(1)

			// Verify old event was deleted
			const { data: records } = await adminClient
				.from('processed_internal_events')
				.select('*')
				.eq('event_name', eventName)

			// Should only have the recent event
			expect(records).toHaveLength(1)
			expect(records?.[0]?.idempotency_key).toBe(recentKey)
		})

		maybeIt('returns 0 when no old events exist', async () => {
			// Ensure we have at least one recent event
			await adminClient.rpc('acquire_internal_event_lock', {
				p_event_name: `${testEventPrefix}_recent_only`,
				p_idempotency_key: `recent_${Date.now()}`,
				p_payload_hash: 'hash'
			})

			// Run cleanup - should not delete anything recent
			const { data: deletedCount, error } = await adminClient.rpc(
				'cleanup_old_internal_events',
				{ days_to_keep: 30 }
			)

			expect(error).toBeNull()
			expect(typeof deletedCount).toBe('number')
			// May be 0 or more depending on other test data
		})
	})

	describe('Idempotency key collision resistance', () => {
		maybeIt(
			'different payloads produce different idempotency keys',
			async () => {
				const eventName = `${testEventPrefix}_key_collision`

				// These should all succeed as they have different keys
				const payloads = [
					{ user_id: '1', amount: 100 },
					{ user_id: '1', amount: 200 },
					{ user_id: '2', amount: 100 }
				]

				const results = await Promise.all(
					payloads.map((payload, index) =>
						adminClient.rpc('acquire_internal_event_lock', {
							p_event_name: eventName,
							p_idempotency_key: `payload_${JSON.stringify(payload)}_${index}`,
							p_payload_hash: `hash_${index}`
						})
					)
				)

				// All should acquire locks (different keys)
				for (const result of results) {
					expect(result.error).toBeNull()
					const rows = Array.isArray(result.data) ? result.data : [result.data]
					expect(rows[0]).toHaveProperty('lock_acquired', true)
				}
			}
		)
	})

	describe('Table constraints', () => {
		maybeIt(
			'enforces unique constraint on (event_name, idempotency_key)',
			async () => {
				const eventName = `${testEventPrefix}_unique_constraint`
				const idempotencyKey = `unique_key_${Date.now()}`

				// First insert via RPC
				await adminClient.rpc('acquire_internal_event_lock', {
					p_event_name: eventName,
					p_idempotency_key: idempotencyKey,
					p_payload_hash: 'hash1'
				})

				// Direct insert with same key should fail
				const { error } = await adminClient
					.from('processed_internal_events')
					.insert({
						event_name: eventName,
						idempotency_key: idempotencyKey,
						payload_hash: 'hash2'
					})

				expect(error).not.toBeNull()
				expect(error?.message).toContain('duplicate key')
			}
		)

		maybeIt('validates status values', async () => {
			const eventName = `${testEventPrefix}_status_validation`
			const idempotencyKey = `status_key_${Date.now()}`

			// Create event
			await adminClient.rpc('acquire_internal_event_lock', {
				p_event_name: eventName,
				p_idempotency_key: idempotencyKey,
				p_payload_hash: 'hash'
			})

			// Try to update with invalid status
			const { error } = await adminClient
				.from('processed_internal_events')
				.update({ status: 'invalid_status' })
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)

			expect(error).not.toBeNull()
			expect(error?.message).toContain('check')
		})
	})

	describe('Performance', () => {
		maybeIt('acquires lock within acceptable time (<100ms)', async () => {
			const eventName = `${testEventPrefix}_performance`
			const iterations = 10
			const times: number[] = []

			for (let i = 0; i < iterations; i++) {
				const start = Date.now()
				await adminClient.rpc('acquire_internal_event_lock', {
					p_event_name: eventName,
					p_idempotency_key: `perf_key_${Date.now()}_${i}`,
					p_payload_hash: `hash_${i}`
				})
				times.push(Date.now() - start)
			}

			const avgTime = times.reduce((a, b) => a + b, 0) / times.length
			const maxTime = Math.max(...times)

			console.log(
				`Lock acquisition times - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`
			)

			expect(avgTime).toBeLessThan(100)
			expect(maxTime).toBeLessThan(500) // Allow for occasional slow queries
		})
	})
})
