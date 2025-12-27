/**
 * EventIdempotencyService Unit Tests
 *
 * Tests idempotency key generation, lock acquisition logic,
 * and service behavior with mocked database.
 */

import { Test } from '@nestjs/testing'
import { EventIdempotencyService } from './event-idempotency.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('EventIdempotencyService', () => {
  let service: EventIdempotencyService
  let mockSupabaseService: {
    getAdminClient: jest.Mock
  }
  let mockClient: {
    rpc: jest.Mock
    from: jest.Mock
  }

  beforeEach(async () => {
    mockClient = {
      rpc: jest.fn(),
      from: jest.fn()
    }

    mockSupabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockClient)
    }

    const module = await Test.createTestingModule({
      providers: [
        EventIdempotencyService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    }).compile()

    service = module.get<EventIdempotencyService>(EventIdempotencyService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateIdempotencyKey', () => {
    it('generates deterministic keys for identical payloads', () => {
      const eventName = 'test.event'
      const payload = { user_id: '123', amount: 100 }

      const key1 = service.generateIdempotencyKey(eventName, payload)
      const key2 = service.generateIdempotencyKey(eventName, payload)

      expect(key1).toBe(key2)
      expect(key1).toHaveLength(32) // SHA-256 truncated to 32 chars
    })

    it('generates different keys for different payloads', () => {
      const eventName = 'test.event'
      const payload1 = { user_id: '123', amount: 100 }
      const payload2 = { user_id: '123', amount: 200 }

      const key1 = service.generateIdempotencyKey(eventName, payload1)
      const key2 = service.generateIdempotencyKey(eventName, payload2)

      expect(key1).not.toBe(key2)
    })

    it('generates different keys for different event names', () => {
      const payload = { user_id: '123' }

      const key1 = service.generateIdempotencyKey('event.a', payload)
      const key2 = service.generateIdempotencyKey('event.b', payload)

      expect(key1).not.toBe(key2)
    })

    it('generates same key regardless of object property order', () => {
      const eventName = 'test.event'
      const payload1 = { a: 1, b: 2, c: 3 }
      const payload2 = { c: 3, a: 1, b: 2 }

      const key1 = service.generateIdempotencyKey(eventName, payload1)
      const key2 = service.generateIdempotencyKey(eventName, payload2)

      expect(key1).toBe(key2)
    })

    it('handles null payload', () => {
      const key = service.generateIdempotencyKey('test.event', null)
      expect(key).toHaveLength(32)
    })

    it('handles empty object payload', () => {
      const key = service.generateIdempotencyKey('test.event', {})
      expect(key).toHaveLength(32)
    })

    it('handles nested objects', () => {
      const payload = {
        user: { id: '123', name: 'Test' },
        data: { nested: { deep: true } }
      }

      const key = service.generateIdempotencyKey('test.event', payload)
      expect(key).toHaveLength(32)
    })

    it('handles arrays in payload', () => {
      const payload = { ids: ['a', 'b', 'c'], count: 3 }

      const key = service.generateIdempotencyKey('test.event', payload)
      expect(key).toHaveLength(32)
    })
  })

  describe('acquireLock', () => {
    it('returns true when lock is acquired successfully', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: true }],
        error: null
      })

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(true)
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'acquire_internal_event_lock',
        expect.objectContaining({
          p_event_name: 'test.event',
          p_idempotency_key: expect.any(String),
          p_payload_hash: expect.any(String)
        })
      )
    })

    it('returns false when event was already processed', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: false }],
        error: null
      })

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(false)
    })

    it('returns true (fail-open) when RPC returns error', async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(true) // Fail-open behavior
    })

    it('returns true (fail-open) when RPC throws exception', async () => {
      mockClient.rpc.mockRejectedValue(new Error('Network error'))

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(true) // Fail-open behavior
    })

    it('returns true (fail-open) when RPC returns null data', async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(true) // Fail-open behavior
    })

    it('returns true (fail-open) when RPC returns empty array', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(true) // Fail-open behavior
    })

    it('handles non-array RPC response', async () => {
      mockClient.rpc.mockResolvedValue({
        data: { lock_acquired: true },
        error: null
      })

      const result = await service.acquireLock('test.event', { id: '123' })

      expect(result).toBe(true)
    })
  })

  describe('markProcessed', () => {
    it('updates event status to processed', async () => {
      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: null })

      await service.markProcessed('test.event', { id: '123' })

      expect(mockClient.from).toHaveBeenCalledWith('processed_internal_events')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processed',
          processed_at: expect.any(String)
        })
      )
    })

    it('handles database errors gracefully', async () => {
      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: { message: 'DB error' } })

      // Should not throw
      await expect(
        service.markProcessed('test.event', { id: '123' })
      ).resolves.toBeUndefined()
    })
  })

  describe('markFailed', () => {
    it('updates event status to failed', async () => {
      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: null })

      await service.markFailed('test.event', { id: '123' })

      expect(mockClient.from).toHaveBeenCalledWith('processed_internal_events')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          processed_at: expect.any(String)
        })
      )
    })
  })

  describe('withIdempotency', () => {
    it('executes handler when lock is acquired', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: true }],
        error: null
      })

      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: null })

      const handler = jest.fn().mockResolvedValue('result')

      const result = await service.withIdempotency(
        'test.event',
        { id: '123' },
        handler
      )

      expect(handler).toHaveBeenCalled()
      expect(result).toBe('result')
    })

    it('skips handler when event was already processed', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: false }],
        error: null
      })

      const handler = jest.fn().mockResolvedValue('result')

      const result = await service.withIdempotency(
        'test.event',
        { id: '123' },
        handler
      )

      expect(handler).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('marks event as processed after successful handler execution', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: true }],
        error: null
      })

      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: null })

      const handler = jest.fn().mockResolvedValue('result')

      await service.withIdempotency('test.event', { id: '123' }, handler)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processed' })
      )
    })

    it('marks event as failed and rethrows when handler throws', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: true }],
        error: null
      })

      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: null })

      const handlerError = new Error('Handler failed')
      const handler = jest.fn().mockRejectedValue(handlerError)

      await expect(
        service.withIdempotency('test.event', { id: '123' }, handler)
      ).rejects.toThrow('Handler failed')

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      )
    })

    it('returns typed result from handler', async () => {
      mockClient.rpc.mockResolvedValue({
        data: [{ lock_acquired: true }],
        error: null
      })

      const mockUpdate = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })
      mockEq.mockResolvedValue({ error: null })

      interface TestResult {
        success: boolean
        count: number
      }

      const handler = jest
        .fn()
        .mockResolvedValue({ success: true, count: 5 } as TestResult)

      const result = await service.withIdempotency<TestResult>(
        'test.event',
        { id: '123' },
        handler
      )

      expect(result).toEqual({ success: true, count: 5 })
    })
  })

  describe('handleScheduledCleanup', () => {
    it('calls cleanup RPC with 30 days retention', async () => {
      mockClient.rpc.mockResolvedValue({
        data: 100,
        error: null
      })

      await service.handleScheduledCleanup()

      expect(mockClient.rpc).toHaveBeenCalledWith('cleanup_old_internal_events', {
        days_to_keep: 30
      })
    })

    it('handles cleanup errors gracefully', async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Cleanup failed' }
      })

      // Should not throw
      await expect(service.handleScheduledCleanup()).resolves.toBeUndefined()
    })
  })

  describe('getStatistics', () => {
    it('returns aggregated statistics', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()

      // Mock for total count
      mockClient.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          then: (cb: (result: { count: number; error: unknown }) => void) => cb({ count: 100, error: null })
        })
      })

      // Mock for today count
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: mockGte.mockReturnValue({
            then: (cb: (result: { count: number; error: unknown }) => void) => cb({ count: 10, error: null })
          })
        })
      })

      // Mock for status data
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ status: 'processed' }, { status: 'processed' }, { status: 'failed' }],
          error: null
        })
      })

      // Mock for event name data
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [
            { event_name: 'test.event' },
            { event_name: 'test.event' },
            { event_name: 'other.event' }
          ],
          error: null
        })
      })

      const stats = await service.getStatistics()

      expect(stats).toHaveProperty('totalEvents')
      expect(stats).toHaveProperty('todayEvents')
      expect(stats).toHaveProperty('byStatus')
      expect(stats).toHaveProperty('byEventName')
    })
  })
})
