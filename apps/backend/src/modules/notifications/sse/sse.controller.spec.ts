import { EventEmitter } from 'events'
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common'
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

	describe('authentication', () => {
		it('throws UnauthorizedException when token is missing', async () => {
			const controller = new SseController(sseService, supabaseService, logger)
			const req = new EventEmitter() as unknown as Request
			req.ip = '127.0.0.1'
			const res = { setHeader: jest.fn() } as unknown as Response

			await expect(controller.stream('', req, res)).rejects.toThrow(
				UnauthorizedException
			)
		})

		it('throws UnauthorizedException when token is invalid', async () => {
			type AdminClient = ReturnType<SupabaseService['getAdminClient']>
			supabaseService.getAdminClient.mockReturnValue({
				auth: {
					getUser: jest.fn().mockResolvedValue({
						data: { user: null },
						error: { message: 'Invalid token' }
					})
				}
			} as AdminClient)

			const controller = new SseController(sseService, supabaseService, logger)
			const req = new EventEmitter() as unknown as Request
			req.ip = '127.0.0.1'
			const res = { setHeader: jest.fn() } as unknown as Response

			await expect(controller.stream('invalid-token', req, res)).rejects.toThrow(
				UnauthorizedException
			)
		})
	})

	describe('DoS protection error handling', () => {
		it('throws 429 Too Many Requests when per-user limit exceeded', async () => {
			sseService.subscribe.mockImplementation(() => {
				throw new Error('Maximum connections (5) per user reached. Close other tabs to connect.')
			})

			const controller = new SseController(sseService, supabaseService, logger)
			const req = new EventEmitter() as unknown as Request
			req.ip = '127.0.0.1'
			const res = { setHeader: jest.fn() } as unknown as Response

			try {
				await controller.stream('token', req, res)
				fail('Expected HttpException to be thrown')
			} catch (error) {
				expect(error).toBeInstanceOf(HttpException)
				expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS)
			}
		})

		it('throws 503 Service Unavailable when server limit exceeded', async () => {
			sseService.subscribe.mockImplementation(() => {
				throw new Error('Server connection limit reached. Please try again later.')
			})

			const controller = new SseController(sseService, supabaseService, logger)
			const req = new EventEmitter() as unknown as Request
			req.ip = '127.0.0.1'
			const res = { setHeader: jest.fn() } as unknown as Response

			try {
				await controller.stream('token', req, res)
				fail('Expected HttpException to be thrown')
			} catch (error) {
				expect(error).toBeInstanceOf(HttpException)
				expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE)
			}
		})

		it('logs warning when connection is rejected due to limits', async () => {
			sseService.subscribe.mockImplementation(() => {
				throw new Error('Maximum connections (5) per user reached. Close other tabs to connect.')
			})

			const controller = new SseController(sseService, supabaseService, logger)
			const req = new EventEmitter() as unknown as Request
			req.ip = '127.0.0.1'
			const res = { setHeader: jest.fn() } as unknown as Response

			try {
				await controller.stream('token', req, res)
			} catch {
				// Expected
			}

			expect(logger.warn).toHaveBeenCalledWith(
				'SSE connection rejected',
				expect.objectContaining({
					userId: 'user-1',
					reason: expect.stringContaining('per user')
				})
			)
		})
	})

	describe('SSE headers', () => {
		it('sets correct SSE headers', async () => {
			const events = new Subject<SseEvent>()
			sseService.subscribe.mockReturnValue(events.asObservable())

			const controller = new SseController(sseService, supabaseService, logger)
			const req = new EventEmitter() as unknown as Request
			req.ip = '127.0.0.1'
			const res = { setHeader: jest.fn() } as unknown as Response

			await controller.stream('token', req, res)

			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
			expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
			expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive')
			expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no')
		})
	})
})
