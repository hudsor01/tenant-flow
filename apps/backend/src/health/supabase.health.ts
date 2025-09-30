import { Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class SupabaseHealthIndicator {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly healthIndicatorService: HealthIndicatorService
	) {}

	async pingCheck<const TKey extends string>(key: TKey) {
		const indicator = this.healthIndicatorService.check(key)
		const startTime = Date.now()

		try {
			const result = await Promise.race([
				this.supabaseService.checkConnection(),
				this.createTimeoutPromise(3000)
			])

			const responseTime = Date.now() - startTime
			const isHealthy = result.status === 'healthy'

			if (!isHealthy) {
				return indicator.down({
					message: result.message || 'Database connection check',
					responseTime,
					supabaseStatus: result.status,
					hasUrl: !!process.env.SUPABASE_URL,
					hasKey:
						!!(
							process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
						)
				})
			}

			return indicator.up({
				message: result.message || 'Database connection healthy',
				responseTime,
				supabaseStatus: result.status,
				hasUrl: !!process.env.SUPABASE_URL,
				hasKey:
					!!(
						process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
					)
			})
		} catch (error: unknown) {
			const responseTime = Date.now() - startTime

			return indicator.down({
				responseTime,
				error: {
					type:
						error instanceof Error
							? error.constructor.name
							: 'Unknown',
					message:
						error instanceof Error ? error.message : String(error)
				}
			})
		}
	}

	async quickPing<const TKey extends string>(key: TKey) {
		const indicator = this.healthIndicatorService.check(key)
		const startTime = Date.now()

		try {
			const result = await Promise.race([
				this.supabaseService.checkConnection(),
				this.createTimeoutPromise(1000)
			])

			const responseTime = Date.now() - startTime
			const isHealthy = result.status === 'healthy'

			if (!isHealthy) {
				return indicator.down({
					responseTime,
					supabaseStatus: result.status,
					message: result.message
				})
			}

			return indicator.up({
				responseTime,
				supabaseStatus: result.status,
				message: result.message
			})
		} catch (error: unknown) {
			const responseTime = Date.now() - startTime

			return indicator.down({
				responseTime,
				error: {
					message:
						error instanceof Error ? error.message : String(error),
					type:
						error instanceof Error
							? error.constructor.name
							: 'Unknown'
				}
			})
		}
	}

	private createTimeoutPromise(timeoutMs: number): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Database timeout after ${timeoutMs}ms`))
			}, timeoutMs)
		})
	}
}
