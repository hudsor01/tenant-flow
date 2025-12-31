/**
 * SSE Service - Server-Sent Events Broadcasting
 *
 * Manages SSE connections and broadcasts real-time events to connected clients.
 * Single-instance design following NestJS patterns.
 *
 * For horizontal scaling, add Redis pub/sub when needed (YAGNI until then).
 *
 * @module SSE
 */

import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import type { SseEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { Subject, type Observable } from 'rxjs'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * SSE connection metadata
 */
interface SseConnection {
	userId: string
	sessionId: string
	subject: Subject<SseEvent>
	connectedAt: Date
}

/**
 * SSE Broadcaster interface
 */
export interface SseBroadcaster {
	broadcast(userId: string, event: SseEvent): Promise<void>
	broadcastToAll(event: SseEvent): Promise<void>
	subscribe(userId: string, sessionId: string): Observable<SseEvent>
	unsubscribe(sessionId: string): void
	getConnectionCount(): number
}

/**
 * In-memory SSE broadcaster implementation
 * For single Railway instance deployment
 */
@Injectable()
export class SseService implements SseBroadcaster, OnModuleDestroy {
	/** Map of sessionId -> connection (supports multiple tabs per user) */
	private readonly connections = new Map<string, SseConnection>()

	/** Map of userId -> Set of sessionIds for efficient user-based broadcasting */
	private readonly userSessions = new Map<string, Set<string>>()

	/** Heartbeat interval in ms */
	private readonly HEARTBEAT_INTERVAL = 30_000
	private heartbeatTimer: NodeJS.Timeout | null = null

	/** Maximum connections per user (DoS protection) */
	private readonly MAX_CONNECTIONS_PER_USER = 5

	/** Maximum total connections (memory protection) */
	private readonly MAX_TOTAL_CONNECTIONS = 1000

	constructor(private readonly logger: AppLogger) {
		this.startHeartbeat()
		this.logger.log('SSE Service initialized', { context: 'SseService' })
	}

	onModuleDestroy(): void {
		this.stopHeartbeat()
		this.closeAllConnections()
		this.logger.log('SSE Service destroyed', { context: 'SseService' })
	}

	/**
	 * Subscribe a user to SSE events
	 * @throws Error if user exceeds connection limit or total connections exceeded
	 */
	subscribe(userId: string, sessionId: string): Observable<SseEvent> {
		// Check total connection limit (memory protection)
		if (this.connections.size >= this.MAX_TOTAL_CONNECTIONS) {
			this.logger.warn('SSE max total connections reached', {
				context: 'SseService',
				userId,
				totalConnections: this.connections.size
			})
			throw new Error('Server connection limit reached. Please try again later.')
		}

		// Check per-user connection limit (DoS protection)
		const userSessionCount = this.userSessions.get(userId)?.size ?? 0
		if (userSessionCount >= this.MAX_CONNECTIONS_PER_USER) {
			this.logger.warn('SSE per-user connection limit reached', {
				context: 'SseService',
				userId,
				userConnections: userSessionCount,
				limit: this.MAX_CONNECTIONS_PER_USER
			})
			throw new Error(
				`Maximum connections (${this.MAX_CONNECTIONS_PER_USER}) per user reached. Close other tabs to connect.`
			)
		}

		// Clean up existing connection with same sessionId
		if (this.connections.has(sessionId)) {
			this.unsubscribe(sessionId)
		}

		const subject = new Subject<SseEvent>()
		const connection: SseConnection = {
			userId,
			sessionId,
			subject,
			connectedAt: new Date()
		}

		// Store connection
		this.connections.set(sessionId, connection)

		// Track user sessions
		if (!this.userSessions.has(userId)) {
			this.userSessions.set(userId, new Set())
		}
		this.userSessions.get(userId)!.add(sessionId)

		this.logger.log('SSE connection established', {
			context: 'SseService',
			userId,
			sessionId,
			totalConnections: this.connections.size
		})

		// Send connected event
		subject.next({
			type: SSE_EVENT_TYPES.CONNECTED,
			timestamp: new Date().toISOString(),
			payload: { userId, sessionId }
		})

		return subject.asObservable()
	}

	/**
	 * Unsubscribe a session from SSE events
	 */
	unsubscribe(sessionId: string): void {
		const connection = this.connections.get(sessionId)
		if (!connection) return

		connection.subject.complete()
		this.connections.delete(sessionId)

		// Remove from user sessions
		const userSessionSet = this.userSessions.get(connection.userId)
		if (userSessionSet) {
			userSessionSet.delete(sessionId)
			if (userSessionSet.size === 0) {
				this.userSessions.delete(connection.userId)
			}
		}

		this.logger.log('SSE connection closed', {
			context: 'SseService',
			userId: connection.userId,
			sessionId,
			totalConnections: this.connections.size
		})
	}

	/**
	 * Broadcast an event to a specific user (all their sessions)
	 */
	async broadcast(userId: string, event: SseEvent): Promise<void> {
		const sessionIds = this.userSessions.get(userId)
		if (!sessionIds || sessionIds.size === 0) {
			this.logger.debug('No SSE connections for user', {
				context: 'SseService',
				userId,
				eventType: event.type
			})
			return
		}

		let deliveredCount = 0
		const staleSessionIds: string[] = []

		for (const sessionId of sessionIds) {
			const connection = this.connections.get(sessionId)
			if (connection && this.sendToConnection(connection, event)) {
				deliveredCount++
			} else {
				staleSessionIds.push(sessionId)
			}
		}

		// Clean up stale connections
		for (const sessionId of staleSessionIds) {
			this.unsubscribe(sessionId)
		}

		this.logger.debug('SSE event broadcast complete', {
			context: 'SseService',
			userId,
			eventType: event.type,
			deliveredCount
		})
	}

	/**
	 * Broadcast an event to all connected users
	 */
	async broadcastToAll(event: SseEvent): Promise<void> {
		const staleSessionIds: string[] = []
		let deliveredCount = 0

		for (const [sessionId, connection] of this.connections) {
			if (this.sendToConnection(connection, event)) {
				deliveredCount++
			} else {
				staleSessionIds.push(sessionId)
			}
		}

		for (const sessionId of staleSessionIds) {
			this.unsubscribe(sessionId)
		}

		this.logger.debug('SSE broadcast to all complete', {
			context: 'SseService',
			eventType: event.type,
			deliveredCount
		})
	}

	/**
	 * Get the number of active connections
	 */
	getConnectionCount(): number {
		return this.connections.size
	}

	/**
	 * Get connection stats for monitoring
	 */
	getStats(): { totalConnections: number; uniqueUsers: number } {
		return {
			totalConnections: this.connections.size,
			uniqueUsers: this.userSessions.size
		}
	}

	/**
	 * Check if a user has any active connections
	 */
	isUserConnected(userId: string): boolean {
		const sessions = this.userSessions.get(userId)
		return sessions !== undefined && sessions.size > 0
	}

	private startHeartbeat(): void {
		this.heartbeatTimer = setInterval(() => {
			this.sendHeartbeats()
		}, this.HEARTBEAT_INTERVAL)
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer)
			this.heartbeatTimer = null
		}
	}

	private sendHeartbeats(): void {
		const heartbeatEvent: SseEvent = {
			type: SSE_EVENT_TYPES.HEARTBEAT,
			timestamp: new Date().toISOString(),
			payload: { serverTime: new Date().toISOString() }
		}

		const staleSessionIds: string[] = []

		for (const [sessionId, connection] of this.connections) {
			if (!this.sendToConnection(connection, heartbeatEvent)) {
				staleSessionIds.push(sessionId)
			}
		}

		for (const sessionId of staleSessionIds) {
			this.logger.warn('Cleaning up SSE connection after heartbeat failure', {
				context: 'SseService',
				sessionId
			})
			this.unsubscribe(sessionId)
		}
	}

	private closeAllConnections(): void {
		for (const sessionId of [...this.connections.keys()]) {
			this.unsubscribe(sessionId)
		}
	}

	private sendToConnection(
		connection: SseConnection,
		event: SseEvent
	): boolean {
		if (
			connection.subject.closed ||
			connection.subject.observers.length === 0
		) {
			return false
		}

		try {
			connection.subject.next(event)
			return true
		} catch {
			return false
		}
	}
}
