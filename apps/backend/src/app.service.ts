import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from './database/supabase.service'

@Injectable()
export class AppService {
	private readonly logger = new Logger(AppService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Health check endpoint
	 * Returns uptime and Supabase DB status
	 */
	async healthCheck(): Promise<{
		status: 'ok' | 'error'
		uptime: number
		db: 'healthy' | 'unhealthy'
		message?: string
	}> {
		const uptime = process.uptime()

		try {
			const dbStatus = await this.supabaseService.checkConnection()

			const result: {
				status: 'ok' | 'error'
				uptime: number
				db: 'healthy' | 'unhealthy'
				message?: string
			} = {
				status: dbStatus.status === 'healthy' ? 'ok' : 'error',
				uptime,
				db: dbStatus.status
			}

			if (dbStatus.message !== undefined) {
				result.message = dbStatus.message
			}

			return result
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error('Health check failed', error)
			return {
				status: 'error',
				uptime,
				db: 'unhealthy',
				message
			}
		}
	}
}
