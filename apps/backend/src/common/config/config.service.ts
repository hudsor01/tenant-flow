import { Injectable, Logger } from '@nestjs/common'
import {
	type Config,
	configSchema,
	createDerivedConfig,
	type DerivedConfig
} from './config.schema'

/**
 * Type-Safe Configuration Service
 *
 * This service provides:
 * - Runtime validation of all environment variables using Zod
 * - Type-safe access to configuration throughout the application
 * - Derived configuration objects for better organization
 * - Comprehensive error handling with detailed validation messages
 * - Caching of validated configuration for performance
 */
@Injectable()
export class TypeSafeConfigService {
	private readonly logger = new Logger(TypeSafeConfigService.name)
	private _validatedConfig: Config | null = null
	private _derivedConfig: DerivedConfig | null = null

	constructor() {
		this.validateConfiguration()
	}

	/**
	 * Validates all environment variables against the Zod schema
	 * This is called once during service initialization
	 */
	private validateConfiguration(): void {
		try {
			this.logger.log('🔍 Validating environment configuration...')

			// Get all environment variables
			const rawConfig = process.env

			// Validate using Zod schema
			const validationResult = configSchema.safeParse(rawConfig)

			if (!validationResult.success) {
				this.logger.error('❌ Configuration validation failed:')

				// Format validation errors for better readability
				const errorMessages = validationResult.error.issues.map(
					error => {
						const path = error.path.join('.')
						return `  • ${path}: ${error.message}`
					}
				)

				const errorMessage = `Environment configuration is invalid:\n${errorMessages.join('\n')}`
				this.logger.error(errorMessage)

				// In production, fail fast with detailed error
				if (process.env.NODE_ENV === 'production') {
					throw new Error(
						`Critical configuration validation failed:\n${errorMessage}`
					)
				} else {
					this.logger.warn(
						'🚧 Running in development mode with invalid configuration'
					)
					// Still throw in development to catch issues early
					throw new Error(
						`Configuration validation failed:\n${errorMessage}`
					)
				}
			}

			// Cache validated configuration
			this._validatedConfig = validationResult.data
			this._derivedConfig = createDerivedConfig(validationResult.data)

			this.logger.log(
				'✅ Environment configuration validated successfully'
			)
			this.logConfigurationSummary()
		} catch (error) {
			this.logger.error('Failed to validate configuration:', error)
			throw error
		}
	}

	/**
	 * Logs a summary of the current configuration (without sensitive data)
	 */
	private logConfigurationSummary(): void {
		if (!this._derivedConfig) {
			return
		}

		const config = this._derivedConfig
		const summary = {
			environment: config.app.nodeEnv,
			port: config.app.port,
			platform: config.deployment.platform,
			deployment: {
				isRailway: config.deployment.isRailway,
				isVercel: config.deployment.isVercel,
				isDocker: config.deployment.isDocker,
				serviceUrl: this.serviceUrl,
				...(config.deployment.railway && {
					railway: {
						environment: config.deployment.railway.environment,
						serviceName: config.deployment.railway.serviceName
					}
				})
			},
			database: {
				maxConnections: config.database.maxConnections,
				connectionTimeout: config.database.connectionTimeout
			},
			cors: {
				originsCount: config.cors.origins.length,
				deploymentOriginsCount: this.getDeploymentCorsOrigins().length
			},
			rateLimit: {
				enabled: config.app.enableRateLimiting,
				ttl: config.rateLimit.ttl,
				limit: config.rateLimit.limit
			},
			features: {
				swagger: config.app.enableSwagger,
				metrics: config.app.enableMetrics,
				stripe: !!config.stripe.secretKey,
				redis: !!config.redis.url,
				email: !!config.email.smtp.host
			},
			storage: {
				provider: config.storage.provider,
				bucket: config.storage.bucket
			}
		}

		this.logger.log(
			'📋 Configuration Summary:',
			JSON.stringify(summary, null, 2)
		)
	}

	/**
	 * Gets the raw validated configuration
	 */
	get config(): Config {
		if (!this._validatedConfig) {
			throw new Error(
				'Configuration not validated. This should not happen.'
			)
		}
		return this._validatedConfig
	}

	/**
	 * Gets the derived configuration objects for easier access
	 */
	get derived(): DerivedConfig {
		if (!this._derivedConfig) {
			throw new Error(
				'Derived configuration not available. This should not happen.'
			)
		}
		return this._derivedConfig
	}

	/**
	 * Type-safe getter for individual configuration values
	 */
	get<K extends keyof Config>(key: K): Config[K] {
		return this.config[key]
	}

	/**
	 * Gets a configuration value with a fallback
	 */
	getOrDefault<K extends keyof Config>(
		key: K,
		defaultValue: Config[K]
	): Config[K] {
		const value = this.config[key]
		return value !== undefined ? value : defaultValue
	}

	/**
	 * Checks if the application is running in production
	 */
	get isProduction(): boolean {
		return this.config.NODE_ENV === 'production'
	}

	/**
	 * Checks if the application is running in development
	 */
	get isDevelopment(): boolean {
		return this.config.NODE_ENV === 'development'
	}

	/**
	 * Checks if the application is running in test mode
	 */
	get isTest(): boolean {
		return this.config.NODE_ENV === 'test'
	}

	/**
	 * Gets database configuration
	 */
	get database() {
		return this.derived.database
	}

	/**
	 * Gets Supabase configuration
	 */
	get supabase() {
		return this.derived.supabase
	}

	/**
	 * Gets JWT configuration
	 */
	get jwt() {
		return this.derived.jwt
	}

	/**
	 * Gets CORS configuration
	 */
	get cors() {
		return this.derived.cors
	}

	/**
	 * Gets rate limiting configuration
	 */
	get rateLimit() {
		return this.derived.rateLimit
	}

	/**
	 * Gets Stripe configuration
	 */
	get stripe() {
		return this.derived.stripe
	}

	/**
	 * Gets Redis configuration
	 */
	get redis() {
		return this.derived.redis
	}

	/**
	 * Gets application configuration
	 */
	get app() {
		return this.derived.app
	}

	/**
	 * Gets storage configuration
	 */
	get storage() {
		return this.derived.storage
	}

	/**
	 * Gets email configuration
	 */
	get email() {
		return this.derived.email
	}

	/**
	 * Gets security configuration
	 */
	get security() {
		return this.derived.security
	}

	/**
	 * Validates a configuration update (useful for runtime config changes)
	 */
	validateConfigUpdate(
		updates: Partial<Record<keyof Config, string>>
	): boolean {
		try {
			const currentConfig = { ...process.env, ...updates }
			const result = configSchema.safeParse(currentConfig)

			if (!result.success) {
				this.logger.warn(
					'Configuration update validation failed:',
					result.error.issues
				)
				return false
			}

			return true
		} catch (error) {
			this.logger.error('Error validating configuration update:', error)
			return false
		}
	}

	/**
	 * Gets configuration for specific features with validation
	 */
	getFeatureConfig<T extends keyof DerivedConfig>(
		feature: T
	): DerivedConfig[T] {
		const featureConfig = this.derived[feature]

		if (!featureConfig) {
			throw new Error(
				`Feature configuration '${String(feature)}' is not available`
			)
		}

		return featureConfig
	}

	/**
	 * Utility method to check if a feature is enabled
	 */
	isFeatureEnabled(feature: 'swagger' | 'metrics' | 'rateLimiting'): boolean {
		switch (feature) {
			case 'swagger':
				return this.app.enableSwagger
			case 'metrics':
				return this.app.enableMetrics
			case 'rateLimiting':
				return this.app.enableRateLimiting
			default:
				return false
		}
	}

	/**
	 * Gets environment-specific configuration
	 */
	getEnvironmentConfig() {
		return {
			isProduction: this.isProduction,
			isDevelopment: this.isDevelopment,
			isTest: this.isTest,
			nodeEnv: this.config.NODE_ENV,
			port: this.config.PORT,
			logLevel: this.config.LOG_LEVEL
		}
	}

	/**
	 * Gets deployment platform configuration
	 */
	get deployment() {
		return this.derived.deployment
	}

	/**
	 * Checks if running on Railway platform
	 */
	get isRailway(): boolean {
		return this.deployment.isRailway
	}

	/**
	 * Checks if running on Vercel platform
	 */
	get isVercel(): boolean {
		return this.deployment.isVercel
	}

	/**
	 * Checks if running in Docker container
	 */
	get isDocker(): boolean {
		return this.deployment.isDocker
	}

	/**
	 * Gets Railway-specific configuration (null if not on Railway)
	 */
	get railwayConfig() {
		return this.deployment.railway
	}

	/**
	 * Gets the deployment platform name
	 */
	get deploymentPlatform(): 'railway' | 'vercel' | 'docker' | 'unknown' {
		return this.deployment.platform
	}

	/**
	 * Checks if this is an actual production deployment (not just NODE_ENV=production)
	 */
	get isProductionDeployment(): boolean {
		return (
			this.isProduction &&
			(this.deployment.railway?.environment === 'production' ||
				this.deployment.vercel?.environment === 'production' ||
				this.isDocker)
		)
	}

	/**
	 * Gets the service URL for the current deployment platform
	 */
	get serviceUrl(): string | undefined {
		if (this.isRailway) {
			return this.railwayConfig?.serviceUrl
		}
		if (this.isVercel) {
			return this.deployment.vercel?.url
		}
		return undefined
	}

	/**
	 * Gets deployment-specific CORS origins that should be allowed
	 */
	getDeploymentCorsOrigins(): string[] {
		const origins: string[] = []

		// Add Railway service URL
		if (this.isRailway && this.railwayConfig?.serviceUrl) {
			origins.push(this.railwayConfig.serviceUrl)
		}

		// Add Vercel URL
		if (this.isVercel && this.deployment.vercel?.url) {
			origins.push(`https://${this.deployment.vercel.url}`)
		}

		return origins
	}
}
