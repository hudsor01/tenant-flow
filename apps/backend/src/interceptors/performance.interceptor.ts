/**
 * Performance Monitoring Interceptor - Zero-Downtime Architecture
 * Implements Apple's sub-200ms response time guarantee
 * Monitors and logs performance violations for continuous improvement
 */

import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
	Inject
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { tap, catchError, timeout } from 'rxjs/operators'

interface PerformanceMetrics {
	endpoint: string
	method: string
	duration: number
	timestamp: string
	status: 'success' | 'error' | 'timeout'
	userId?: string
	userAgent?: string
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
	private readonly performanceTargets = {
		GET: 200, // 200ms for read operations
		POST: 500, // 500ms for write operations
		PUT: 500,
		PATCH: 500,
		DELETE: 300 // 300ms for delete operations
	}

	private readonly criticalPaths = new Set([
		'/health/ping',
		'/health/ready',
		'/health/system',
		'/auth/validate',
		'/dashboard/stats'
	])

	private performanceHistory: PerformanceMetrics[] = []
	private readonly maxHistorySize = 1000

	constructor(@Inject(Logger) private readonly logger: Logger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest()
		const response = context.switchToHttp().getResponse()

		const startTime = Date.now()
		const method = request.method
		const endpoint = this.normalizeEndpoint(request.url)
		const isCriticalPath = this.criticalPaths.has(endpoint)
		const targetTime = this.performanceTargets[method as keyof typeof this.performanceTargets] || 1000

		// Apply stricter timeout for critical paths
		const timeoutMs = isCriticalPath ? Math.min(targetTime, 100) : targetTime * 2

		return next.handle().pipe(
			timeout(timeoutMs),
			tap(() => {
				const duration = Date.now() - startTime
				this.recordMetrics(request, 'success', duration, endpoint, method)

				// Log performance violations
				if (duration > targetTime) {
					const severity = isCriticalPath ? 'warn' : 'debug'
					this.logger[severity](`Performance violation: ${method} ${endpoint}`, {
						duration,
						target: targetTime,
						violation: duration - targetTime,
						critical: isCriticalPath,
						userId: request.user?.id
					})
				}

				// Add performance headers for monitoring
				response.setHeader('X-Response-Time', `${duration}ms`)
				response.setHeader('X-Performance-Target', `${targetTime}ms`)

				if (duration > targetTime) {
					response.setHeader('X-Performance-Violation', `${duration - targetTime}ms`)
				}
			}),
			catchError(error => {
				const duration = Date.now() - startTime
				const isTimeout = error.name === 'TimeoutError'

				this.recordMetrics(
					request,
					isTimeout ? 'timeout' : 'error',
					duration,
					endpoint,
					method
				)

				if (isTimeout) {
					this.logger.error(`Request timeout: ${method} ${endpoint}`, {
						duration,
						timeoutMs,
						critical: isCriticalPath,
						userId: request.user?.id
					})
				}

				return throwError(() => error)
			})
		)
	}

	/**
	 * Get performance statistics for monitoring
	 */
	getPerformanceStats(): {
		totalRequests: number
		averageResponseTime: number
		violationRate: number
		timeoutRate: number
		criticalPathStats: any
		recentViolations: PerformanceMetrics[]
	} {
		const total = this.performanceHistory.length
		if (total === 0) {
			return {
				totalRequests: 0,
				averageResponseTime: 0,
				violationRate: 0,
				timeoutRate: 0,
				criticalPathStats: {},
				recentViolations: []
			}
		}

		const avgResponseTime = this.performanceHistory.reduce((sum, m) => sum + m.duration, 0) / total
		const violations = this.performanceHistory.filter(m => {
			const target = this.performanceTargets[m.method as keyof typeof this.performanceTargets] || 1000
			return m.duration > target
		})
		const timeouts = this.performanceHistory.filter(m => m.status === 'timeout')

		// Critical path analysis
		const criticalPathStats: Record<string, {
			requests: number
			averageTime: number
			violations: number
		}> = {}
		for (const path of this.criticalPaths) {
			const pathMetrics = this.performanceHistory.filter(m => m.endpoint === path)
			if (pathMetrics.length > 0) {
				criticalPathStats[path] = {
					requests: pathMetrics.length,
					averageTime: pathMetrics.reduce((sum, m) => sum + m.duration, 0) / pathMetrics.length,
					violations: pathMetrics.filter(m => m.duration > 100).length // 100ms for critical paths
				}
			}
		}

		return {
			totalRequests: total,
			averageResponseTime: Math.round(avgResponseTime),
			violationRate: Math.round((violations.length / total) * 100),
			timeoutRate: Math.round((timeouts.length / total) * 100),
			criticalPathStats,
			recentViolations: violations
				.filter(v => Date.now() - new Date(v.timestamp).getTime() < 300_000) // Last 5 minutes
				.slice(-20) // Last 20 violations
		}
	}

	/**
	 * Get health status based on performance metrics
	 */
	getHealthStatus(): {
		healthy: boolean
		issues: string[]
		metrics: any
	} {
		const stats = this.getPerformanceStats()
		const issues: string[] = []
		let healthy = true

		// Check violation rate - should be < 5%
		if (stats.violationRate > 5) {
			healthy = false
			issues.push(`High violation rate: ${stats.violationRate}%`)
		}

		// Check timeout rate - should be < 1%
		if (stats.timeoutRate > 1) {
			healthy = false
			issues.push(`High timeout rate: ${stats.timeoutRate}%`)
		}

		// Check average response time - should be < 150ms
		if (stats.averageResponseTime > 150) {
			healthy = false
			issues.push(`High average response time: ${stats.averageResponseTime}ms`)
		}

		// Check critical paths
		for (const [path, pathStats] of Object.entries(stats.criticalPathStats) as [string, any][]) {
			if (pathStats.averageTime > 100) {
				healthy = false
				issues.push(`Critical path slow: ${path} (${pathStats.averageTime}ms)`)
			}
		}

		return {
			healthy,
			issues,
			metrics: stats
		}
	}

	private recordMetrics(
		request: any,
		status: 'success' | 'error' | 'timeout',
		duration: number,
		endpoint: string,
		method: string
	): void {
		const metrics: PerformanceMetrics = {
			endpoint,
			method,
			duration,
			timestamp: new Date().toISOString(),
			status,
			userId: request.user?.id,
			userAgent: request.headers['user-agent']
		}

		this.performanceHistory.push(metrics)

		// Maintain rolling history
		if (this.performanceHistory.length > this.maxHistorySize) {
			this.performanceHistory.shift()
		}
	}

	private normalizeEndpoint(url: string): string {
		// Remove query parameters and normalize dynamic segments
		const cleanUrl = url.split('?')[0]

		// Replace UUIDs with placeholders for grouping
		return cleanUrl ? cleanUrl.replace(
			/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
			'/:id'
		) : ''
	}
}