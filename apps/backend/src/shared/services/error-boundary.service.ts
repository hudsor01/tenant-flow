/**
 * Error Boundary Service - Zero-Downtime Architecture
 * Implements service isolation to prevent cascading failures
 * Follows Apple's resilience engineering principles
 */

import { Injectable, Logger, Inject } from '@nestjs/common'
import { ZeroCacheService } from '../../cache/cache.service'

interface CircuitState {
	isOpen: boolean
	failureCount: number
	lastFailureTime: number
	lastSuccessTime: number
	nextAttemptTime: number
}

interface ErrorBoundaryOptions {
	maxFailures: number
	timeWindow: number
	circuitOpenTime: number
	enableCircuitBreaker: boolean
}

interface ServiceMetrics {
	totalRequests: number
	successCount: number
	failureCount: number
	avgResponseTime: number
	lastError?: string
	lastErrorTime?: number
}

@Injectable()
export class ErrorBoundaryService {
	private circuitStates = new Map<string, CircuitState>()
	private serviceMetrics = new Map<string, ServiceMetrics>()
	private responseTimeHistory = new Map<string, number[]>()

	private readonly defaultOptions: ErrorBoundaryOptions = {
		maxFailures: 5,
		timeWindow: 60_000, // 1 minute
		circuitOpenTime: 30_000, // 30 seconds
		enableCircuitBreaker: true
	}

	constructor(
		private readonly cacheService: ZeroCacheService,
		@Inject(Logger) private readonly logger: Logger
	) {}

	/**
	 * Execute operation with error boundary protection
	 * Returns fallback data if circuit is open or operation fails
	 */
	async execute<T>(
		serviceKey: string,
		operation: () => Promise<T>,
		fallback?: () => Promise<T> | T,
		options?: Partial<ErrorBoundaryOptions>
	): Promise<T> {
		const opts = { ...this.defaultOptions, ...options }
		const startTime = Date.now()

		// Check circuit breaker state
		if (opts.enableCircuitBreaker && this.isCircuitOpen(serviceKey)) {
			this.logger.warn(`Circuit breaker OPEN for ${serviceKey}, using fallback`)

			if (fallback) {
				return typeof fallback === 'function' ? await fallback() : fallback
			}

			throw new Error(`Service ${serviceKey} is currently unavailable (circuit breaker open)`)
		}

		try {
			// Execute the operation
			const result = await Promise.race([
				operation(),
				this.timeoutPromise(5000) // 5 second timeout for sub-200ms goal
			]) as T

			// Record success metrics
			const responseTime = Date.now() - startTime
			this.recordSuccess(serviceKey, responseTime)

			return result
		} catch (error) {
			const responseTime = Date.now() - startTime
			this.recordFailure(serviceKey, error, responseTime)

			// Update circuit breaker state
			if (opts.enableCircuitBreaker) {
				this.updateCircuitState(serviceKey, false, opts)
			}

			// Try fallback if available
			if (fallback) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				this.logger.warn(`Operation failed for ${serviceKey}, using fallback`, { error: errorMessage })
				return typeof fallback === 'function' ? await fallback() : fallback as T
			}

			// Re-throw if no fallback
			throw error
		}
	}

	/**
	 * Execute with cache fallback - critical for zero-downtime
	 */
	async executeWithCache<T>(
		serviceKey: string,
		cacheKey: string,
		operation: () => Promise<T>,
		cacheTtl = 300_000, // 5 minutes default
		options?: Partial<ErrorBoundaryOptions>
	): Promise<T> {
		// Try cache first for performance
		const cachedResult = this.cacheService.get<T>(cacheKey)
		const fallback = cachedResult !== null ? (() => cachedResult as T) : undefined

		try {
			const result = await this.execute(serviceKey, operation, fallback, options)

			// Cache successful result
			if (result !== cachedResult) {
				this.cacheService.set(cacheKey, result, cacheTtl, [serviceKey])
			}

			return result
		} catch (error) {
			// If we have cached data, return it
			if (cachedResult !== null) {
				this.logger.warn(`Returning cached data for ${serviceKey} due to error`, { error: error instanceof Error ? error.message : String(error) })
				return cachedResult
			}

			throw error
		}
	}

	/**
	 * Get service health status for monitoring
	 */
	getServiceHealth(serviceKey: string): {
		status: 'healthy' | 'degraded' | 'unhealthy'
		metrics: ServiceMetrics
		circuit: CircuitState
	} {
		const circuit = this.getCircuitState(serviceKey)
		const metrics = this.getServiceMetrics(serviceKey)

		let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

		if (circuit.isOpen) {
			status = 'unhealthy'
		} else if (metrics.failureCount > 0 || metrics.avgResponseTime > 1000) {
			status = 'degraded'
		}

		return { status, metrics, circuit }
	}

	/**
	 * Get all service health statuses
	 */
	getAllServiceHealth(): Record<string, any> {
		const services: Record<string, any> = {}

		for (const serviceKey of this.serviceMetrics.keys()) {
			services[serviceKey] = this.getServiceHealth(serviceKey)
		}

		return services
	}

	/**
	 * Reset circuit breaker for manual recovery
	 */
	resetCircuitBreaker(serviceKey: string): void {
		const state = this.getCircuitState(serviceKey)
		state.isOpen = false
		state.failureCount = 0
		state.nextAttemptTime = 0

		this.logger.log(`Circuit breaker reset for ${serviceKey}`)
	}

	/**
	 * Get performance metrics for monitoring
	 */
	getPerformanceMetrics(): {
		totalServices: number
		healthyServices: number
		degradedServices: number
		unhealthyServices: number
		circuitBreakerStats: {
			openCircuits: number
			totalCircuits: number
		}
	} {
		const services = this.getAllServiceHealth()
		const statuses = Object.values(services).map(s => s.status)

		return {
			totalServices: statuses.length,
			healthyServices: statuses.filter(s => s === 'healthy').length,
			degradedServices: statuses.filter(s => s === 'degraded').length,
			unhealthyServices: statuses.filter(s => s === 'unhealthy').length,
			circuitBreakerStats: {
				openCircuits: Array.from(this.circuitStates.values()).filter(s => s.isOpen).length,
				totalCircuits: this.circuitStates.size
			}
		}
	}

	private isCircuitOpen(serviceKey: string): boolean {
		const state = this.getCircuitState(serviceKey)

		if (!state.isOpen) {
			return false
		}

		// Check if circuit should be half-open
		if (Date.now() >= state.nextAttemptTime) {
			state.isOpen = false // Half-open state
			this.logger.log(`Circuit breaker half-open for ${serviceKey}`)
		}

		return state.isOpen
	}

	private updateCircuitState(serviceKey: string, success: boolean, options: ErrorBoundaryOptions): void {
		const state = this.getCircuitState(serviceKey)

		if (success) {
			state.failureCount = 0
			state.lastSuccessTime = Date.now()
			if (state.isOpen) {
				state.isOpen = false
				this.logger.log(`Circuit breaker closed for ${serviceKey} (recovered)`)
			}
		} else {
			state.failureCount++
			state.lastFailureTime = Date.now()

			if (state.failureCount >= options.maxFailures) {
				state.isOpen = true
				state.nextAttemptTime = Date.now() + options.circuitOpenTime
				this.logger.error(`Circuit breaker OPENED for ${serviceKey} (${state.failureCount} failures)`)

				// Invalidate cache for this service to prevent stale data
				this.cacheService.invalidate(serviceKey, 'circuit_breaker_opened')
			}
		}
	}

	private getCircuitState(serviceKey: string): CircuitState {
		if (!this.circuitStates.has(serviceKey)) {
			this.circuitStates.set(serviceKey, {
				isOpen: false,
				failureCount: 0,
				lastFailureTime: 0,
				lastSuccessTime: Date.now(),
				nextAttemptTime: 0
			})
		}
		return this.circuitStates.get(serviceKey)!
	}

	private getServiceMetrics(serviceKey: string): ServiceMetrics {
		if (!this.serviceMetrics.has(serviceKey)) {
			this.serviceMetrics.set(serviceKey, {
				totalRequests: 0,
				successCount: 0,
				failureCount: 0,
				avgResponseTime: 0
			})
		}
		return this.serviceMetrics.get(serviceKey)!
	}

	private recordSuccess(serviceKey: string, responseTime: number): void {
		const metrics = this.getServiceMetrics(serviceKey)

		metrics.totalRequests++
		metrics.successCount++
		this.updateAverageResponseTime(serviceKey, responseTime)

		// Update circuit breaker
		this.updateCircuitState(serviceKey, true, this.defaultOptions)
	}

	private recordFailure(serviceKey: string, error: any, responseTime: number): void {
		const metrics = this.getServiceMetrics(serviceKey)

		metrics.totalRequests++
		metrics.failureCount++
		metrics.lastError = error.message || String(error)
		metrics.lastErrorTime = Date.now()
		this.updateAverageResponseTime(serviceKey, responseTime)
	}

	private updateAverageResponseTime(serviceKey: string, responseTime: number): void {
		const metrics = this.getServiceMetrics(serviceKey)
		const history = this.responseTimeHistory.get(serviceKey) || []

		history.push(responseTime)
		// Keep only last 100 measurements
		if (history.length > 100) {
			history.shift()
		}

		metrics.avgResponseTime = history.reduce((sum, time) => sum + time, 0) / history.length
		this.responseTimeHistory.set(serviceKey, history)
	}

	private timeoutPromise<T>(ms: number): Promise<T> {
		return new Promise((_, reject) => {
			setTimeout(() => reject(new Error(`Operation timeout after ${ms}ms`)), ms)
		})
	}
}