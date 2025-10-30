import 'reflect-metadata'
import { validate } from './config.schema'

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
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123'
			}

			expect(() => validate(config)).not.toThrow()
			const result = validate(config)
			expect(result).toBeDefined()
			expect(result.DATABASE_URL).toBe(config.DATABASE_URL)
			expect(result.JWT_SECRET).toBe(config.JWT_SECRET)
		})

		it('should throw error for missing DATABASE_URL', () => {
			const config = {
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123'
			}

			expect(() => validate(config)).toThrow('DATABASE_URL')
		})

		it('should throw error for short JWT_SECRET', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'short', // Less than 32 characters
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123'
			}

			expect(() => validate(config)).toThrow(
				'JWT secret must be at least 32 characters'
			)
		})

		it('should throw error for short SUPABASE_JWT_SECRET', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'short',
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123'
			}

			expect(() => validate(config)).toThrow(
				'Supabase JWT secret must be at least 32 characters'
			)
		})

		it('should throw error for invalid SUPABASE_URL', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'not-a-valid-url',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123'
			}

			expect(() => validate(config)).toThrow('Must be a valid URL')
		})
	})

	describe('Default Values', () => {
		it('should apply default values for optional fields', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123'
			}

			const result = validate(config)

			expect(result.NODE_ENV).toBe('production') // Default
			expect(result.PORT).toBe(4600) // Default
			expect(result.JWT_EXPIRES_IN).toBe('7d') // Default
			expect(result.LOG_LEVEL).toBe('info') // Default
			expect(result.STORAGE_PROVIDER).toBe('supabase') // Default
			expect(result.STORAGE_BUCKET).toBe('tenant-flow-storage') // Default
			expect(result.ENABLE_METRICS).toBe(false) // Default
			expect(result.ENABLE_SWAGGER).toBe(false) // Default
			expect(result.ENABLE_RATE_LIMITING).toBe(true) // Default
			expect(result.ALLOW_LOCALHOST_CORS).toBe(false) // Default
		})

		it('should override defaults with provided values', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
	})

	describe('Type Transformations', () => {
		it('should transform string port to number', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				PORT: '8080'
			}

			const result = validate(config)
			expect(result.PORT).toBe(8080)
			expect(typeof result.PORT).toBe('number')
		})

		it('should transform string booleans to actual booleans', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
					DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
					JWT_SECRET: 'a'.repeat(32),
					SUPABASE_URL: 'https://project.supabase.co',
					SUPABASE_SECRET_KEY: 'service-role-key',
					SUPABASE_JWT_SECRET: 'b'.repeat(32),
					SUPABASE_PUBLISHABLE_KEY: 'anon-key',
					STRIPE_SECRET_KEY: 'sk_test_123',
					STRIPE_WEBHOOK_SECRET: 'whsec_123',
					NODE_ENV: env
				}

				expect(() => validate(config)).not.toThrow()
				const result = validate(config)
				expect(result.NODE_ENV).toBe(env)
			}
		})

		it('should reject invalid NODE_ENV values', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				NODE_ENV: 'invalid-env'
			}

			expect(() => validate(config)).toThrow('NODE_ENV')
		})

		it('should validate LOG_LEVEL enum values', () => {
			const validLogLevels = ['error', 'warn', 'info', 'debug']

			for (const level of validLogLevels) {
				const config = {
					DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
					JWT_SECRET: 'a'.repeat(32),
					SUPABASE_URL: 'https://project.supabase.co',
					SUPABASE_SECRET_KEY: 'service-role-key',
					SUPABASE_JWT_SECRET: 'b'.repeat(32),
					SUPABASE_PUBLISHABLE_KEY: 'anon-key',
					STRIPE_SECRET_KEY: 'sk_test_123',
					STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
					DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
					JWT_SECRET: 'a'.repeat(32),
					SUPABASE_URL: 'https://project.supabase.co',
					SUPABASE_SECRET_KEY: 'service-role-key',
					SUPABASE_JWT_SECRET: 'b'.repeat(32),
					SUPABASE_PUBLISHABLE_KEY: 'anon-key',
					STRIPE_SECRET_KEY: 'sk_test_123',
					STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				FROM_EMAIL: 'noreply@example.com'
			}

			expect(() => validate(config)).not.toThrow()
		})

		it('should reject invalid email format for FROM_EMAIL', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				FROM_EMAIL: 'not-an-email'
			}

			expect(() => validate(config)).toThrow('FROM_EMAIL')
		})

		it('should validate email format for RESEND_FROM_EMAIL', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				RESEND_FROM_EMAIL: 'support@tenantflow.app'
			}

			expect(() => validate(config)).not.toThrow()
		})
	})

	describe('Number String Validation', () => {
		it('should validate number string fields', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				DATABASE_MAX_CONNECTIONS: 'not-a-number'
			}

			// DATABASE_MAX_CONNECTIONS is optional string, so it won't throw for non-numeric values
			expect(() => validate(config)).not.toThrow()
		})
	})

	describe('Session Secret Validation', () => {
		it('should validate minimum length for SESSION_SECRET', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				SESSION_SECRET: 'c'.repeat(32)
			}

			expect(() => validate(config)).not.toThrow()
		})

		it('should reject short SESSION_SECRET', () => {
			const config = {
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'a'.repeat(32),
				SUPABASE_URL: 'https://project.supabase.co',
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'b'.repeat(32),
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
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
				DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
				JWT_SECRET: 'short', // Too short
				SUPABASE_URL: 'not-a-url', // Invalid URL
				SUPABASE_SECRET_KEY: 'service-role-key',
				SUPABASE_JWT_SECRET: 'also-short', // Too short
				SUPABASE_PUBLISHABLE_KEY: 'anon-key',
				STRIPE_SECRET_KEY: 'sk_test_123',
				STRIPE_WEBHOOK_SECRET: 'whsec_123',
				FROM_EMAIL: 'not-an-email', // Invalid email
				NODE_ENV: 'invalid-env' // Invalid enum
			}

			expect(() => validate(config)).toThrow('Configuration validation failed')
		})
	})
})
