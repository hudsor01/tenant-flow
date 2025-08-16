import { applyDecorators, UseInterceptors } from '@nestjs/common'
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Observable, of, throwError } from 'rxjs'
import { catchError, retry, tap, timeout } from 'rxjs/operators'

/**
 * Circuit breaker states
 */
enum CircuitState {
	CLOSED = 'CLOSED',
	OPEN = 'OPEN',
	HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
	failureThreshold?: number // Number of failures before opening
	successThreshold?: number // Number of successes to close from half-open
	timeout?: number // Request timeout in ms
	resetTimeout?: number // Time before trying half-open in ms
	fallbackResponse?: unknown // Response when circuit is open
}

/**
 * Circuit Breaker Interceptor
 * Implements the circuit breaker pattern for external service calls
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
	private state: CircuitState = CircuitState.CLOSED
	private failureCount = 0
	private successCount = 0
	private lastFailureTime?: Date
	private readonly logger = new Logger('CircuitBreaker')

	constructor(private readonly options: CircuitBreakerOptions = {}) {
		this.options = {
			failureThreshold: 5,
			successThreshold: 2,
			timeout: 10000,
			resetTimeout: 30000,
			...options
		}
	}

	intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
		// Check if circuit should be reset to half-open
		this.checkCircuitReset()

		// If circuit is open, return fallback immediately
		if (this.state === CircuitState.OPEN) {
			this.logger.warn('Circuit breaker is OPEN - returning fallback response')
			return this.options.fallbackResponse 
				? of(this.options.fallbackResponse)
				: throwError(() => new Error('Service unavailable - circuit breaker is open'))
		}

		// Execute the request with timeout and retry logic
		return next.handle().pipe(
			timeout(this.options.timeout ?? 10000),
			retry(this.state === CircuitState.HALF_OPEN ? 0 : 1), // No retry in half-open
			catchError(error => {
				this.onFailure()
				return throwError(() => error)
			}),
			// Add tap to handle success case
			tap(() => this._onSuccess())
		)
	}

	private onFailure(): void {
		this.failureCount++
		this.lastFailureTime = new Date()
		this.successCount = 0

		if (this.failureCount >= (this.options.failureThreshold ?? 5)) {
			this.state = CircuitState.OPEN
			this.logger.error(`Circuit breaker opened after ${this.failureCount} failures`)
		}
	}

	private _onSuccess(): void {
		this.failureCount = 0

		if (this.state === CircuitState.HALF_OPEN) {
			this.successCount++
			if (this.successCount >= (this.options.successThreshold ?? 2)) {
				this.state = CircuitState.CLOSED
				this.successCount = 0
				this.logger.log('Circuit breaker closed after successful recovery')
			}
		}
	}

	private checkCircuitReset(): void {
		if (
			this.state === CircuitState.OPEN &&
			this.lastFailureTime &&
			Date.now() - this.lastFailureTime.getTime() > (this.options.resetTimeout ?? 30000)
		) {
			this.state = CircuitState.HALF_OPEN
			this.logger.log('Circuit breaker moved to HALF_OPEN state')
		}
	}
}

/**
 * Decorator to apply circuit breaker pattern to a controller method
 * 
 * @example
 * @UseCircuitBreaker({ failureThreshold: 3, timeout: 5000 })
 * @Get('external-api')
 * async callExternalApi() { ... }
 */
export function UseCircuitBreaker(options?: CircuitBreakerOptions) {
	return applyDecorators(
		UseInterceptors(new CircuitBreakerInterceptor(options))
	)
}