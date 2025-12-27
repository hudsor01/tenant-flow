import { EventEmitter } from 'events'
import { Subject } from 'rxjs'
import type { SseEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import type { Request, Response } from 'express'
import { SseController } from './sse.controller'
import { SseService } from './sse.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

jest.mock('crypto', () => ({
	randomUUID: jest.fn(() => 'session-1')
}))

describe('SseController', () => {
	let sseService: jest.Mocked<SseService>
	let supabaseService: jest.Mocked<SupabaseService>
	let logger: jest.Mocked<AppLogger>

	beforeEach(() => {
		sseService = {
			subscribe: jest.fn(),
			unsubscribe: jest.fn()
		} as jest.Mocked<SseService>

		type AdminClient = ReturnType<SupabaseService['getAdminClient']>
		supabaseService = {
			getAdminClient: jest.fn().mockReturnValue({
				auth: {
					getUser: jest.fn().mockResolvedValue({
						data: { user: { id: 'user-1' } },
						error: null
					})
				}
			} as AdminClient)
		} as jest.Mocked<SupabaseService>

		logger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		} as jest.Mocked<AppLogger>
	})

	it('unsubscribes on client disconnect', async () => {
		const events = new Subject<SseEvent>()
		sseService.subscribe.mockReturnValue(events.asObservable())

		const controller = new SseController(sseService, supabaseService, logger)
		const req = new EventEmitter() as unknown as Request
		req.ip = '127.0.0.1'
		const res = { setHeader: jest.fn() } as unknown as Response

		const stream = await controller.stream('token', req, res)
		const sub = stream.subscribe()

		req.emit('close')

		expect(sseService.unsubscribe).toHaveBeenCalledWith('session-1')
		sub.unsubscribe()
	})

	it('maps SSE events to MessageEvent payloads', async () => {
		const events = new Subject<SseEvent>()
		sseService.subscribe.mockReturnValue(events.asObservable())

		const controller = new SseController(sseService, supabaseService, logger)
		const req = new EventEmitter() as unknown as Request
		req.ip = '127.0.0.1'
		const res = { setHeader: jest.fn() } as unknown as Response

		const stream = await controller.stream('token', req, res)
		const received: unknown[] = []
		const sub = stream.subscribe(event => received.push(event))

		events.next({
			type: SSE_EVENT_TYPES.TENANT_UPDATED,
			timestamp: new Date().toISOString(),
			payload: { tenantId: 'tenant-1' }
		})

		expect(received[0]?.type).toBe(SSE_EVENT_TYPES.TENANT_UPDATED)
		expect(JSON.parse(received[0]?.data)).toEqual(
			expect.objectContaining({
				type: SSE_EVENT_TYPES.TENANT_UPDATED
			})
		)

		sub.unsubscribe()
	})
})
