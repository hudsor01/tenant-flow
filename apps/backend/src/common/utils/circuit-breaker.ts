import { Logger } from '@nestjs/common'

/**
 * Circuit breaker states
 */
enum CircuitState {
	CLOSED = 'CLOSED',
	OPEN = 'OPEN',
	HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerConfig {
	failureThreshold?: number // Failures before opening (default: 5)
	successThreshold?: number // Successes to close from half-open (default: 2)
	timeout?: number // Request timeout in ms (default: 10000)
	resetTimeout?: number // Time before trying half-open in ms (default: 30000)
	fallbackFn?: () => Promise<unknown> // Fallback function when open
}

/**
 * Circuit Breaker implementation for wrapping external service calls
 * Provides automatic failure handling and recovery
 */
export class CircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED
	private failureCount = 0
	private successCount = 0
	private lastFailureTime?: Date
	private readonly logger: Logger
	private readonly config: Required<CircuitBreakerConfig>

	constructor(
		private readonly name: string,
		config: CircuitBreakerConfig = {}
	) {
		this.logger = new Logger(`CircuitBreaker:${name}`)
		this.config = {
			failureThreshold: config.failureThreshold ?? 5,
			successThreshold: config.successThreshold ?? 2,
			timeout: config.timeout ?? 10000,
			resetTimeout: config.resetTimeout ?? 30000,
			fallbackFn: config.fallbackFn ?? (() => Promise.reject(new Error('Circuit breaker is open')))
		}
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check if circuit should be reset to half-open
		this.checkCircuitReset()

		// If circuit is open, use fallback
		if (this.state === CircuitState.OPEN) {
			this.logger.warn(`Circuit is OPEN - using fallback for ${this.name}`)
			return this.config.fallbackFn() as Promise<T>
		}

		try {
			// Create a timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
			})

			// Race between the function and timeout
			const result = await Promise.race([fn(), timeoutPromise]) as T
			
			this.onSuccess()
			return result
		} catch (error) {
			this.onFailure()
			throw error
		}
	}

	private onSuccess(): void {
		this.failureCount = 0

		if (this.state === CircuitState.HALF_OPEN) {
			this.successCount++
			if (this.successCount >= this.config.successThreshold) {
				this.state = CircuitState.CLOSED
				this.successCount = 0
				this.logger.log(`Circuit closed after successful recovery for ${this.name}`)
			}
		}
	}

	private onFailure(): void {
		this.failureCount++
		this.lastFailureTime = new Date()
		this.successCount = 0

		if (this.failureCount >= this.config.failureThreshold) {
			this.state = CircuitState.OPEN
			this.logger.error(`Circuit opened after ${this.failureCount} failures for ${this.name}`)
		}
	}

	private checkCircuitReset(): void {
		if (
			this.state === CircuitState.OPEN &&
			this.lastFailureTime &&
			Date.now() - this.lastFailureTime.getTime() > this.config.resetTimeout
		) {
			this.state = CircuitState.HALF_OPEN
			this.failureCount = 0
			this.logger.log(`Circuit moved to HALF_OPEN state for ${this.name}`)
		}
	}

	/**
	 * Get current circuit state
	 */
	getState(): CircuitState {
		return this.state
	}

	/**
	 * Get circuit statistics
	 */
	getStats() {
		return {
			state: this.state,
			failureCount: this.failureCount,
			successCount: this.successCount,
			lastFailureTime: this.lastFailureTime
		}
	}

	/**
	 * Manually reset the circuit breaker
	 */
	reset(): void {
		this.state = CircuitState.CLOSED
		this.failureCount = 0
		this.successCount = 0
		this.lastFailureTime = undefined
		this.logger.log(`Circuit manually reset for ${this.name}`)
	}
}

/**
 * Global circuit breaker registry for reuse across services
 */
export class CircuitBreakerRegistry {
	private static instance: CircuitBreakerRegistry
	private readonly breakers = new Map<string, CircuitBreaker>()

	static getInstance(): CircuitBreakerRegistry {
		if (!CircuitBreakerRegistry.instance) {
			CircuitBreakerRegistry.instance = new CircuitBreakerRegistry()
		}
		return CircuitBreakerRegistry.instance
	}

	getOrCreate(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
		if (!this.breakers.has(name)) {
			this.breakers.set(name, new CircuitBreaker(name, config))
		}
		const breaker = this.breakers.get(name)
		if (!breaker) {
			throw new Error(`Failed to create circuit breaker: ${name}`)
		}
		return breaker
	}

	get(name: string): CircuitBreaker | undefined {
		return this.breakers.get(name)
	}

	getAllStats() {
		const stats: Record<string, unknown> = {}
		this.breakers.forEach((breaker, name) => {
			stats[name] = breaker.getStats()
		})
		return stats
	}
}