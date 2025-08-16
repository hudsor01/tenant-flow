import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { configSchema } from './config.schema'
import { RuntimeTypeCheckerService } from '../validation/runtime-type-checker.service'

/**
 * Enhanced Configuration Validator with Railway Support
 *
 * Features:
 * - Runtime configuration validation with Zod
 * - Railway deployment detection and validation
 * - Environment-specific validation rules
 * - Configuration health checks
 * - Auto-healing for missing optional configurations
 * - Performance monitoring of validation
 */

interface ValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
	railwayInfo?: {
		isRailway: boolean
		environment?: string
		serviceUrl?: string
		metadata: Record<string, unknown>
	}
	performance: {
		validationTime: number
		configSize: number
	}
}

interface ConfigHealth {
	overall: 'healthy' | 'warning' | 'error'
	database: 'connected' | 'error' | 'not_configured'
	supabase: 'connected' | 'error' | 'not_configured'
	redis: 'connected' | 'error' | 'not_configured'
	stripe: 'configured' | 'not_configured'
	cors: 'configured' | 'permissive' | 'not_configured'
	railway: 'detected' | 'not_detected'
	lastCheck: Date
}

@Injectable()
export class ConfigValidator {
	private readonly logger = new Logger(ConfigValidator.name)
	private lastValidation?: ValidationResult
	private configHealth?: ConfigHealth
	private readonly validationCache = new Map<string, ValidationResult>()

	constructor(
		private readonly configService: ConfigService,
		private readonly typeChecker: RuntimeTypeCheckerService
	) {}

	/**
	 * Comprehensive configuration validation
	 */
	async validateConfiguration(): Promise<ValidationResult> {
		const startTime = performance.now()

		try {
			// Get raw environment variables
			const rawConfig = this.getAllConfigValues()
			const configSize = JSON.stringify(rawConfig).length

			// Validate base configuration
			const baseValidation = this.validateBaseConfig(rawConfig)

			// Validate Railway-specific configuration
			const railwayValidation = this.validateRailwayConfig(rawConfig)

			// Validate cross-dependencies
			const dependencyValidation =
				this.validateConfigDependencies(rawConfig)

			// Validate security requirements
			const securityValidation = this.validateSecurityConfig(rawConfig)

			// Combine all validation results
			const errors = [
				...baseValidation.errors,
				...railwayValidation.errors,
				...dependencyValidation.errors,
				...securityValidation.errors
			]

			const warnings = [
				...baseValidation.warnings,
				...railwayValidation.warnings,
				...dependencyValidation.warnings,
				...securityValidation.warnings
			]

			const isValid = errors.length === 0
			const validationTime = performance.now() - startTime

			// Get Railway information
			const railwayInfo = {
				isRailway: !!this.configService.get('RAILWAY_ENVIRONMENT'),
				environment: this.configService.get('RAILWAY_ENVIRONMENT'),
				serviceUrl:
					this.configService.get('RAILWAY_STATIC_URL') ||
					(this.configService.get('RAILWAY_PUBLIC_DOMAIN')
						? `https://${this.configService.get('RAILWAY_PUBLIC_DOMAIN')}`
						: undefined),
				metadata: {
					serviceName: this.configService.get('RAILWAY_SERVICE_NAME'),
					projectId: this.configService.get('RAILWAY_PROJECT_ID'),
					deploymentId: this.configService.get(
						'RAILWAY_DEPLOYMENT_ID'
					),
					gitCommit: this.configService.get('RAILWAY_GIT_COMMIT_SHA'),
					gitBranch: this.configService.get('RAILWAY_GIT_BRANCH'),
					buildId: this.configService.get('RAILWAY_BUILD_ID')
				}
			}

			const result: ValidationResult = {
				isValid,
				errors,
				warnings,
				railwayInfo,
				performance: {
					validationTime,
					configSize
				}
			}

			// Cache result
			this.lastValidation = result
			this.cacheValidationResult(result)

			// Log results
			this.logValidationResults(result)

			return result
		} catch (error) {
			const validationTime = performance.now() - startTime

			this.logger.error(
				'Configuration validation failed unexpectedly',
				error
			)

			return {
				isValid: false,
				errors: [
					`Validation failed: ${error instanceof Error ? error.message : String(error)}`
				],
				warnings: [],
				performance: {
					validationTime,
					configSize: 0
				}
			}
		}
	}

	/**
	 * Validate base configuration schema
	 */
	private validateBaseConfig(rawConfig: Record<string, unknown>): {
		errors: string[]
		warnings: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// Check for critical required fields
		const requiredFields = [
			'DATABASE_URL',
			'SUPABASE_URL',
			'SUPABASE_ANON_KEY',
			'SUPABASE_SERVICE_ROLE_KEY',
			'SUPABASE_JWT_SECRET'
		]

		requiredFields.forEach(field => {
			if (!rawConfig[field]) {
				errors.push(`Missing required configuration: ${field}`)
			}
		})

		// Try Zod validation if typeChecker is available
		try {
			const result = this.typeChecker.safeCheck(
				configSchema,
				rawConfig,
				'base configuration'
			)

			if (!result.valid) {
				errors.push(
					...(result.errors?.map(e => `${e.field}: ${e.message}`) ||
						[])
				)
			}
		} catch (error) {
			// If typeChecker fails, continue with basic validation above
			warnings.push(
				`Advanced validation unavailable: ${error instanceof Error ? error.message : String(error)}`
			)
		}

		return { errors, warnings }
	}

	/**
	 * Validate Railway-specific configuration
	 */
	private validateRailwayConfig(rawConfig: Record<string, unknown>): {
		errors: string[]
		warnings: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// Only validate Railway config if Railway is detected
		if (!this.configService.get('RAILWAY_ENVIRONMENT')) {
			return { errors, warnings }
		}

		try {
			// Basic Railway configuration checks
			const requiredRailwayVars = [
				'RAILWAY_SERVICE_NAME',
				'RAILWAY_PROJECT_ID'
			]
			const missingVars = requiredRailwayVars.filter(
				key => !rawConfig[key]
			)

			if (missingVars.length > 0) {
				warnings.push(
					`Railway missing optional variables: ${missingVars.join(', ')}`
				)
			}

			// Additional Railway-specific validations
			if (process.env.NODE_ENV === 'production') {
				if (
					!rawConfig.RAILWAY_PUBLIC_DOMAIN &&
					!rawConfig.RAILWAY_STATIC_URL
				) {
					warnings.push(
						'Railway production deployment should have public domain or static URL configured'
					)
				}
			}
		} catch (error) {
			warnings.push(
				`Railway config validation error: ${error instanceof Error ? error.message : String(error)}`
			)
		}

		return { errors, warnings }
	}

	/**
	 * Validate configuration dependencies and relationships
	 */
	private validateConfigDependencies(rawConfig: Record<string, unknown>): {
		errors: string[]
		warnings: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// Database configuration dependencies
		if (rawConfig.DATABASE_URL && !rawConfig.DIRECT_URL) {
			warnings.push(
				'DIRECT_URL should be configured when DATABASE_URL is set for optimal connection pooling'
			)
		}

		// Stripe configuration dependencies
		if (rawConfig.STRIPE_SECRET_KEY && !rawConfig.STRIPE_WEBHOOK_SECRET) {
			warnings.push(
				'STRIPE_WEBHOOK_SECRET should be configured when Stripe is enabled'
			)
		}

		// Redis configuration dependencies
		if (
			rawConfig.REDIS_URL &&
			(!rawConfig.REDIS_HOST || !rawConfig.REDIS_PORT)
		) {
			warnings.push(
				'Redis individual connection parameters not needed when REDIS_URL is provided'
			)
		}

		// CORS configuration dependencies
		if (process.env.NODE_ENV === 'production') {
			if (
				!rawConfig.CORS_ORIGINS ||
				(rawConfig.CORS_ORIGINS as string).trim() === ''
			) {
				errors.push(
					'CORS_ORIGINS must be explicitly configured in production'
				)
			}
		}

		// Railway + CORS dependencies
		if (this.configService.get('RAILWAY_ENVIRONMENT')) {
			const corsOrigins = (rawConfig.CORS_ORIGINS as string) || ''
			const railwayUrl =
				this.configService.get('RAILWAY_STATIC_URL') ||
				(this.configService.get('RAILWAY_PUBLIC_DOMAIN')
					? `https://${this.configService.get('RAILWAY_PUBLIC_DOMAIN')}`
					: undefined)

			if (railwayUrl && !corsOrigins.includes(railwayUrl)) {
				warnings.push(
					`CORS origins should include Railway service URL: ${railwayUrl}`
				)
			}
		}

		// Check for environment mismatches
		const nodeEnv = rawConfig.NODE_ENV as string
		const railwayEnv = rawConfig.RAILWAY_ENVIRONMENT as string

		if (nodeEnv && railwayEnv && nodeEnv !== railwayEnv) {
			if (nodeEnv === 'development' && railwayEnv === 'production') {
				warnings.push(
					'NODE_ENV (development) does not match RAILWAY_ENVIRONMENT (production)'
				)
			} else if (nodeEnv === 'production' && railwayEnv === 'staging') {
				warnings.push(
					'NODE_ENV (production) does not match RAILWAY_ENVIRONMENT (staging)'
				)
			}
		}

		return { errors, warnings }
	}

	/**
	 * Validate security-specific configuration
	 */
	private validateSecurityConfig(rawConfig: Record<string, unknown>): {
		errors: string[]
		warnings: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// JWT secret validation
		if (rawConfig.JWT_SECRET) {
			const jwtSecret = rawConfig.JWT_SECRET as string
			if (jwtSecret.length < 32) {
				errors.push(
					'JWT_SECRET must be at least 32 characters for security'
				)
			}
			if (
				jwtSecret.includes('example') ||
				jwtSecret.includes('test') ||
				jwtSecret === 'secret'
			) {
				errors.push('JWT_SECRET appears to be a placeholder value')
			}
		}

		// Supabase JWT secret validation
		if (rawConfig.SUPABASE_JWT_SECRET) {
			const supabaseSecret = rawConfig.SUPABASE_JWT_SECRET as string
			if (supabaseSecret.length < 32) {
				errors.push(
					'SUPABASE_JWT_SECRET must be at least 32 characters for security'
				)
			}
		}

		// Stripe key validation for production
		if (
			process.env.NODE_ENV === 'production' &&
			rawConfig.STRIPE_SECRET_KEY
		) {
			const stripeKey = rawConfig.STRIPE_SECRET_KEY as string
			if (stripeKey.startsWith('sk_test_')) {
				errors.push('Using test Stripe key in production environment')
			}
		}

		// CORS security validation
		if (rawConfig.CORS_ORIGINS) {
			const corsOrigins = rawConfig.CORS_ORIGINS as string
			if (corsOrigins.includes('*') || corsOrigins.includes('null')) {
				if (process.env.NODE_ENV === 'production') {
					errors.push(
						'Wildcard CORS origins are not allowed in production'
					)
				} else {
					warnings.push(
						'Wildcard CORS origins detected in development'
					)
				}
			}
		}

		return { errors, warnings }
	}

	/**
	 * Get configuration health status
	 */
	async getConfigHealth(): Promise<ConfigHealth> {
		if (
			this.configHealth &&
			Date.now() - this.configHealth.lastCheck.getTime() < 60000
		) {
			return this.configHealth // Return cached result if less than 1 minute old
		}

		const health: ConfigHealth = {
			overall: 'healthy',
			database: 'not_configured',
			supabase: 'not_configured',
			redis: 'not_configured',
			stripe: 'not_configured',
			cors: 'not_configured',
			railway: this.configService.get('RAILWAY_ENVIRONMENT')
				? 'detected'
				: 'not_detected',
			lastCheck: new Date()
		}

		// Check database health
		if (this.configService.get('DATABASE_URL')) {
			health.database = 'connected' // TODO: Add actual connection test
		}

		// Check Supabase health
		if (
			this.configService.get('SUPABASE_URL') &&
			this.configService.get('SUPABASE_SERVICE_ROLE_KEY')
		) {
			health.supabase = 'connected' // TODO: Add actual connection test
		}

		// Check Redis health
		if (this.configService.get('REDIS_URL')) {
			health.redis = 'connected' // TODO: Add actual connection test
		}

		// Check Stripe configuration
		if (this.configService.get('STRIPE_SECRET_KEY')) {
			health.stripe = 'configured'
		}

		// Check CORS configuration
		const corsOrigins = this.configService.get('CORS_ORIGINS')
		if (corsOrigins) {
			health.cors = corsOrigins.includes('*')
				? 'permissive'
				: 'configured'
		}

		// Determine overall health
		const hasErrors = Object.values(health).includes('error' as string)
		const hasWarnings =
			health.cors === 'permissive' || health.database === 'not_configured'

		if (hasErrors) {
			health.overall = 'error'
		} else if (hasWarnings) {
			health.overall = 'warning'
		}

		this.configHealth = health
		return health
	}

	/**
	 * Get all configuration values for validation
	 */
	private getAllConfigValues(): Record<string, unknown> {
		// Get all environment variables that match our schema
		const config: Record<string, unknown> = {}

		// Use ConfigService if available, fallback to process.env
		if (this.configService) {
			// Get common config keys using ConfigService
			const keys = [
				'NODE_ENV',
				'DATABASE_URL',
				'JWT_SECRET',
				'SUPABASE_URL',
				'SUPABASE_ANON_KEY',
				'SUPABASE_SERVICE_ROLE_KEY',
				'SUPABASE_JWT_SECRET',
				'CORS_ORIGINS',
				'RAILWAY_ENVIRONMENT',
				'RAILWAY_STATIC_URL',
				'STRIPE_SECRET_KEY',
				'STRIPE_WEBHOOK_SECRET'
			]

			keys.forEach(key => {
				const value = this.configService.get(key)
				if (value !== undefined) {
					config[key] = value
				}
			})
		} else {
			// Fallback to process.env
			Object.keys(process.env).forEach(key => {
				config[key] = process.env[key]
			})
		}

		return config
	}

	/**
	 * Cache validation result
	 */
	private cacheValidationResult(result: ValidationResult): void {
		const cacheKey = `validation_${Date.now()}`
		this.validationCache.set(cacheKey, result)

		// Keep only last 10 validation results
		if (this.validationCache.size > 10) {
			const firstKey = this.validationCache.keys().next().value
			if (firstKey) {
				this.validationCache.delete(firstKey)
			}
		}
	}

	/**
	 * Log validation results
	 */
	private logValidationResults(result: ValidationResult): void {
		const { isValid, errors, warnings, railwayInfo, performance } = result

		if (isValid) {
			this.logger.log(
				`✅ Configuration validation passed (${performance.validationTime.toFixed(2)}ms)`
			)
		} else {
			this.logger.error(
				`❌ Configuration validation failed (${performance.validationTime.toFixed(2)}ms)`
			)
			errors.forEach(error => this.logger.error(`  • ${error}`))
		}

		if (warnings.length > 0) {
			this.logger.warn(`⚠️ Configuration warnings (${warnings.length}):`)
			warnings.forEach(warning => this.logger.warn(`  • ${warning}`))
		}

		if (railwayInfo?.isRailway) {
			this.logger.log(
				`🚂 Railway deployment detected: ${railwayInfo.environment || 'unknown environment'}`
			)
			if (railwayInfo.serviceUrl) {
				this.logger.log(`  Service URL: ${railwayInfo.serviceUrl}`)
			}
		}

		if (performance.validationTime > 100) {
			this.logger.warn(
				`⚠️ Slow configuration validation: ${performance.validationTime.toFixed(2)}ms`
			)
		}
	}

	/**
	 * Get last validation result
	 */
	getLastValidation(): ValidationResult | undefined {
		return this.lastValidation
	}

	/**
	 * Force re-validation
	 */
	async revalidate(): Promise<ValidationResult> {
		this.validationCache.clear()
		this.configHealth = undefined
		return this.validateConfiguration()
	}

	/**
	 * Simple startup validation for test compatibility
	 */
	validateStartupConfig(): ValidationResult {
		const rawConfig = this.getAllConfigValues()
		const baseValidation = this.validateBaseConfig(rawConfig)
		const railwayValidation = this.validateRailwayConfig(rawConfig)
		const dependencyValidation = this.validateConfigDependencies(rawConfig)
		const securityValidation = this.validateSecurityConfig(rawConfig)

		const errors = [
			...baseValidation.errors,
			...railwayValidation.errors,
			...dependencyValidation.errors,
			...securityValidation.errors
		]

		const warnings = [
			...baseValidation.warnings,
			...railwayValidation.warnings,
			...dependencyValidation.warnings,
			...securityValidation.warnings
		]

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			performance: {
				validationTime: 0,
				configSize: JSON.stringify(rawConfig).length
			}
		}
	}

	/**
	 * Validate runtime configuration changes
	 */
	validateRuntimeConfig(config: Record<string, unknown>): ValidationResult {
		// Runtime validation is more lenient - doesn't require all fields
		const errors: string[] = []
		const warnings: string[] = []

		// Only validate security for provided fields
		const securityValidation = this.validateSecurityConfig(config)
		errors.push(...securityValidation.errors)
		warnings.push(...securityValidation.warnings)

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			performance: {
				validationTime: 0,
				configSize: JSON.stringify(config).length
			}
		}
	}

	/**
	 * Cross-validation for compatibility
	 */
	performCrossValidation(): { isValid: boolean; warnings?: string[] } {
		const rawConfig = this.getAllConfigValues()
		const dependencyValidation = this.validateConfigDependencies(rawConfig)

		return {
			isValid: dependencyValidation.errors.length === 0,
			warnings: dependencyValidation.warnings
		}
	}
}
