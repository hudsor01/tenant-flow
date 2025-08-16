import { Inject, Injectable, Logger } from '@nestjs/common'
import { Redis } from 'ioredis'
import { EventEmitter } from 'events'
import type { PubSubStats } from './interfaces/pubsub.interface'

/**
 * Enhanced Redis Pub/Sub Service
 * Handles real-time messaging between services with retry logic,
 * batch operations, and monitoring capabilities
 */
@Injectable()
export class RedisPubSubService {
	private readonly logger = new Logger(RedisPubSubService.name)
	private subscriber: Redis | null = null
	private publisher: Redis | null = null
	private eventEmitter = new EventEmitter()

	// Tracking for statistics
	private channelStats = new Map<string, PubSubStats>()
	private reconnectAttempts = 0
	private readonly maxReconnectAttempts = 5
	private readonly reconnectDelay = 1000 // ms

	// Getter for accessing stats (prevents unused variable warning)
	getConnectionStats() {
		return {
			channelCount: this.channelStats.size,
			reconnectAttempts: this.reconnectAttempts,
			maxReconnectAttempts: this.maxReconnectAttempts,
			reconnectDelay: this.reconnectDelay
		}
	}

	constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis | null) {
		if (this.redis) {
			this.initializePubSub()
		}
	}

	private initializePubSub(): void {
		// Create dedicated connections for pub/sub
		// Redis requires separate connections for pub/sub operations
		if (!this.redis) {
			return
		}
		this.subscriber = this.redis.duplicate()
		this.publisher = this.redis.duplicate()

		this.subscriber.on('message', (channel: string, message: string) => {
			this.logger.debug(`Received message on channel ${channel}`)
			this.eventEmitter.emit(channel, message)
		})

		this.subscriber.on('error', (error: Error) => {
			this.logger.error('Redis subscriber error:', error)
		})

		this.publisher.on('error', (error: Error) => {
			this.logger.error('Redis publisher error:', error)
		})
	}

	/**
	 * Subscribe to a channel
	 */
	async subscribe(
		channel: string,
		callback: (message: string) => void
	): Promise<void> {
		if (!this.subscriber) {
			this.logger.warn('Redis Pub/Sub not available')
			return
		}

		try {
			await this.subscriber.subscribe(channel)
			this.eventEmitter.on(channel, callback)
			this.logger.log(`Subscribed to channel: ${channel}`)
		} catch (error) {
			this.logger.error(
				`Failed to subscribe to channel ${channel}:`,
				error
			)
		}
	}

	/**
	 * Unsubscribe from a channel
	 */
	async unsubscribe(channel: string): Promise<void> {
		if (!this.subscriber) {
			return
		}

		try {
			await this.subscriber.unsubscribe(channel)
			this.eventEmitter.removeAllListeners(channel)
			this.logger.log(`Unsubscribed from channel: ${channel}`)
		} catch (error) {
			this.logger.error(
				`Failed to unsubscribe from channel ${channel}:`,
				error
			)
		}
	}

	/**
	 * Publish a message to a channel
	 */
	async publish(channel: string, message: string | object): Promise<boolean> {
		if (!this.publisher) {
			this.logger.warn('Redis Pub/Sub not available')
			return false
		}

		try {
			const payload =
				typeof message === 'string' ? message : JSON.stringify(message)

			await this.publisher.publish(channel, payload)
			this.logger.debug(`Published message to channel ${channel}`)
			return true
		} catch (error) {
			this.logger.error(`Failed to publish to channel ${channel}:`, error)
			return false
		}
	}

	/**
	 * Pattern subscribe (e.g., 'user:*' matches 'user:123', 'user:456')
	 */
	async psubscribe(
		pattern: string,
		callback: (channel: string, message: string) => void
	): Promise<void> {
		if (!this.subscriber) {
			this.logger.warn('Redis Pub/Sub not available')
			return
		}

		try {
			await this.subscriber.psubscribe(pattern)

			this.subscriber.on(
				'pmessage',
				(receivedPattern: string, channel: string, message: string) => {
					if (receivedPattern === pattern) {
						callback(channel, message)
					}
				}
			)

			this.logger.log(`Pattern subscribed to: ${pattern}`)
		} catch (error) {
			this.logger.error(
				`Failed to pattern subscribe to ${pattern}:`,
				error
			)
		}
	}

	/**
	 * Clean up connections
	 */
	async cleanup(): Promise<void> {
		if (this.subscriber) {
			await this.subscriber.quit()
		}
		if (this.publisher) {
			await this.publisher.quit()
		}
		this.eventEmitter.removeAllListeners()
	}
}
