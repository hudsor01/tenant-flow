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

		expect(events.map(event => event.type)).toContain(
			SSE_EVENT_TYPES.PAYMENT_STATUS_UPDATED
		)
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

		expect(eventsA.map(event => event.type)).toContain(
			SSE_EVENT_TYPES.TENANT_UPDATED
		)
		expect(eventsB.map(event => event.type)).toContain(
			SSE_EVENT_TYPES.TENANT_UPDATED
		)

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
		const subscription = service
			.subscribe('user-7', 'session-7')
			.subscribe(event => events.push(event))

		jest.advanceTimersByTime(30_000)

		const heartbeat = events.find(
			event => event.type === SSE_EVENT_TYPES.HEARTBEAT
		)
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

		const subscription = service
			.subscribe('user-1', 'session-1')
			.subscribe(() => {})
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
		const subA = service
			.subscribe('user-1', 'session-1')
			.subscribe(event => eventsA.push(event))
		const subB = service
			.subscribe('user-2', 'session-2')
			.subscribe(event => eventsB.push(event))

		await service.broadcastToAll({
			type: SSE_EVENT_TYPES.CONNECTED,
			timestamp: new Date().toISOString(),
			payload: { broadcast: true }
		})

		expect(eventsA.map(event => event.type)).toContain(
			SSE_EVENT_TYPES.CONNECTED
		)
		expect(eventsB.map(event => event.type)).toContain(
			SSE_EVENT_TYPES.CONNECTED
		)

		subA.unsubscribe()
		subB.unsubscribe()
		service.onModuleDestroy()
	})

	describe('DoS protection', () => {
		it('enforces per-user connection limit of 5', () => {
			const service = new SseService(logger)

			// Create 5 connections for the same user
			const subscriptions: Array<ReturnType<typeof service.subscribe>> = []
			for (let i = 0; i < 5; i++) {
				const stream = service.subscribe('user-limit', `session-${i}`)
				subscriptions.push(stream)
				stream.subscribe(() => {})
			}

			expect(service.getConnectionCount()).toBe(5)

			// 6th connection should throw
			expect(() => {
				service.subscribe('user-limit', 'session-6')
			}).toThrow('Maximum connections (5) per user reached')

			// Cleanup
			for (let i = 0; i < 5; i++) {
				service.unsubscribe(`session-${i}`)
			}
			service.onModuleDestroy()
		})

		it('allows connections after unsubscribing one', () => {
			const service = new SseService(logger)

			// Create 5 connections for the same user
			for (let i = 0; i < 5; i++) {
				const stream = service.subscribe('user-limit', `session-${i}`)
				stream.subscribe(() => {})
			}

			// Remove one
			service.unsubscribe('session-2')

			// Now 6th connection should work (as session-5)
			expect(() => {
				const stream = service.subscribe('user-limit', 'session-new')
				stream.subscribe(() => {})
			}).not.toThrow()

			expect(service.getConnectionCount()).toBe(5)

			// Cleanup
			service.onModuleDestroy()
		})

		it('logs warning when per-user limit is reached', () => {
			const service = new SseService(logger)

			// Create 5 connections for the same user
			for (let i = 0; i < 5; i++) {
				const stream = service.subscribe('user-limit', `session-${i}`)
				stream.subscribe(() => {})
			}

			// 6th connection attempt
			try {
				service.subscribe('user-limit', 'session-6')
			} catch {
				// Expected
			}

			expect(logger.warn).toHaveBeenCalledWith(
				'SSE per-user connection limit reached',
				expect.objectContaining({
					userId: 'user-limit',
					userConnections: 5,
					limit: 5
				})
			)

			service.onModuleDestroy()
		})

		it('tracks user sessions correctly for limit enforcement', () => {
			const service = new SseService(logger)

			// User 1: 3 connections
			for (let i = 0; i < 3; i++) {
				const stream = service.subscribe('user-1', `user1-session-${i}`)
				stream.subscribe(() => {})
			}

			// User 2: 3 connections
			for (let i = 0; i < 3; i++) {
				const stream = service.subscribe('user-2', `user2-session-${i}`)
				stream.subscribe(() => {})
			}

			expect(service.getConnectionCount()).toBe(6)
			expect(service.getStats().uniqueUsers).toBe(2)

			// User 1 can still add 2 more
			expect(() => {
				service.subscribe('user-1', 'user1-session-3').subscribe(() => {})
				service.subscribe('user-1', 'user1-session-4').subscribe(() => {})
			}).not.toThrow()

			// But not a 6th
			expect(() => {
				service.subscribe('user-1', 'user1-session-5')
			}).toThrow()

			service.onModuleDestroy()
		})

		it('replaces existing connection with same sessionId', () => {
			const service = new SseService(logger)

			// Create first connection
			const stream1 = service.subscribe('user-1', 'session-1')
			stream1.subscribe(() => {})

			expect(service.getConnectionCount()).toBe(1)

			// Create second connection with same sessionId (should replace)
			const stream2 = service.subscribe('user-1', 'session-1')
			stream2.subscribe(() => {})

			// Should still be 1 connection
			expect(service.getConnectionCount()).toBe(1)

			service.onModuleDestroy()
		})
	})
})
