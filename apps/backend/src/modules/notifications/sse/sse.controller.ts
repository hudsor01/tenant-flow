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
	UseGuards,
	type MessageEvent
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard'
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
@ApiTags('Notifications')
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
	@ApiOperation({
		summary: 'SSE event stream',
		description:
			'Server-Sent Events endpoint for real-time notifications. Authentication via query parameter (EventSource limitation).'
	})
	@ApiQuery({
		name: 'token',
		required: true,
		type: String,
		description: 'JWT access token for authentication'
	})
	@ApiResponse({
		status: 200,
		description: 'SSE stream established (text/event-stream)'
	})
	@ApiResponse({ status: 401, description: 'Invalid or missing token' })
	@Get('stream')
	@Sse()
	@Public() // Bypass JwtAuthGuard - we handle auth manually
	@SkipThrottle() // SSE is long-lived connection, not suitable for rate limiting
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
		const {
			data: { user },
			error
		} = await this.supabaseService.getAdminClient().auth.getUser(token)

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
			map(
				(event: SseEvent): MessageEvent => ({
					type: event.type,
					data: JSON.stringify(event),
					id: event.correlationId ?? randomUUID(),
					retry: 5000 // Retry connection after 5 seconds on disconnect
				})
			),
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
	@ApiOperation({
		summary: 'SSE connection statistics',
		description: 'Returns current SSE connection statistics for monitoring purposes'
	})
	@ApiBearerAuth('supabase-auth')
	@ApiResponse({
		status: 200,
		description: 'Connection stats retrieved',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', example: 'healthy' },
				connections: { type: 'number', example: 42 },
				uniqueUsers: { type: 'number', example: 35 }
			}
		}
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('stream/status')
	@UseGuards(JwtAuthGuard)
	getStreamStatus() {
		const stats = this.sseService.getStats()
		return {
			status: 'healthy',
			connections: stats.totalConnections,
			uniqueUsers: stats.uniqueUsers
		}
	}
}
