import { Injectable, Logger } from '@nestjs/common'
import { requestContext } from '@fastify/request-context'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { TenantRequestContext } from './request-context.service'

/**
 * Request Context Hooks Service
 * 
 * Integrates with @fastify/request-context to populate request metadata
 * and handle request lifecycle events. This service bridges Fastify hooks
 * with our RequestContextService.
 */
@Injectable()
export class RequestContextHooksService {
	private readonly logger = new Logger(RequestContextHooksService.name)

	/**
	 * Register hooks to populate request context
	 * Should be called from main.ts after @fastify/request-context registration
	 */
	registerContextHooks(fastify: FastifyInstance): void {
		// Populate request metadata early
		fastify.addHook('onRequest', this.populateRequestMetadata.bind(this))
		
		// Add response timing on completion
		fastify.addHook('onResponse', this.completeRequestTiming.bind(this))
		
		// Add correlation ID to response headers
		fastify.addHook('onSend', this.addResponseHeaders.bind(this))

		this.logger.log('Request context hooks registered')
	}

	/**
	 * Populate basic request metadata in the context store
	 */
	private async populateRequestMetadata(
		request: FastifyRequest,
		_reply: FastifyReply
	): Promise<void> {
		try {
			const store = requestContext.get( 'store' ) as unknown as TenantRequestContext

			if (store) {
				// Update with actual request data
				store.method = request.method
				store.path = request.url || 'unknown'
				store.ip = this.getClientIP(request)
				store.userAgent = request.headers['user-agent']

				// Ensure timing is properly initialized
				if (!store.timing) {
					store.timing = { startTime: Date.now() }
				}
			}
		} catch (error) {
			this.logger.warn('Failed to populate request metadata', { error })
		}
	}

	/**
	 * Complete request timing when response is sent
	 */
	private async completeRequestTiming(
		_request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const store = requestContext.get( 'store' ) as unknown as TenantRequestContext

			if (store?.timing) {
				store.timing.endTime = Date.now()
				store.timing.duration = store.timing.endTime - store.timing.startTime

				// Log slow requests
				if (store.timing.duration > 1000) {
					this.logger.warn(`Slow request detected`, {
						correlationId: store.correlationId,
						path: store.path,
						method: store.method,
						duration: store.timing.duration,
						statusCode: reply.statusCode
					})
				}
			}
		} catch (error) {
			this.logger.warn('Failed to complete request timing', { error })
		}
	}

	/**
	 * Add correlation ID and other context to response headers
	 */
	private async addResponseHeaders(
		_request: FastifyRequest,
		reply: FastifyReply,
		payload: unknown
	): Promise<unknown> {
		try {
			const store = requestContext.get( 'store' ) as unknown as TenantRequestContext

			if (store) {
				// Add correlation ID for debugging
				reply.header('x-correlation-id', store.correlationId)
				
				// Add trace ID for distributed tracing
				if (store.traceId) {
					reply.header('x-trace-id', store.traceId)
				}

				// Add response time
				if (store.timing?.duration) {
					reply.header('x-response-time', `${store.timing.duration}ms`)
				}

				// Add tenant ID for multi-tenant apps (if available)
				if (store.organizationId) {
					reply.header('x-organization-id', store.organizationId)
				}
			}
		} catch (error) {
			this.logger.warn('Failed to add response headers', { error })
		}

		return payload
	}

	/**
	 * Get client IP address accounting for proxies
	 */
	private getClientIP(request: FastifyRequest): string {
		// Check various headers for real IP (in order of trust)
		const forwardedFor = request.headers['x-forwarded-for']
		const realIP = request.headers['x-real-ip']
		const cfConnectingIP = request.headers['cf-connecting-ip']

		if (forwardedFor) {
			const ip = Array.isArray(forwardedFor)
				? forwardedFor[0]
				: forwardedFor.split(',')[0]
			return ip?.trim() || 'unknown'
		}

		if (cfConnectingIP) {
			return Array.isArray(cfConnectingIP)
				? cfConnectingIP[0] || 'unknown'
				: cfConnectingIP
		}

		if (realIP) {
			return Array.isArray(realIP) ? realIP[0] || 'unknown' : realIP
		}

		return request.ip || 'unknown'
	}
}