/**
 * SSE Service - Server-Sent Events Broadcasting
 *
 * Manages SSE connections and broadcasts real-time events to connected clients.
 * Designed for single-instance deployment with interface ready for Redis pub/sub upgrade.
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
	lastHeartbeat: Date
}

/**
 * SSE Broadcaster interface for future Redis pub/sub upgrade
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
	/**
	 * Map of sessionId -> connection
	 * Using sessionId as key allows multiple tabs per user
	 */
	private readonly connections = new Map<string, SseConnection>()

	/**
	 * Map of userId -> Set of sessionIds
	 * For efficient user-based broadcasting
	 */
	private readonly userSessions = new Map<string, Set<string>>()

	/**
	 * Heartbeat interval (30 seconds)
	 */
	private readonly HEARTBEAT_INTERVAL = 30_000

	/**
	 * Connection timeout (2 minutes without heartbeat response)
	 */
	private readonly CONNECTION_TIMEOUT = 120_000

	private heartbeatTimer: NodeJS.Timeout | null = null

	constructor(private readonly logger: AppLogger) {
		this.startHeartbeat()
		this.logger.log('SSE Service initialized', { context: 'SseService' })
	}

	/**
	 * Cleanup on module destroy
	 */
	onModuleDestroy(): void {
		this.stopHeartbeat()
		this.closeAllConnections()
		this.logger.log('SSE Service destroyed', { context: 'SseService' })
	}

	/**
	 * Subscribe a user to SSE events
	 * Returns an Observable that emits events for this user
	 */
	subscribe(userId: string, sessionId: string): Observable<SseEvent> {
		// Clean up any existing connection with same sessionId
		if (this.connections.has(sessionId)) {
			this.unsubscribe(sessionId)
		}

		const subject = new Subject<SseEvent>()
		const connection: SseConnection = {
			userId,
			sessionId,
			subject,
			connectedAt: new Date(),
			lastHeartbeat: new Date()
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
		const connectedEvent: SseEvent = {
			type: SSE_EVENT_TYPES.CONNECTED,
			timestamp: new Date().toISOString(),
			payload: {
				userId,
				sessionId
			}
		}
		subject.next(connectedEvent)

		// Return observable that maps events to SSE format
		return subject.asObservable()
	}

	/**
	 * Unsubscribe a session from SSE events
	 */
	unsubscribe(sessionId: string): void {
		const connection = this.connections.get(sessionId)
		if (!connection) {
			return
		}

		// Complete the subject
		connection.subject.complete()

		// Remove from connections
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
		let errorCount = 0

		for (const sessionId of sessionIds) {
			const connection = this.connections.get(sessionId)
			if (connection) {
				try {
					connection.subject.next(event)
					deliveredCount++
				} catch (error) {
					errorCount++
					this.logger.error('Failed to broadcast SSE event to session', {
						context: 'SseService',
						userId,
						sessionId,
						eventType: event.type,
						error: error instanceof Error ? error.message : String(error)
					})
					// Clean up failed connection
					this.unsubscribe(sessionId)
				}
			}
		}

		this.logger.debug('SSE event broadcast complete', {
			context: 'SseService',
			userId,
			eventType: event.type,
			deliveredCount,
			errorCount
		})
	}

	/**
	 * Broadcast an event to all connected users
	 */
	async broadcastToAll(event: SseEvent): Promise<void> {
		let deliveredCount = 0
		let errorCount = 0

		for (const [sessionId, connection] of this.connections) {
			try {
				connection.subject.next(event)
				deliveredCount++
			} catch (error) {
				errorCount++
				this.logger.error('Failed to broadcast SSE event', {
					context: 'SseService',
					sessionId,
					eventType: event.type,
					error: error instanceof Error ? error.message : String(error)
				})
				this.unsubscribe(sessionId)
			}
		}

		this.logger.debug('SSE broadcast to all complete', {
			context: 'SseService',
			eventType: event.type,
			deliveredCount,
			errorCount
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
	getStats(): {
		totalConnections: number
		uniqueUsers: number
		oldestConnection: Date | null
	} {
		let oldestConnection: Date | null = null

		for (const connection of this.connections.values()) {
			if (!oldestConnection || connection.connectedAt < oldestConnection) {
				oldestConnection = connection.connectedAt
			}
		}

		return {
			totalConnections: this.connections.size,
			uniqueUsers: this.userSessions.size,
			oldestConnection
		}
	}

	/**
	 * Check if a user has any active connections
	 */
	isUserConnected(userId: string): boolean {
		const sessions = this.userSessions.get(userId)
		return sessions !== undefined && sessions.size > 0
	}

	/**
	 * Start heartbeat timer to keep connections alive
	 */
	private startHeartbeat(): void {
		this.heartbeatTimer = setInterval(() => {
			this.sendHeartbeats()
			this.cleanupStaleConnections()
		}, this.HEARTBEAT_INTERVAL)
	}

	/**
	 * Stop heartbeat timer
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer)
			this.heartbeatTimer = null
		}
	}

	/**
	 * Send heartbeat to all connections
	 */
	private sendHeartbeats(): void {
		const heartbeatEvent: SseEvent = {
			type: SSE_EVENT_TYPES.HEARTBEAT,
			timestamp: new Date().toISOString(),
			payload: {
				serverTime: new Date().toISOString()
			}
		}

		for (const connection of this.connections.values()) {
			try {
				connection.subject.next(heartbeatEvent)
				connection.lastHeartbeat = new Date()
			} catch {
				// Connection will be cleaned up in cleanupStaleConnections
			}
		}
	}

	/**
	 * Clean up stale connections that haven't received heartbeats
	 */
	private cleanupStaleConnections(): void {
		const now = Date.now()
		const staleSessionIds: string[] = []

		for (const [sessionId, connection] of this.connections) {
			if (now - connection.lastHeartbeat.getTime() > this.CONNECTION_TIMEOUT) {
				staleSessionIds.push(sessionId)
			}
		}

		for (const sessionId of staleSessionIds) {
			this.logger.warn('Cleaning up stale SSE connection', {
				context: 'SseService',
				sessionId
			})
			this.unsubscribe(sessionId)
		}
	}

	/**
	 * Close all connections (for shutdown)
	 */
	private closeAllConnections(): void {
		for (const sessionId of [...this.connections.keys()]) {
			this.unsubscribe(sessionId)
		}
	}
}
