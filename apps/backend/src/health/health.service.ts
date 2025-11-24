import { Inject, Injectable, Logger } from '@nestjs/common'
import type { HealthCheckResponse } from '@repo/shared/types/health'
import { SupabaseService } from '../database/supabase.service'
import { AppConfigService } from '../config/app-config.service'

@Injectable()
export class HealthService {
	private readonly logger = new Logger(HealthService.name)

	constructor(
		@Inject('SUPABASE_SERVICE_FOR_HEALTH')
		private readonly supabaseClient: SupabaseService,
		private readonly config: AppConfigService
	) {}

	/**
	 * Core health check with database connectivity verification
	 */
	async checkSystemHealth(): Promise<HealthCheckResponse> {
		try {
			// Verify service is properly injected
			if (!this.supabaseClient) {
				throw new Error(
					'Health check service initialization error [HEALTH-001]'
				)
			}

			// Check actual database connectivity
			const dbHealth = await this.supabaseClient.checkConnection()

			// Determine overall health based on database status
			const isHealthy = dbHealth.status === 'healthy'

			// Log the result
			if (!isHealthy) {
				this.logger.error('Database connectivity check failed', {
					status: dbHealth.status,
					message: dbHealth.message
				})
			} else {
				this.logger.log('Database connectivity check passed')
			}

			// Return health status with database connectivity info
			const nodeEnv = this.config.getNodeEnv()
			const response: HealthCheckResponse = {
				status: isHealthy ? 'ok' : 'unhealthy',
				timestamp: new Date().toISOString(),
				environment: nodeEnv,
				uptime: process.uptime(),
				memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
				version: '1.0.0',
				service: 'backend-api',
				config_loaded: {
					node_env: !!nodeEnv,
					cors_origins: !!this.config.get('CORS_ORIGINS'),
					supabase_url: !!this.config.get('SUPABASE_URL')
				},
				database: {
					status: dbHealth.status,
					message: dbHealth.message || 'Database connection healthy'
				}
			}

			if (!isHealthy) {
				response.error = 'Service dependency check failed [HEALTH-002]'
			}

			return response
		} catch (error) {
			// Log the actual error for debugging
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Health check failed with error', errorMessage)

			// Return unhealthy status with error details
			const nodeEnv = this.config.getNodeEnv()
			return {
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				environment: nodeEnv,
				uptime: process.uptime(),
				memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
				version: '1.0.0',
				service: 'backend-api',
				config_loaded: {
					node_env: !!nodeEnv,
					cors_origins: !!this.config.get('CORS_ORIGINS'),
					supabase_url: !!this.config.get('SUPABASE_URL')
				},
				database: {
					status: 'unhealthy',
					message: 'Health check failed [HEALTH-003]'
				},
				error: 'Health check failed [HEALTH-003]'
			}
		}
	}

	/**
	 * Simple ping response for lightweight health checks
	 */
		getPingResponse() {
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				uptime: Math.round(process.uptime()),
				memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
				env: this.config.getNodeEnv(),
				port: this.config.getPort()
			}
		}
	}
