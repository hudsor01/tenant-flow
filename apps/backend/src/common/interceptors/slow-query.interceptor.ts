import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { FastifyRequest } from 'fastify'

// Configuration interface for slow query detection
interface SlowQueryConfig {
	warningThreshold: number // ms - log warning
	errorThreshold: number // ms - log error
	enableStackTrace: boolean // include stack trace in logs
	excludeHealthChecks: boolean // skip health check endpoints
}

// Query performance metrics
interface QueryMetrics {
	endpoint: string
	method: string
	duration: number
	timestamp: string
	userId?: string
	correlationId?: string
	stackTrace?: string
}

/**
 * Slow Query Detection Interceptor
 * 
 * Monitors database query performance and logs slow operations.
 * Integrates with existing Winston logging system.
 * Provides threshold-based alerting for performance issues.
 */
@Injectable()
export class SlowQueryInterceptor implements NestInterceptor<unknown, unknown> {
	private readonly logger = new Logger(SlowQueryInterceptor.name)
	private readonly config: SlowQueryConfig

	constructor(config?: Partial<SlowQueryConfig>) {
		this.config = {
			warningThreshold: 500, // 500ms warning threshold
			errorThreshold: 2000, // 2s error threshold
			enableStackTrace: process.env.NODE_ENV === 'development',
			excludeHealthChecks: true,
			...config
		}
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<FastifyRequest & { user?: { id: string } }>()
		const startTime = Date.now()
		
		// Skip health check endpoints if configured
		if (this.config.excludeHealthChecks && this.isHealthCheckEndpoint(request.url)) {
			return next.handle()
		}

		return next.handle().pipe(
			tap(() => {
				const duration = Date.now() - startTime
				
				// Only log if it exceeds warning threshold
				if (duration >= this.config.warningThreshold) {
					this.logSlowQuery(request, duration)
				}
			})
		)
	}

	/**
	 * Logs slow query performance metrics
	 */
	private logSlowQuery(request: FastifyRequest & { user?: { id: string } }, duration: number): void {
		const metrics: QueryMetrics = {
			endpoint: request.url,
			method: request.method,
			duration,
			timestamp: new Date().toISOString(),
			userId: request.user?.id,
			correlationId: request.headers['x-correlation-id'] as string
		}

		// Add stack trace in development
		if (this.config.enableStackTrace) {
			metrics.stackTrace = new Error().stack?.split('\n').slice(1, 6).join('\n')
		}

		const logMessage = `Slow query detected: ${metrics.method} ${metrics.endpoint} took ${duration}ms`
		const logContext = {
			duration,
			endpoint: metrics.endpoint,
			method: metrics.method,
			userId: metrics.userId,
			correlationId: metrics.correlationId,
			...(metrics.stackTrace && { stackTrace: metrics.stackTrace })
		}

		// Log based on severity
		if (duration >= this.config.errorThreshold) {
			this.logger.error(logMessage, logContext)
			
			// Could integrate with external monitoring here
			// e.g., send to DataDog, Sentry, etc.
			if (process.env.NODE_ENV === 'production') {
				this.logger.error('SLOW_QUERY_ALERT', {
					...logContext,
					severity: 'critical',
					threshold: this.config.errorThreshold
				})
			}
		} else {
			this.logger.warn(logMessage, logContext)
		}

		// Performance insights
		this.logPerformanceInsights(metrics)
	}

	/**
	 * Provides performance insights and recommendations
	 */
	private logPerformanceInsights(metrics: QueryMetrics): void {
		const insights: string[] = []

		// Analyze endpoint patterns
		if (metrics.endpoint.includes('/api/v1/')) {
			if (metrics.duration > 1000) {
				insights.push('Consider implementing pagination for large datasets')
			}
			
			if (metrics.method === 'GET' && metrics.duration > 800) {
				insights.push('Consider adding response caching for this GET endpoint')
			}

			if (metrics.method === 'POST' && metrics.duration > 1500) {
				insights.push('Consider implementing async processing for heavy POST operations')
			}
		}

		// Database-specific insights
		if (metrics.duration > 2000) {
			insights.push('Check database indices for this query pattern')
			insights.push('Consider implementing query optimization')
		}

		if (insights.length > 0) {
			this.logger.log('Performance insights:', {
				endpoint: metrics.endpoint,
				insights,
				correlationId: metrics.correlationId
			})
		}
	}

	/**
	 * Checks if the endpoint is a health check
	 */
	private isHealthCheckEndpoint(url: string): boolean {
		const healthEndpoints = ['/health', '/ping', '/status', '/ready', '/live']
		return healthEndpoints.some(endpoint => url.includes(endpoint))
	}
}

/**
 * Factory function to create configured slow query interceptor
 */
export const createSlowQueryInterceptor = (config?: Partial<SlowQueryConfig>) => {
	return new SlowQueryInterceptor(config)
}

/**
 * Default configuration for different environments
 */
export const SlowQueryConfig = {
	development: {
		warningThreshold: 300,
		errorThreshold: 1000,
		enableStackTrace: true,
		excludeHealthChecks: true
	},
	production: {
		warningThreshold: 500,
		errorThreshold: 2000,
		enableStackTrace: false,
		excludeHealthChecks: true
	},
	testing: {
		warningThreshold: 1000,
		errorThreshold: 5000,
		enableStackTrace: false,
		excludeHealthChecks: true
	}
} as const