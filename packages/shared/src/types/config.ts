/**
 * Configuration Types
 * Shared configuration interfaces that can be used by both frontend and backend
 */

// ============================================================================
// Application Configuration
// ============================================================================

export interface AppConfig {
	port: number
	host: string
	env: 'development' | 'production' | 'test'
	apiVersion: string
	corsOrigins: string[]
}

// ============================================================================
// Database Configuration
// ============================================================================

export interface DatabaseConfig {
	url: string
	poolMin: number
	poolMax: number
	ssl: boolean
}

export interface SupabaseConfig {
	url: string
	serviceRoleKey: string
	jwtSecret: string
	anonKey: string
}

// ============================================================================
// Third-party Service Configuration
// ============================================================================

export interface StripeConfig {
	secretKey: string
	webhookSecret: string
	publishableKey?: string
}

export interface RedisConfig {
	url: string
	host?: string
	port?: number
	password?: string
	db?: number
}

export interface EmailConfig {
	provider: 'resend' | 'sendgrid' | 'smtp'
	apiKey?: string
	from: string
	replyTo?: string
}

export interface StorageConfig {
	provider: 'supabase' | 's3' | 'local'
	bucket: string
	region?: string
	accessKey?: string
	secretKey?: string
}

// ============================================================================
// Full Configuration
// ============================================================================

export interface FullConfig {
	app: AppConfig
	database: DatabaseConfig
	supabase: SupabaseConfig
	stripe: StripeConfig
	redis: RedisConfig
	email: EmailConfig
	storage: StorageConfig
}
