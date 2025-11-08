import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService } from '@nestjs/config'
import type { Config } from './config.schema'

/**
 * Typed wrapper around NestJS ConfigService
 *
 * Provides type-safe access to environment variables with getter methods.
 * All environment variables are cached after initial parse (ConfigModule cache: true).
 *
 * @example
 * ```typescript
 * constructor(private readonly config: AppConfigService) {}
 *
 * const dbUrl = this.config.getDatabaseUrl()
 * const stripeKey = this.config.getStripeSecretKey()
 * const isProduction = this.config.isProduction()
 * ```
 */
@Injectable()
export class AppConfigService {
	constructor(private readonly configService: NestConfigService<Config, true>) {}

	// ==================== Application ====================

	/**
	 * Get current NODE_ENV (development | production | test)
	 * @default 'production'
	 */
	getNodeEnv(): 'development' | 'production' | 'test' {
		return this.configService.get('NODE_ENV', { infer: true })
	}

	/**
	 * Check if running in production environment
	 */
	isProduction(): boolean {
		return this.getNodeEnv() === 'production'
	}

	/**
	 * Check if running in development environment
	 */
	isDevelopment(): boolean {
		return this.getNodeEnv() === 'development'
	}

	/**
	 * Check if running in test environment
	 */
	isTest(): boolean {
		return this.getNodeEnv() === 'test'
	}

	/**
	 * Get application port
	 * @default 4600
	 */
	getPort(): number {
		return this.configService.get('PORT', { infer: true })
	}

	// ==================== Database ====================

	/**
	 * Get pooled database connection URL (for DML: SELECT, INSERT, UPDATE)
	 * @throws {Error} if DATABASE_URL is not set
	 */
	getDatabaseUrl(): string {
		return this.configService.get('DATABASE_URL', { infer: true })
	}

	/**
	 * Get direct database connection URL (for DDL: CREATE, ALTER, DROP)
	 * Falls back to DATABASE_URL if not set
	 */
	getDirectUrl(): string | undefined {
		return this.configService.get('DIRECT_URL', { infer: true })
	}

	// ==================== Authentication ====================

	/**
	 * Get JWT secret for signing tokens
	 * @throws {Error} if JWT_SECRET is not set or < 32 characters
	 */
	getJwtSecret(): string {
		return this.configService.get('JWT_SECRET', { infer: true })
	}

	/**
	 * Get JWT expiration time
	 * @default '7d'
	 */
	getJwtExpiresIn(): string {
		return this.configService.get('JWT_EXPIRES_IN', { infer: true })
	}

	// ==================== Supabase ====================

	/**
	 * Get Supabase project URL
	 * @throws {Error} if SUPABASE_URL is not set or invalid
	 */
	getSupabaseUrl(): string {
		return this.configService.get('SUPABASE_URL', { infer: true })
	}

	/**
	 * Get Supabase service role key (admin access)
	 * @throws {Error} if SUPABASE_SECRET_KEY is not set
	 */
	getSupabaseSecretKey(): string {
		return this.configService.get('SUPABASE_SECRET_KEY', { infer: true })
	}

	/**
	 * Get Supabase publishable key (client access)
	 * @throws {Error} if SUPABASE_PUBLISHABLE_KEY is not set
	 */
	getSupabasePublishableKey(): string {
		return this.configService.get('SUPABASE_PUBLISHABLE_KEY', { infer: true })
	}

	/**
	 * Get Supabase JWT signing algorithm
	 * @returns 'HS256' | 'RS256' | 'ES256' | undefined
	 */
	getSupabaseJwtAlgorithm(): 'HS256' | 'RS256' | 'ES256' | undefined {
		return this.configService.get('SUPABASE_JWT_ALGORITHM', { infer: true })
	}

	/**
	 * Get Supabase JWT secret (for HS256 algorithm)
	 */
	getSupabaseJwtSecret(): string | undefined {
		return this.configService.get('SUPABASE_JWT_SECRET', { infer: true })
	}

	// ==================== CORS ====================

	/**
	 * Get CORS allowed origins (comma-separated)
	 */
	getCorsOrigins(): string | undefined {
		return this.configService.get('CORS_ORIGINS', { infer: true })
	}

	/**
	 * Get CORS origins as array
	 */
	getCorsOriginsArray(): string[] {
		const origins = this.getCorsOrigins()
		if (!origins) return []
		return origins
			.split(',')
			.map(o => o.trim())
			.filter(Boolean)
	}

	// ==================== Rate Limiting ====================

	/**
	 * Get rate limit TTL in seconds
	 */
	getRateLimitTtl(): string | undefined {
		return this.configService.get('RATE_LIMIT_TTL', { infer: true })
	}

	/**
	 * Get rate limit maximum requests
	 */
	getRateLimitLimit(): string | undefined {
		return this.configService.get('RATE_LIMIT_LIMIT', { infer: true })
	}

	/**
	 * Check if rate limiting is enabled
	 * @default true
	 */
	isRateLimitingEnabled(): boolean {
		return this.configService.get('ENABLE_RATE_LIMITING', { infer: true })
	}

	// ==================== Stripe ====================

	/**
	 * Get Stripe secret key
	 * @throws {Error} if STRIPE_SECRET_KEY is not set
	 */
	getStripeSecretKey(): string {
		return this.configService.get('STRIPE_SECRET_KEY', { infer: true })
	}

	/**
	 * Get Stripe publishable key
	 */
	getStripePublishableKey(): string | undefined {
		return this.configService.get('STRIPE_PUBLISHABLE_KEY', { infer: true })
	}

	/**
	 * Get Stripe webhook secret
	 * @throws {Error} if STRIPE_WEBHOOK_SECRET is not set
	 */
	getStripeWebhookSecret(): string {
		return this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true })
	}

	/**
	 * Get Stripe price IDs for subscription plans
	 */
	getStripePriceIds(): {
		starter?: string
		growth?: string
		business?: string
		tenantflowMax?: string
	} {
		return {
			starter: this.configService.get('STRIPE_PRICE_ID_STARTER', {
				infer: true
			}),
			growth: this.configService.get('STRIPE_PRICE_ID_GROWTH', { infer: true }),
			business: this.configService.get('STRIPE_PRICE_ID_BUSINESS', {
				infer: true
			}),
			tenantflowMax: this.configService.get('STRIPE_PRICE_ID_TENANTFLOW_MAX', {
				infer: true
			})
		}
	}

	// ==================== Redis ====================

	/**
	 * Get Redis connection URL
	 */
	getRedisUrl(): string | undefined {
		return this.configService.get('REDIS_URL', { infer: true })
	}

	/**
	 * Get Redis host
	 */
	getRedisHost(): string | undefined {
		return (
			this.configService.get('REDIS_HOST', { infer: true }) ||
			this.configService.get('REDISHOST', { infer: true })
		)
	}

	/**
	 * Get Redis port
	 */
	getRedisPort(): string | undefined {
		return (
			this.configService.get('REDIS_PORT', { infer: true }) ||
			this.configService.get('REDISPORT', { infer: true })
		)
	}

	/**
	 * Get Redis password
	 */
	getRedisPassword(): string | undefined {
		return (
			this.configService.get('REDIS_PASSWORD', { infer: true }) ||
			this.configService.get('REDISPASSWORD', { infer: true })
		)
	}

	/**
	 * Get Redis database number
	 */
	getRedisDb(): string | undefined {
		return this.configService.get('REDIS_DB', { infer: true })
	}

	/**
	 * Get Redis connection config
	 */
	getRedisConfig\(\):
		| \{ url: string \}
		| \{ host\?: string \| undefined; port\?: number \| undefined; password\?: string \| undefined; db\?: number \| undefined \} \{
		const url = this.getRedisUrl\(\)
		if \(url\) \{
			return \{ url \}
		\}

		const host = this.getRedisHost\(\)
		const port = this.getRedisPort\(\)
		const password = this.getRedisPassword\(\)
		const db = this.getRedisDb\(\)

		return \{
			host: host \|\| undefined,
			port: port \? parseInt\(port, 10\) : undefined,
			password: password \|\| undefined,
			db: db \? parseInt\(db, 10\) : undefined
		\}
	\}

	// ==================== Logging ====================

	/**
	 * Get log level
	 * @default 'info'
	 */
	getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
		return this.configService.get('LOG_LEVEL', { infer: true })
	}

	// ==================== Monitoring ====================

	/**
	 * Check if metrics are enabled
	 * @default false
	 */
	isMetricsEnabled(): boolean {
		return this.configService.get('ENABLE_METRICS', { infer: true })
	}

	// ==================== File Storage ====================

	/**
	 * Get storage provider
	 * @default 'supabase'
	 */
	getStorageProvider(): 'local' | 'supabase' | 's3' {
		return this.configService.get('STORAGE_PROVIDER', { infer: true })
	}

	/**
	 * Get storage bucket name
	 * @default 'tenant-flow-storage'
	 */
	getStorageBucket(): string {
		return this.configService.get('STORAGE_BUCKET', { infer: true })
	}

	// ==================== Email ====================

	/**
	 * Get SMTP configuration
	 */
	getSmtpConfig\(\): \{
		host\?: string \| undefined
		port\?: number \| undefined
		user\?: string \| undefined
		pass\?: string \| undefined
	\} \{
		const port = this.configService.get\('SMTP_PORT', \{ infer: true \}\)
		const host = this.configService.get\('SMTP_HOST', \{ infer: true \}\)
		const user = this.configService.get\('SMTP_USER', \{ infer: true \}\)
		const pass = this.configService.get\('SMTP_PASS', \{ infer: true \}\)
		return \{
			host: host \|\| undefined,
			port: port \? parseInt\(port, 10\) : undefined,
			user: user \|\| undefined,
			pass: pass \|\| undefined
		\}
	\}

	/**
	 * Get from email address
	 */
	getFromEmail(): string | undefined {
		return this.configService.get('FROM_EMAIL', { infer: true })
	}

	/**
	 * Get Resend API key (for testing)
	 */
	getTestResendApiKey(): string | undefined {
		return this.configService.get('TEST_RESEND_API_KEY', { infer: true })
	}

	/**
	 * Get Resend from email address
	 * @default 'noreply@tenantflow.app'
	 */
	getResendFromEmail(): string {
		return this.configService.get('RESEND_FROM_EMAIL', { infer: true })
	}

	// ==================== Security ====================

	/**
	 * Get CSRF secret
	 */
	getCsrfSecret(): string | undefined {
		return this.configService.get('CSRF_SECRET', { infer: true })
	}

	/**
	 * Get session secret
	 */
	getSessionSecret(): string | undefined {
		return this.configService.get('SESSION_SECRET', { infer: true })
	}

	// ==================== Features ====================

	/**
	 * Check if Swagger documentation is enabled
	 * @default false
	 */
	isSwaggerEnabled(): boolean {
		return this.configService.get('ENABLE_SWAGGER', { infer: true })
	}

	// ==================== Platform Detection ====================

	/**
	 * Check if running on Railway
	 */
	isRailway(): boolean {
		return !!this.configService.get('RAILWAY_PROJECT_ID', { infer: true })
	}

	/**
	 * Check if running on Vercel
	 */
	isVercel(): boolean {
		return !!this.configService.get('VERCEL_ENV', { infer: true })
	}

	/**
	 * Check if running in Docker container
	 * @default false
	 */
	isDocker(): boolean {
		return this.configService.get('DOCKER_CONTAINER', { infer: true })
	}

	/**
	 * Check if localhost CORS is allowed
	 * @default false
	 */
	isLocalhostCorsAllowed(): boolean {
		return this.configService.get('ALLOW_LOCALHOST_CORS', { infer: true })
	}

	/**
	 * Get Railway configuration
	 */
	getRailwayConfig(): {
		publicDomain?: string
		privateDomain?: string
		projectName?: string
		environmentName?: string
		serviceName?: string
		projectId?: string
		environmentId?: string
		serviceId?: string
	} {
		return {
			publicDomain: this.configService.get('RAILWAY_PUBLIC_DOMAIN', {
				infer: true
			}),
			privateDomain: this.configService.get('RAILWAY_PRIVATE_DOMAIN', {
				infer: true
			}),
			projectName: this.configService.get('RAILWAY_PROJECT_NAME', {
				infer: true
			}),
			environmentName: this.configService.get('RAILWAY_ENVIRONMENT_NAME', {
				infer: true
			}),
			serviceName: this.configService.get('RAILWAY_SERVICE_NAME', {
				infer: true
			}),
			projectId: this.configService.get('RAILWAY_PROJECT_ID', { infer: true }),
			environmentId: this.configService.get('RAILWAY_ENVIRONMENT_ID', {
				infer: true
			}),
			serviceId: this.configService.get('RAILWAY_SERVICE_ID', { infer: true })
		}
	}

	// ==================== Generic Getter ====================

	/**
	 * Get any config value by key (for advanced use cases)
	 *
	 * ⚠️ Prefer typed getter methods above for type safety
	 */
	get<K extends keyof Config>(key: K): Config[K] {
		return this.configService.get(key, { infer: true })
	}

	/**
	 * Get any config value with default fallback
	 *
	 * ⚠️ Prefer typed getter methods above for type safety
	 */
	getOrDefault<K extends keyof Config>(key: K, defaultValue: Config[K]): Config[K] {
		return this.configService.get(key, { infer: true }) ?? defaultValue
	}
}
