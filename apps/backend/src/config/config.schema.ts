import {
	IsEmail,
	IsEnum,
	IsNumberString,
	IsOptional,
	IsString,
	IsUrl,
	MinLength,
	validateSync,
	ValidationError
} from 'class-validator'
import { plainToClass, Transform } from 'class-transformer'

/**
 * Environment Configuration using class-validator
 *
 * NestJS native approach for configuration validation
 */

export class EnvironmentVariables {
	// Application
	@IsEnum(['development', 'production', 'test'])
	@IsOptional()
	NODE_ENV = 'production'

	@IsOptional()
	@Transform(({ value }) => (value ? parseInt(String(value), 10) : 4600))
	PORT = 4600

	// Database
	@IsString()
	DATABASE_URL!: string

	@IsOptional()
	@IsString()
	DIRECT_URL?: string

	@IsOptional()
	@IsNumberString()
	DATABASE_MAX_CONNECTIONS?: string

	@IsOptional()
	@IsNumberString()
	DATABASE_CONNECTION_TIMEOUT?: string

	// Authentication
	@IsString()
	@MinLength(32, { message: 'JWT secret must be at least 32 characters' })
	JWT_SECRET!: string

	@IsOptional()
	@IsString()
	JWT_EXPIRES_IN = '7d'

	// Supabase
	@IsUrl({}, { message: 'Must be a valid URL' })
	SUPABASE_URL!: string

	@IsString()
	SUPABASE_SERVICE_ROLE_KEY!: string

	@IsString()
	@MinLength(32, {
		message: 'Supabase JWT secret must be at least 32 characters'
	})
	SUPABASE_JWT_SECRET!: string

	@IsString()
	SUPABASE_ANON_KEY!: string

	// CORS
	@IsOptional()
	@IsString()
	CORS_ORIGINS?: string

	// Rate Limiting
	@IsOptional()
	@IsNumberString()
	RATE_LIMIT_TTL?: string

	@IsOptional()
	@IsNumberString()
	RATE_LIMIT_LIMIT?: string

	// Stripe
	@IsString()
	STRIPE_SECRET_KEY!: string

	@IsOptional()
	@IsString()
	STRIPE_PUBLISHABLE_KEY?: string

	@IsString()
	STRIPE_WEBHOOK_SECRET!: string

	// Stripe Sync Engine Configuration (Sub-Plan 1)
	@IsOptional()
	@IsString()
	STRIPE_SYNC_DATABASE_SCHEMA?: string = 'stripe'

	@IsOptional()
	@Transform(({ value }) => value === 'true')
	STRIPE_SYNC_AUTO_EXPAND_LISTS?: boolean = true

	@IsOptional()
	@Transform(({ value }) => value === 'true')
	STRIPE_SYNC_BACKFILL_RELATED_ENTITIES?: boolean = true

	@IsOptional()
	@Transform(({ value }) => parseInt(value, 10))
	STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS?: number = 10

	@IsOptional()
	@IsString()
	STRIPE_PRICE_ID_STARTER?: string

	@IsOptional()
	@IsString()
	STRIPE_PRICE_ID_GROWTH?: string

	@IsOptional()
	@IsString()
	STRIPE_PRICE_ID_BUSINESS?: string

	@IsOptional()
	@IsString()
	STRIPE_PRICE_ID_TENANTFLOW_MAX?: string

	// Redis
	@IsOptional()
	@IsString()
	REDIS_URL?: string

	@IsOptional()
	@IsString()
	REDIS_HOST?: string

	@IsOptional()
	@IsNumberString()
	REDIS_PORT?: string

	@IsOptional()
	@IsString()
	REDIS_PASSWORD?: string

	@IsOptional()
	@IsNumberString()
	REDIS_DB?: string

	// Logging
	@IsOptional()
	@IsEnum(['error', 'warn', 'info', 'debug'])
	LOG_LEVEL = 'info'

	// Monitoring
	@IsOptional()
	@Transform(({ value }) => value === 'true')
	ENABLE_METRICS = false

	// File Storage
	@IsOptional()
	@IsEnum(['local', 'supabase', 's3'])
	STORAGE_PROVIDER = 'supabase'

	@IsOptional()
	@IsString()
	STORAGE_BUCKET = 'tenant-flow-storage'

	// Email
	@IsOptional()
	@IsString()
	SMTP_HOST?: string

	@IsOptional()
	@IsNumberString()
	SMTP_PORT?: string

	@IsOptional()
	@IsString()
	SMTP_USER?: string

	@IsOptional()
	@IsString()
	SMTP_PASS?: string

	@IsOptional()
	@IsEmail()
	FROM_EMAIL?: string

	// Resend
	@IsOptional()
	@IsString()
	RESEND_API_KEY?: string

	@IsOptional()
	@IsEmail()
	RESEND_FROM_EMAIL?: string = 'noreply@tenantflow.app'

	// Analytics
	@IsOptional()
	@IsString()
	POSTHOG_KEY?: string

	// Security
	@IsOptional()
	@IsString()
	CSRF_SECRET?: string

	@IsOptional()
	@IsString()
	@MinLength(32, { message: 'Session secret must be at least 32 characters' })
	SESSION_SECRET?: string

	// Production Features (stable configuration)
	@IsOptional()
	@Transform(({ value }) => value === 'true')
	ENABLE_SWAGGER = false

	@IsOptional()
	@Transform(({ value }) => value !== 'false')
	ENABLE_RATE_LIMITING = true

	// Rate limiting is configured directly in code for simplicity

	// Platform Detection (optional)
	@IsOptional()
	@IsString()
	RAILWAY_PUBLIC_DOMAIN?: string

	@IsOptional()
	@IsString()
	RAILWAY_PRIVATE_DOMAIN?: string

	@IsOptional()
	@IsString()
	RAILWAY_PROJECT_NAME?: string

	@IsOptional()
	@IsString()
	RAILWAY_ENVIRONMENT_NAME?: string

	@IsOptional()
	@IsString()
	RAILWAY_SERVICE_NAME?: string

	@IsOptional()
	@IsString()
	RAILWAY_PROJECT_ID?: string

	@IsOptional()
	@IsString()
	RAILWAY_ENVIRONMENT_ID?: string

	@IsOptional()
	@IsString()
	RAILWAY_SERVICE_ID?: string

	@IsOptional()
	@Transform(({ value }) => value === 'true')
	ALLOW_LOCALHOST_CORS = false

	@IsOptional()
	@IsString()
	REDISHOST?: string

	@IsOptional()
	@IsString()
	REDISPASSWORD?: string

	@IsOptional()
	@Transform(({ value }) => value ? String(value) : undefined)
	REDISPORT?: string

	@IsOptional()
	@IsString()
	VERCEL_ENV?: string

	@IsOptional()
	@IsString()
	VERCEL_URL?: string

	@IsOptional()
	@Transform(({ value }) => value === 'true')
	DOCKER_CONTAINER = false
}

export function validate(config: Record<string, unknown>) {
	const validatedConfig = plainToClass(EnvironmentVariables, config, {
		enableImplicitConversion: true
	})

	const errors = validateSync(validatedConfig, {
		skipMissingProperties: false,
		forbidUnknownValues: false
	})

	if (errors.length > 0) {
		const errorMessages = errors.map((error: ValidationError) => {
			const constraints = error.constraints || {}
			return `${error.property}: ${Object.values(constraints).join(', ')}`
		})
		throw new Error(
			`Configuration validation failed: ${errorMessages.join('; ')}`
		)
	}

	return validatedConfig
}

export type Config = EnvironmentVariables
