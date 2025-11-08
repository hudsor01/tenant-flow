import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService } from '@nestjs/config'
import type { Config } from './config.schema'

/**
 * Typed wrapper around NestJS ConfigService
 *
 * Provides type-safe access to environment variables with getter methods.
 * All environment variables are cached after initial parse (ConfigModule cache: true).
 */
@Injectable()
export class AppConfigService {
	constructor(private readonly configService: NestConfigService<Config, true>) {}

	// ==================== Application ====================

	getNodeEnv(): 'development' | 'production' | 'test' {
		return this.configService.get('NODE_ENV', { infer: true })
	}

	isProduction(): boolean {
		return this.getNodeEnv() === 'production'
	}

	isDevelopment(): boolean {
		return this.getNodeEnv() === 'development'
	}

	isTest(): boolean {
		return this.getNodeEnv() === 'test'
	}

	getPort(): number {
		return this.configService.get('PORT', { infer: true })
	}

	// ==================== Database ====================

	getDatabaseUrl(): string {
		return this.configService.get('DATABASE_URL', { infer: true })
	}

	getDirectUrl(): string | undefined {
		return this.configService.get('DIRECT_URL', { infer: true })
	}

	// ==================== Authentication ====================

	getJwtSecret(): string {
		return this.configService.get('JWT_SECRET', { infer: true })
	}

	getJwtExpiresIn(): string {
		return this.configService.get('JWT_EXPIRES_IN', { infer: true })
	}

	// ==================== Supabase ====================

	getSupabaseUrl(): string {
		return this.configService.get('SUPABASE_URL', { infer: true })
	}

	getSupabaseSecretKey(): string {
		return this.configService.get('SUPABASE_SECRET_KEY', { infer: true })
	}

	getSupabasePublishableKey(): string {
		return this.configService.get('SUPABASE_PUBLISHABLE_KEY', { infer: true })
	}

	getSupabaseJwtAlgorithm(): 'HS256' | 'RS256' | 'ES256' | undefined {
		return this.configService.get('SUPABASE_JWT_ALGORITHM', { infer: true })
	}

	getSupabaseJwtSecret(): string | undefined {
		return this.configService.get('SUPABASE_JWT_SECRET', { infer: true })
	}

	// ==================== CORS ====================

	getCorsOrigins(): string | undefined {
		return this.configService.get('CORS_ORIGINS', { infer: true })
	}

	getCorsOriginsArray(): string[] {
		const origins = this.getCorsOrigins()
		if (!origins) return []
		return origins
			.split(',')
			.map(o => o.trim())
			.filter(Boolean)
	}

	// ==================== Rate Limiting ====================

	getRateLimitTtl(): string | undefined {
		return this.configService.get('RATE_LIMIT_TTL', { infer: true })
	}

	getRateLimitLimit(): string | undefined {
		return this.configService.get('RATE_LIMIT_LIMIT', { infer: true })
	}

	isRateLimitingEnabled(): boolean {
		return this.configService.get('ENABLE_RATE_LIMITING', { infer: true })
	}

	// ==================== Stripe ====================

	getStripeSecretKey(): string {
		return this.configService.get('STRIPE_SECRET_KEY', { infer: true })
	}

	getStripePublishableKey(): string | undefined {
		return this.configService.get('STRIPE_PUBLISHABLE_KEY', { infer: true })
	}

	getStripeWebhookSecret(): string {
		return this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true })
	}

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

	getRedisUrl(): string | undefined {
		return this.configService.get('REDIS_URL', { infer: true })
	}

	getRedisHost(): string | undefined {
		return (
			this.configService.get('REDIS_HOST', { infer: true }) ||
			this.configService.get('REDISHOST', { infer: true })
		)
	}

	getRedisPort(): string | undefined {
		return (
			this.configService.get('REDIS_PORT', { infer: true }) ||
			this.configService.get('REDISPORT', { infer: true })
		)
	}

	getRedisPassword(): string | undefined {
		return (
			this.configService.get('REDIS_PASSWORD', { infer: true }) ||
			this.configService.get('REDISPASSWORD', { infer: true })
		)
	}

	getRedisDb(): string | undefined {
		return this.configService.get('REDIS_DB', { infer: true })
	}

	getRedisConfig():
		| { url: string }
		| {
				host?: string
				port?: number
				password?: string
				db?: number
		  } {
		const url = this.getRedisUrl()
		if (url) {
			return { url }
		}

		const host = this.getRedisHost()
		const port = this.getRedisPort()
		const password = this.getRedisPassword()
		const db = this.getRedisDb()

		return {
			...(host ? { host } : {}),
			...(port ? { port: Number(port) } : {}),
			...(password ? { password } : {}),
			...(db ? { db: Number(db) } : {})
		}
	}

	// ==================== Logging ====================

	getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
		return this.configService.get('LOG_LEVEL', { infer: true })
	}

	// ==================== Monitoring ====================

	isMetricsEnabled(): boolean {
		return this.configService.get('ENABLE_METRICS', { infer: true })
	}

	// ==================== File Storage ====================

	getStorageProvider(): 'local' | 'supabase' | 's3' {
		return this.configService.get('STORAGE_PROVIDER', { infer: true })
	}

	getStorageBucket(): string {
		return this.configService.get('STORAGE_BUCKET', { infer: true })
	}

	// ==================== Email ====================

	getFromEmail(): string | undefined {
		return this.configService.get('FROM_EMAIL', { infer: true })
	}

	getTestResendApiKey(): string | undefined {
		return this.configService.get('TEST_RESEND_API_KEY', { infer: true })
	}

	getResendFromEmail(): string {
		return this.configService.get('RESEND_FROM_EMAIL', { infer: true })
	}

	// ==================== Security ====================

	getCsrfSecret(): string | undefined {
		return this.configService.get('CSRF_SECRET', { infer: true })
	}

	getSessionSecret(): string | undefined {
		return this.configService.get('SESSION_SECRET', { infer: true })
	}

	// ==================== Features ====================

	isSwaggerEnabled(): boolean {
		return this.configService.get('ENABLE_SWAGGER', { infer: true })
	}

	// ==================== Platform Detection ====================

	isRailway(): boolean {
		return !!this.configService.get('RAILWAY_PROJECT_ID', { infer: true })
	}

	isVercel(): boolean {
		return !!this.configService.get('VERCEL_ENV', { infer: true })
	}

	isDocker(): boolean {
		return this.configService.get('DOCKER_CONTAINER', { infer: true })
	}

	isLocalhostCorsAllowed(): boolean {
		return this.configService.get('ALLOW_LOCALHOST_CORS', { infer: true })
	}

	// ==================== Generic Getter ====================

	get<K extends keyof Config>(key: K): Config[K] {
		return this.configService.get(key, { infer: true })
	}
}
