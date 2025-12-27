import type { SseEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { SseService } from './sse.service'
import { AppLogger } from '../../../logger/app-logger.service'

describe('SseService', () => {
	let logger: jest.Mocked<AppLogger>

	beforeEach(() => {
		logger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		} as jest.Mocked<AppLogger>
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('delivers events in order for a single connection', async () => {
		const service = new SseService(logger)

		const events: SseEvent[] = []
		const stream = service.subscribe('user-1', 'session-1')
		const subscription = stream.subscribe(event => events.push(event))

		await service.broadcast('user-1', {
			type: SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED,
			timestamp: new Date().toISOString(),
			payload: { step: 1 }
		})
		await service.broadcast('user-1', {
			type: SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED,
			timestamp: new Date().toISOString(),
			payload: { step: 2 }
		})
		await service.broadcast('user-1', {
			type: SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED,
			timestamp: new Date().toISOString(),
			payload: { step: 3 }
		})

		const ordered = events
			.filter(event => event.type === SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED)
			.map(event => event.payload)

		expect(ordered).toEqual([{ step: 1 }, { step: 2 }, { step: 3 }])
		subscription.unsubscribe()
		service.onModuleDestroy()
	})

	it('delivers broadcast events to local sessions', async () => {
		const service = new SseService(logger)

		const events: SseEvent[] = []
		const stream = service.subscribe('user-1', 'session-1')
		const subscription = stream.subscribe(event => events.push(event))

		await service.broadcast('user-1', {
			type: SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED,
			timestamp: new Date().toISOString(),
			payload: { status: 'paid' }
		})

		expect(events.map(event => event.type)).toContain(SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED)
		subscription.unsubscribe()
		service.onModuleDestroy()
	})

	it('supports multiple sessions per user and cleans up idempotently', async () => {
		const service = new SseService(logger)

		const eventsA: SseEvent[] = []
		const eventsB: SseEvent[] = []
		const streamA = service.subscribe('user-2', 'session-a')
		const streamB = service.subscribe('user-2', 'session-b')
		const subA = streamA.subscribe(event => eventsA.push(event))
		const subB = streamB.subscribe(event => eventsB.push(event))

		await service.broadcast('user-2', {
			type: SSE_EVENT_TYPES.TENANT_UPDATED,
			timestamp: new Date().toISOString(),
			payload: { value: 'multi' }
		})

		expect(eventsA.map(event => event.type)).toContain(SSE_EVENT_TYPES.TENANT_UPDATED)
		expect(eventsB.map(event => event.type)).toContain(SSE_EVENT_TYPES.TENANT_UPDATED)

		service.unsubscribe('session-a')
		expect(() => service.unsubscribe('session-a')).not.toThrow()

		subA.unsubscribe()
		subB.unsubscribe()
		service.onModuleDestroy()
	})

	it('emits heartbeat events with server time payload', () => {
		jest.useFakeTimers()
		const service = new SseService(logger)

		const events: SseEvent[] = []
		const subscription = service.subscribe('user-7', 'session-7').subscribe(event => events.push(event))

		jest.advanceTimersByTime(30_000)

		const heartbeat = events.find(event => event.type === SSE_EVENT_TYPES.HEARTBEAT)
		expect(heartbeat?.payload).toEqual(
			expect.objectContaining({
				serverTime: expect.any(String)
			})
		)

		subscription.unsubscribe()
		service.onModuleDestroy()
	})

	it('cleans up connections without observers on heartbeat', () => {
		jest.useFakeTimers()
		const service = new SseService(logger)

		service.subscribe('user-3', 'session-3')
		expect(service.getConnectionCount()).toBe(1)

		jest.advanceTimersByTime(30_000)
		expect(service.getConnectionCount()).toBe(0)

		service.onModuleDestroy()
	})

	it('returns correct stats', () => {
		const service = new SseService(logger)

		service.subscribe('user-1', 'session-1').subscribe(() => {})
		service.subscribe('user-1', 'session-2').subscribe(() => {})
		service.subscribe('user-2', 'session-3').subscribe(() => {})

		const stats = service.getStats()
		expect(stats.totalConnections).toBe(3)
		expect(stats.uniqueUsers).toBe(2)

		service.onModuleDestroy()
	})

	it('checks if user is connected', () => {
		const service = new SseService(logger)

		expect(service.isUserConnected('user-1')).toBe(false)

		const subscription = service.subscribe('user-1', 'session-1').subscribe(() => {})
		expect(service.isUserConnected('user-1')).toBe(true)

		service.unsubscribe('session-1')
		expect(service.isUserConnected('user-1')).toBe(false)

		subscription.unsubscribe()
		service.onModuleDestroy()
	})

	it('broadcasts to all connected users', async () => {
		const service = new SseService(logger)

		const eventsA: SseEvent[] = []
		const eventsB: SseEvent[] = []
		const subA = service.subscribe('user-1', 'session-1').subscribe(event => eventsA.push(event))
		const subB = service.subscribe('user-2', 'session-2').subscribe(event => eventsB.push(event))

		await service.broadcastToAll({
			type: SSE_EVENT_TYPES.CONNECTED,
			timestamp: new Date().toISOString(),
			payload: { broadcast: true }
		})

		expect(eventsA.map(event => event.type)).toContain(SSE_EVENT_TYPES.CONNECTED)
		expect(eventsB.map(event => event.type)).toContain(SSE_EVENT_TYPES.CONNECTED)

		subA.unsubscribe()
		subB.unsubscribe()
		service.onModuleDestroy()
	})
})
