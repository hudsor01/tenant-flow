import { Injectable } from '@nestjs/common'
import type { ServiceHealth } from '@repo/shared/types/health'

export interface CircuitBreakerStatus {
	timestamp: string
	services: Record<
		string,
		{
			open: boolean
			lastSuccess: number | null
			failureCount: number
		}
	>
	systemStatus: 'healthy' | 'degraded'
}

@Injectable()
export class CircuitBreakerService {
	private healthCheckCache = new Map<
		string,
		{ result: ServiceHealth; timestamp: number }
	>()

	/**
	 * Get circuit breaker status for all monitored services
	 */
	getCircuitBreakerStatus(): CircuitBreakerStatus {
		const services = ['database', 'stripe', 'cache']
		const status = services.reduce(
			(acc, service) => {
				const cached = this.healthCheckCache.get(service)
				const isStale = !cached || Date.now() - cached.timestamp > 60_000

				acc[service] = {
					open: isStale || !cached.result.healthy,
					lastSuccess: cached?.timestamp || null,
					failureCount: 0 // Implement failure tracking if needed
				}
				return acc
			},
			{} as Record<
				string,
				{
					open: boolean
					lastSuccess: number | null
					failureCount: number
				}
			>
		)

		return {
			timestamp: new Date().toISOString(),
			services: status,
			systemStatus: Object.values(status).some(s => s.open)
				? 'degraded'
				: 'healthy'
		}
	}

	/**
	 * Update service health in cache for circuit breaker logic
	 */
	updateServiceHealth(service: string, health: ServiceHealth) {
		this.healthCheckCache.set(service, {
			result: health,
			timestamp: Date.now()
		})
	}

	/**
	 * Check if service circuit is open (failing)
	 */
	isCircuitOpen(service: string): boolean {
		const cached = this.healthCheckCache.get(service)
		const isStale = !cached || Date.now() - cached.timestamp > 60_000
		return isStale || !cached.result.healthy
	}
}
