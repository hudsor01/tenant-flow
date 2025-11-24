import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { AppConfigService } from './config/app-config.service'
import { SupabaseService } from './database/supabase.service'

@Injectable()
export class AppService implements OnModuleInit {
	private readonly logger = new Logger(AppService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly config: AppConfigService
	) {}

	/**
	 * Lifecycle hook: Called once the module has been initialized
	 * Validates critical configuration and logs startup information
	 */
	async onModuleInit() {
		this.logger.log('✅ Application initializing...')

		try {
			// Validate critical environment variables
			await this.validateCriticalConfig()

			// Log non-sensitive configuration
			this.logConfiguration()

			// Check database connection with timeout to prevent startup hang
			const DB_CHECK_TIMEOUT_MS = 5000 // 5 second timeout
			try {
				const dbStatus = await Promise.race([
					this.supabaseService.checkConnection(),
					new Promise<{ status: 'unhealthy'; message: string }>((_, reject) =>
						setTimeout(
							() => reject(new Error('Database connection check timed out')),
							DB_CHECK_TIMEOUT_MS
						)
					)
				])

				if (dbStatus.status === 'healthy') {
					this.logger.log('✓ Database connection: healthy')
				} else {
					this.logger.error('✗ Database connection: unhealthy', dbStatus.message)
				}
			} catch (dbError) {
				// Don't fail startup on DB check - log warning and continue
				this.logger.warn(
					'⚠ Database connection check failed (continuing startup)',
					dbError instanceof Error ? dbError.message : String(dbError)
				)
			}

			this.logger.log('✅ Application initialized successfully')
		} catch (error) {
			this.logger.error('✗ Application initialization failed', error)
			throw error
		}
	}

	/**
	 * Validate critical environment variables are set
	 */
	private async validateCriticalConfig() {
		const critical = []

		// Database
		try {
			this.config.getDatabaseUrl()
		} catch {
			critical.push('DATABASE_URL')
		}

		// Supabase
		try {
			this.config.getSupabaseUrl()
			this.config.getSupabaseSecretKey()
			this.config.getSupabasePublishableKey()
		} catch {
			critical.push('SUPABASE_URL, SUPABASE_SECRET_KEY, or SUPABASE_PUBLISHABLE_KEY')
		}

		// Authentication
		try {
			this.config.getJwtSecret()
		} catch {
			critical.push('JWT_SECRET')
		}

		// Stripe
		try {
			this.config.getStripeSecretKey()
			this.config.getStripeWebhookSecret()
		} catch {
			critical.push('STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
		}

		if (critical.length > 0) {
			throw new Error(
				`Critical environment variables missing: ${critical.join(', ')}`
			)
		}

		this.logger.log(' Critical configuration validated')
	}

	/**
	 * Log non-sensitive configuration
	 */
	private logConfiguration() {
		const config = {
			environment: this.config.getNodeEnv(),
			port: this.config.getPort(),
			platform: this.config.isRailway()
				? 'Railway'
				: this.config.isVercel()
					? 'Vercel'
					: this.config.isDocker()
						? 'Docker'
						: 'Local',
			features: {
				swagger: this.config.isSwaggerEnabled(),
				metrics: this.config.isMetricsEnabled(),
				rateLimiting: this.config.isRateLimitingEnabled()
			},
			storage: {
				provider: this.config.getStorageProvider(),
				bucket: this.config.getStorageBucket()
			},
			logging: {
				level: this.config.getLogLevel()
			}
		}

		this.logger.log(' Configuration:')
		this.logger.log(JSON.stringify(config, null, 2))
	}

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
