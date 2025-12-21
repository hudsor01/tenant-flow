/**
 * SSE Controller - Server-Sent Events Endpoint
 *
 * Provides real-time event streaming to connected clients.
 * Replaces polling patterns with push notifications.
 *
 * Authentication: JWT via query parameter (EventSource doesn't support headers)
 *
 * @module SSE
 */

import {
	Controller,
	Get,
	Query,
	Req,
	Res,
	Sse,
	UnauthorizedException,
	type MessageEvent
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SseEvent } from '@repo/shared/events/sse-events'
import type { Response, Request } from 'express'
import { Observable, map, finalize } from 'rxjs'
import { randomUUID } from 'crypto'
import { SseService } from './sse.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { Public } from '../../../shared/decorators/public.decorator'

/**
 * SSE Controller
 *
 * Endpoint: GET /api/v1/notifications/stream?token=<jwt>
 *
 * Note: Uses @Public() decorator because authentication is handled
 * manually via query parameter (EventSource limitation)
 */
@Controller('notifications')
export class SseController {
	constructor(
		private readonly sseService: SseService,
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * SSE Stream Endpoint
	 *
	 * Clients connect with their JWT token as a query parameter:
	 * EventSource('/api/v1/notifications/stream?token=xxx')
	 *
	 * @param token - JWT access token (required)
	 * @returns Observable of SSE MessageEvents
	 */
	@Get('stream')
	@Sse()
	@Public() // Bypass JwtAuthGuard - we handle auth manually
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 connections per minute per IP
	async stream(
		@Query('token') token: string,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	): Promise<Observable<MessageEvent>> {
		// Validate token parameter exists
		if (!token || typeof token !== 'string') {
			this.logger.warn('SSE connection attempt without token', {
				context: 'SseController',
				ip: req.ip
			})
			throw new UnauthorizedException('Authentication token required')
		}

		// Validate JWT and get user
		const { data: { user }, error } = await this.supabaseService
			.getAdminClient()
			.auth.getUser(token)

		if (error || !user) {
			this.logger.warn('SSE connection with invalid token', {
				context: 'SseController',
				ip: req.ip,
				error: error?.message
			})
			throw new UnauthorizedException('Invalid authentication token')
		}

		// Generate session ID for this connection
		const sessionId = randomUUID()
		const userId = user.id

		this.logger.log('SSE connection authenticated', {
			context: 'SseController',
			userId,
			sessionId,
			ip: req.ip
		})

		// Set SSE headers
		res.setHeader('Content-Type', 'text/event-stream')
		res.setHeader('Cache-Control', 'no-cache')
		res.setHeader('Connection', 'keep-alive')
		res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

		// Subscribe to SSE events for this user
		const eventStream = this.sseService.subscribe(userId, sessionId)

		// Handle client disconnect
		req.on('close', () => {
			this.logger.log('SSE client disconnected', {
				context: 'SseController',
				userId,
				sessionId
			})
			this.sseService.unsubscribe(sessionId)
		})

		// Transform SseEvent to NestJS MessageEvent format
		return eventStream.pipe(
			map((event: SseEvent): MessageEvent => ({
				type: event.type,
				data: JSON.stringify(event),
				id: event.correlationId ?? randomUUID(),
				retry: 5000 // Retry connection after 5 seconds on disconnect
			})),
			finalize(() => {
				// Cleanup on stream completion
				this.sseService.unsubscribe(sessionId)
			})
		)
	}

	/**
	 * SSE Connection Status Endpoint
	 * Returns current connection statistics (for monitoring)
	 */
	@Get('stream/status')
	getStreamStatus() {
		const stats = this.sseService.getStats()
		return {
			status: 'healthy',
			connections: stats.totalConnections,
			uniqueUsers: stats.uniqueUsers,
			oldestConnection: stats.oldestConnection?.toISOString() ?? null
		}
	}
}
