import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService } from '@nestjs/config'
import type { Config } from './config.schema'
import type { NodeEnvironment } from './config.constants'

/**
 * Typed wrapper around NestJS ConfigService
 *
 * Provides type-safe access to environment variables with getter methods.
 * All environment variables are cached after initial parse (ConfigModule cache: true).
 */
@Injectable()
export class AppConfigService {
	constructor(
		private readonly configService: NestConfigService<Config, true>
	) {}

	// ==================== Application ====================

	getNodeEnv(): NodeEnvironment {
		return this.get('NODE_ENV')
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
		return this.get('PORT')
	}

	getBackendTimeoutMs(): number {
		return this.get('BACKEND_TIMEOUT_MS')
	}

	getApiBaseUrl(): string {
		return this.get('API_BASE_URL')
	}

	getFrontendUrl(): string {
		return this.get('FRONTEND_URL')
	}

	getNextPublicAppUrl(): string {
		return this.get('NEXT_PUBLIC_APP_URL')
	}

	// ==================== Database ====================

	getDatabaseUrl(): string {
		return this.get('DATABASE_URL')
	}

	getDirectUrl(): string | undefined {
		return this.get('DIRECT_URL')
	}

	// ==================== Authentication ====================

	getJwtSecret(): string {
		return this.get('JWT_SECRET')
	}

	getJwtPublicKeyCurrent(): string | undefined {
		return this.get('JWT_PUBLIC_KEY_CURRENT')
	}

	getJwtPublicKeyStandby(): string | undefined {
		return this.get('JWT_PUBLIC_KEY_STANDBY')
	}

	getJwtExpiresIn(): string {
		return this.get('JWT_EXPIRES_IN')
	}

	getSupabaseUrl(): string {
		return this.get('SUPABASE_URL')
	}

	getSupabaseSecretKey(): string {
		return this.get('SECRET_KEY_SUPABASE')
	}

	getSupabasePublishableKey(): string | undefined {
		return this.get('SUPABASE_PUBLISHABLE_KEY')
	}	get supabaseJwtAlgorithm(): string {
		return this.get('SUPABASE_JWT_ALGORITHM') ?? 'HS256'
	}

	get supabaseJwtSecret(): string {
		const secret = this.get('SUPABASE_JWT_SECRET')
		if (!secret) {
			throw new Error(
				'SUPABASE_JWT_SECRET is required. Get this from your Supabase dashboard under Settings > JWT Keys > JWT Secret'
			)
		}
		return secret
	}

	getSupabaseJwtSecretOptional(): string | undefined {
		return this.get('SUPABASE_JWT_SECRET')
	}

	getSupabaseProjectRef(): string {
		return this.get('SUPABASE_PROJECT_REF')
	}

	getSupabaseAuthWebhookSecret(): string | undefined {
		return this.get('SUPABASE_AUTH_WEBHOOK_SECRET')
	}

	// ==================== CORS ====================

	getCorsOrigins(): string | undefined {
		return this.get('CORS_ORIGINS')
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
		return this.get('RATE_LIMIT_TTL')
	}

	getRateLimitLimit(): string | undefined {
		return this.get('RATE_LIMIT_LIMIT')
	}

	getHealthThrottleTtl(): number {
		return this.get('HEALTH_THROTTLE_TTL')
	}

	getHealthThrottleLimit(): number {
		return this.get('HEALTH_THROTTLE_LIMIT')
	}

	getContactThrottleTtl(): number {
		return this.get('CONTACT_THROTTLE_TTL')
	}

	getContactThrottleLimit(): number {
		return this.get('CONTACT_THROTTLE_LIMIT')
	}

	getTenantInvitationThrottleTtl(): number {
		return this.get('TENANT_INVITATION_THROTTLE_TTL')
	}

	getTenantInvitationThrottleLimit(): number {
		return this.get('TENANT_INVITATION_THROTTLE_LIMIT')
	}

	getHealthMemoryWarningThreshold(): number {
		return this.get('HEALTH_MEMORY_WARNING_THRESHOLD')
	}

	getHealthMemoryCriticalThreshold(): number {
		return this.get('HEALTH_MEMORY_CRITICAL_THRESHOLD')
	}

	getHealthResponseTimeWarningThreshold(): number {
		return this.get('HEALTH_RESPONSE_TIME_WARNING_THRESHOLD')
	}

	getHealthResponseTimeCriticalThreshold(): number {
		return this.get('HEALTH_RESPONSE_TIME_CRITICAL_THRESHOLD')
	}

	getHealthCacheMaxEntries(): number {
		return this.get('HEALTH_CACHE_MAX_ENTRIES')
	}

	getMetricsThrottleTtl(): number {
		return this.get('METRICS_THROTTLE_TTL')
	}

	getMetricsThrottleLimit(): number {
		return this.get('METRICS_THROTTLE_LIMIT')
	}

	isRateLimitingEnabled(): boolean {
		return this.get('ENABLE_RATE_LIMITING')
	}

	getWebhookThrottleTtl(): number {
		return this.get('WEBHOOK_THROTTLE_TTL')
	}

	getWebhookThrottleLimit(): number {
		return this.get('WEBHOOK_THROTTLE_LIMIT')
	}

	getStripeSyncThrottleTtl(): number {
		return this.get('STRIPE_SYNC_THROTTLE_TTL')
	}

	getStripeSyncThrottleLimit(): number {
		return this.get('STRIPE_SYNC_THROTTLE_LIMIT')
	}

	getSupabaseAuthThrottleTtl(): number {
		return this.get('SUPABASE_AUTH_THROTTLE_TTL')
	}

	getSupabaseAuthThrottleLimit(): number {
		return this.get('SUPABASE_AUTH_THROTTLE_LIMIT')
	}

	// ==================== Stripe ====================

	getStripeSecretKey(): string {
		return this.get('STRIPE_SECRET_KEY')
	}

	getStripePublishableKey(): string | undefined {
		return this.get('STRIPE_PUBLISHABLE_KEY')
	}

	getStripeWebhookSecret(): string {
		return this.get('STRIPE_WEBHOOK_SECRET')
	}

	getStripePriceIds(): {
		starter: string | undefined
		growth: string | undefined
		business: string | undefined
		tenantflowMax: string | undefined
	} {
		return {
			starter: this.get('STRIPE_PRICE_ID_STARTER'),
			growth: this.get('STRIPE_PRICE_ID_GROWTH'),
			business: this.get('STRIPE_PRICE_ID_BUSINESS'),
			tenantflowMax: this.get('STRIPE_PRICE_ID_TENANTFLOW_MAX')
		}
	}

	getStripeConnectDefaultCountry(): string {
		return this.get('STRIPE_CONNECT_DEFAULT_COUNTRY')
	}

	getRedisUrl(): string | undefined {
		return this.get('REDIS_URL')
	}

	getRedisHost(): string | undefined {
		return (
			this.get('REDIS_HOST') ||
			this.get('REDISHOST')
		)
	}

	getRedisPort(): string | undefined {
		return (
			this.get('REDIS_PORT') ||
			this.get('REDISPORT')
		)
	}

	getRedisPassword(): string | undefined {
		return (
			this.get('REDIS_PASSWORD') ||
			this.get('REDISPASSWORD')
		)
	}

	getRedisDb(): string | undefined {
		return this.get('REDIS_DB')
	}

	getRedisConfig(): {
		url?: string
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
		return this.get('LOG_LEVEL')
	}

	// ==================== Monitoring ====================

	isMetricsEnabled(): boolean {
		return this.get('ENABLE_METRICS')
	}

	getPrometheusBearerToken(): string | undefined {
		return this.get('PROMETHEUS_BEARER_TOKEN')
	}

	isPrometheusAuthRequired(): boolean {
		return this.get('PROMETHEUS_REQUIRE_AUTH')
	}

	// ==================== Storage ====================

	getStorageProvider(): 'local' | 'supabase' | 's3' {
		return this.get('STORAGE_PROVIDER')
	}

	getStorageBucket(): string {
		return this.get('STORAGE_BUCKET')
	}

	// ==================== Email ====================

	getFromEmail(): string | undefined {
		return this.get('FROM_EMAIL')
	}

	getTestResendApiKey(): string | undefined {
		return this.get('TEST_RESEND_API_KEY')
	}

	getResendFromEmail(): string {
		return this.get('RESEND_FROM_EMAIL')
	}

	getResendApiKey(): string | undefined {
		return this.get('RESEND_API_KEY')
	}

	// ==================== Security ====================

	getCsrfSecret(): string | undefined {
		return this.get('CSRF_SECRET')
	}

	getSessionSecret(): string | undefined {
		return this.get('SESSION_SECRET')
	}

	// ==================== Swagger ====================

	isSwaggerEnabled(): boolean {
		return this.get('ENABLE_SWAGGER')
	}

	// ==================== Platform Detection ====================

	isRailway(): boolean {
		return !!this.get('RAILWAY_PROJECT_ID')
	}

	isVercel(): boolean {
		return !!this.get('VERCEL_ENV')
	}

	isDocker(): boolean {
		return this.get('DOCKER_CONTAINER')
	}

	isLocalhostCorsAllowed(): boolean {
		return this.get('ALLOW_LOCALHOST_CORS')
	}

	// ==================== Support ====================

	getSupportEmail(): string {
		return this.get('SUPPORT_EMAIL')
	}

	getSupportPhone(): string {
		return this.get('SUPPORT_PHONE') || '(555) 123-4567'
	}

	getIdempotencyKeySecret(): string {
		return this.get('IDEMPOTENCY_KEY_SECRET')
	}

	private get<K extends keyof Config>(key: K): Config[K] {
		return this.configService.get(key, { infer: true })
	}
}
