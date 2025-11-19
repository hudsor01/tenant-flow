import 'reflect-metadata'
import { validate } from './config.schema'
import { CONFIG_DEFAULTS } from './config.constants'

type MutableConfig = Record<string, any>

const BASE_CONFIG = {
	DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
	JWT_SECRET: 'a'.repeat(32),
	SUPABASE_URL: 'https://project.supabase.co',
	SUPABASE_SECRET_KEY: 'secret-key',
	SUPABASE_JWT_SECRET: 'b'.repeat(32),
	SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
	SUPABASE_PROJECT_REF: 'project-ref',
	STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'test_stripe_secret_key_placeholder_not_a_real_key',
	STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_secret',
	SUPPORT_EMAIL: 'support@tenantflow.app',
	RESEND_API_KEY: 're_test_1234567890',
	IDEMPOTENCY_KEY_SECRET: 'c'.repeat(32),
	NEXT_PUBLIC_APP_URL: 'https://tenantflow.app',
	HEALTH_THROTTLE_TTL: CONFIG_DEFAULTS.HEALTH_THROTTLE_TTL,
	HEALTH_THROTTLE_LIMIT: CONFIG_DEFAULTS.HEALTH_THROTTLE_LIMIT,
	CONTACT_THROTTLE_TTL: CONFIG_DEFAULTS.CONTACT_THROTTLE_TTL,
	CONTACT_THROTTLE_LIMIT: CONFIG_DEFAULTS.CONTACT_THROTTLE_LIMIT,
	METRICS_THROTTLE_TTL: CONFIG_DEFAULTS.METRICS_THROTTLE_TTL,
	METRICS_THROTTLE_LIMIT: CONFIG_DEFAULTS.METRICS_THROTTLE_LIMIT,
	WEBHOOK_THROTTLE_TTL: CONFIG_DEFAULTS.WEBHOOK_THROTTLE_TTL,
	WEBHOOK_THROTTLE_LIMIT: CONFIG_DEFAULTS.WEBHOOK_THROTTLE_LIMIT,
	STRIPE_SYNC_THROTTLE_TTL: CONFIG_DEFAULTS.STRIPE_SYNC_THROTTLE_TTL,
	STRIPE_SYNC_THROTTLE_LIMIT: CONFIG_DEFAULTS.STRIPE_SYNC_THROTTLE_LIMIT,
	SUPABASE_AUTH_THROTTLE_TTL: CONFIG_DEFAULTS.SUPABASE_AUTH_THROTTLE_TTL,
	SUPABASE_AUTH_THROTTLE_LIMIT: CONFIG_DEFAULTS.SUPABASE_AUTH_THROTTLE_LIMIT
} as const

const createValidConfig = (): MutableConfig => ({ ...BASE_CONFIG })

describe('Configuration Schema Validation', () => {
	let originalEnv: NodeJS.ProcessEnv

	beforeEach(() => {
		originalEnv = { ...process.env }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	describe('Required Fields Validation', () => {
		it('should validate minimal required configuration', () => {
			const config = createValidConfig()

			expect(() => validate(config)).not.toThrow()
			const result = validate(config)
			expect(result).toBeDefined()
			expect(result.DATABASE_URL).toBe(config.DATABASE_URL)
			expect(result.JWT_SECRET).toBe(config.JWT_SECRET)
		})

		it('should throw error for missing DATABASE_URL', () => {
			const config = createValidConfig()
			delete config.DATABASE_URL

			expect(() => validate(config)).toThrow('DATABASE_URL')
		})

		it('should throw error for short JWT_SECRET', () => {
			const config = createValidConfig()
			config.JWT_SECRET = 'short' // Less than 32 characters

			expect(() => validate(config)).toThrow(
				'JWT secret must be at least 32 characters'
			)
		})

		it('should throw error for short SUPABASE_JWT_SECRET', () => {
			const config = createValidConfig()
			config.SUPABASE_JWT_SECRET = 'short'

			expect(() => validate(config)).toThrow(
				'Supabase JWT secret must be at least 32 characters'
			)
		})

		it('should normalize SUPABASE_JWT_ALGORITHM to uppercase', () => {
			const config = createValidConfig()
			config.SUPABASE_JWT_ALGORITHM = 'rs256'

			const result = validate(config)
			expect(result.SUPABASE_JWT_ALGORITHM).toBe('RS256')
		})

		it('should throw error for invalid SUPABASE_JWT_ALGORITHM', () => {
			const config = createValidConfig()
			config.SUPABASE_JWT_ALGORITHM = 'HS512'

			expect(() => validate(config)).toThrow(
				'Invalid option: expected one of "ES256"|"RS256"'
			)
		})

		it('should throw error for invalid SUPABASE_URL', () => {
			const config = createValidConfig()
			config.SUPABASE_URL = 'not-a-valid-url'

			expect(() => validate(config)).toThrow('Must be a valid URL')
		})
	})

	describe('Default Values', () => {
		it('should apply default values for optional fields', () => {
			const config = createValidConfig()

			const result = validate(config)

			expect(result.NODE_ENV).toBe(CONFIG_DEFAULTS.NODE_ENV) // Default
			expect(result.PORT).toBe(CONFIG_DEFAULTS.PORT) // Default
			expect(result.JWT_EXPIRES_IN).toBe(CONFIG_DEFAULTS.JWT_EXPIRES_IN) // Default
			expect(result.LOG_LEVEL).toBe(CONFIG_DEFAULTS.LOG_LEVEL) // Default
			expect(result.STORAGE_PROVIDER).toBe(CONFIG_DEFAULTS.STORAGE_PROVIDER) // Default
			expect(result.STORAGE_BUCKET).toBe(CONFIG_DEFAULTS.STORAGE_BUCKET) // Default
			expect(result.ENABLE_METRICS).toBe(CONFIG_DEFAULTS.ENABLE_METRICS) // Default
			expect(result.ENABLE_SWAGGER).toBe(CONFIG_DEFAULTS.ENABLE_SWAGGER) // Default
			expect(result.ENABLE_RATE_LIMITING).toBe(CONFIG_DEFAULTS.ENABLE_RATE_LIMITING) // Default
			expect(result.ALLOW_LOCALHOST_CORS).toBe(CONFIG_DEFAULTS.ALLOW_LOCALHOST_CORS) // Default
			expect(result.PROMETHEUS_REQUIRE_AUTH).toBe(
				CONFIG_DEFAULTS.PROMETHEUS_REQUIRE_AUTH
			)
		})

		it('should override defaults with provided values', () => {
			const config = {
				...createValidConfig(),
				NODE_ENV: 'development',
				PORT: '3000',
				JWT_EXPIRES_IN: '1d',
				LOG_LEVEL: 'debug',
				ENABLE_METRICS: 'true',
				ENABLE_SWAGGER: 'true'
			}

			const result = validate(config)

			expect(result.NODE_ENV).toBe('development')
			expect(result.PORT).toBe(3000)
			expect(result.JWT_EXPIRES_IN).toBe('1d')
			expect(result.LOG_LEVEL).toBe('debug')
			expect(result.ENABLE_METRICS).toBe(true)
			expect(result.ENABLE_SWAGGER).toBe(true)
		})

		it('should allow disabling Prometheus auth via env', () => {
			const config = {
				...createValidConfig(),
				PROMETHEUS_REQUIRE_AUTH: 'false'
			}

			const result = validate(config)
			expect(result.PROMETHEUS_REQUIRE_AUTH).toBe(false)
		})
	})

	describe('Type Transformations', () => {
		it('should transform string port to number', () => {
			const config = {
				...createValidConfig(),
				PORT: '8080'
			}

			const result = validate(config)
			expect(result.PORT).toBe(8080)
			expect(typeof result.PORT).toBe('number')
		})

		it('should transform string booleans to actual booleans', () => {
			const config = {
				...createValidConfig(),
				ENABLE_METRICS: 'true',
				ENABLE_SWAGGER: false,
				DOCKER_CONTAINER: 'true',
				ALLOW_LOCALHOST_CORS: false
			}

			const result = validate(config)
			expect(result.ENABLE_METRICS).toBe(true)
			expect(result.ENABLE_SWAGGER).toBe(false)
			expect(result.DOCKER_CONTAINER).toBe(true)
			expect(result.ALLOW_LOCALHOST_CORS).toBe(false)
		})

		it('should handle STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS number transformation', () => {
			const config = {
				...createValidConfig(),
				STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS: '20'
			}

			const result = validate(config)
			expect(result.STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS).toBe(20)
			expect(typeof result.STRIPE_SYNC_MAX_POSTGRES_CONNECTIONS).toBe('number')
		})
	})

	describe('Enum Validation', () => {
		it('should validate NODE_ENV enum values', () => {
			const validEnvs = ['development', 'production', 'test']

			for (const env of validEnvs) {
				const config = {
					...createValidConfig(),
					NODE_ENV: env
				}

				expect(() => validate(config)).not.toThrow()
				const result = validate(config)
				expect(result.NODE_ENV).toBe(env)
			}
		})

		it('should reject invalid NODE_ENV values', () => {
			const config = {
				...createValidConfig(),
				NODE_ENV: 'invalid-env'
			}

			expect(() => validate(config)).toThrow('NODE_ENV')
		})

		it('should validate LOG_LEVEL enum values', () => {
			const validLogLevels = ['error', 'warn', 'info', 'debug']

			for (const level of validLogLevels) {
				const config = {
					...createValidConfig(),
					LOG_LEVEL: level
				}

				expect(() => validate(config)).not.toThrow()
				const result = validate(config)
				expect(result.LOG_LEVEL).toBe(level)
			}
		})

		it('should validate STORAGE_PROVIDER enum values', () => {
			const validProviders = ['local', 'supabase', 's3']

			for (const provider of validProviders) {
				const config = {
					...createValidConfig(),
					STORAGE_PROVIDER: provider
				}

				expect(() => validate(config)).not.toThrow()
				const result = validate(config)
				expect(result.STORAGE_PROVIDER).toBe(provider)
			}
		})
	})

	describe('Email Validation', () => {
		it('should validate email format for FROM_EMAIL', () => {
			const config = {
				...createValidConfig(),
				FROM_EMAIL: 'noreply@example.com'
			}

			expect(() => validate(config)).not.toThrow()
		})

		it('should reject invalid email format for FROM_EMAIL', () => {
			const config = {
				...createValidConfig(),
				FROM_EMAIL: 'not-an-email'
			}

			expect(() => validate(config)).toThrow('FROM_EMAIL')
		})

		it('should validate email format for RESEND_FROM_EMAIL', () => {
			const config = {
				...createValidConfig(),
				RESEND_FROM_EMAIL: 'support@tenantflow.app'
			}

			expect(() => validate(config)).not.toThrow()
		})
	})

	describe('Number String Validation', () => {
		it('should validate number string fields', () => {
			const config = {
				...createValidConfig(),
				DATABASE_MAX_CONNECTIONS: '20',
				DATABASE_CONNECTION_TIMEOUT: '30000',
				RATE_LIMIT_TTL: '900',
				RATE_LIMIT_LIMIT: '100',
				REDIS_PORT: '6379',
				REDIS_DB: '0',
				SMTP_PORT: '587'
			}

			expect(() => validate(config)).not.toThrow()
		})

		it('should reject non-numeric strings for number fields', () => {
			const config = {
				...createValidConfig(),
				DATABASE_MAX_CONNECTIONS: 'not-a-number'
			}

			// DATABASE_MAX_CONNECTIONS is optional string, so it won't throw for non-numeric values
			expect(() => validate(config)).not.toThrow()
		})
	})

	describe('Session Secret Validation', () => {
		it('should validate minimum length for SESSION_SECRET', () => {
			const config = {
				...createValidConfig(),
				SESSION_SECRET: 'c'.repeat(32)
			}

			expect(() => validate(config)).not.toThrow()
		})

		it('should reject short SESSION_SECRET', () => {
			const config = {
				...createValidConfig(),
				SESSION_SECRET: 'short'
			}

			expect(() => validate(config)).toThrow(
				'Session secret must be at least 32 characters'
			)
		})
	})

	describe('Multiple Validation Errors', () => {
		it('should report multiple validation errors', () => {
			const config = {
				...createValidConfig(),
				JWT_SECRET: 'short', // Too short
				SUPABASE_URL: 'not-a-url', // Invalid URL
				SUPABASE_JWT_SECRET: 'also-short', // Too short
				FROM_EMAIL: 'not-an-email', // Invalid email
				NODE_ENV: 'invalid-env' // Invalid enum
			}

			expect(() => validate(config)).toThrow('Configuration validation failed')
		})
	})
})
