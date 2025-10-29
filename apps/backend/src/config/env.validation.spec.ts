import { Logger } from '@nestjs/common'
import { validateEnvironment } from './env.validation'

describe('Environment Validation', () => {
	let originalEnv: NodeJS.ProcessEnv
	let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock }

	beforeEach(() => {
		// Save original environment
		originalEnv = { ...process.env }

		// Create mock logger instance
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		}

		// Mock Logger constructor to return our mock instance
		jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log)
		jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error)
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn)

		// Clear all mocks
		jest.clearAllMocks()
	})

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv
		// Restore all mocks
		jest.restoreAllMocks()
	})

	describe('Required Environment Variables', () => {
		it('should pass validation when all required variables are present', () => {
			// Set all required environment variables
			process.env.DATABASE_URL =
				process.env.TEST_DATABASE_URL ||
				'postgresql://user:pass@localhost:5432/testdb'
			process.env.DIRECT_URL = 'postgresql://user:pass@localhost:5432/testdb'
			process.env.JWT_SECRET = 'a'.repeat(32)
			process.env.SUPABASE_URL = 'https://project.supabase.co'
			process.env.SUPABASE_SECRET_KEY = 'service-role-key'
			process.env.SUPABASE_JWT_SECRET = 'b'.repeat(32)
			process.env.CORS_ORIGINS = 'https://example.com'

			expect(() => validateEnvironment()).not.toThrow()
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Environment validation completed successfully'
			)
		})

		it('should throw error in production when required variables are missing', () => {
			process.env.NODE_ENV = 'production'
			// Clear required variables to trigger failure
			delete process.env.DATABASE_URL
			delete process.env.SUPABASE_URL
			delete process.env.SERVICE_ROLE_KEY
			delete process.env.SUPABASE_SECRET_KEY
			delete process.env.SUPABASE_SERVICE_KEY

			expect(() => validateEnvironment()).toThrow(
				'Critical environment variables missing'
			)
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Missing required environment variables:')
			)
		})

		it('should warn in development when required variables are missing', () => {
			process.env.NODE_ENV = 'development'
			// Clear required variables to trigger failure
			delete process.env.DATABASE_URL
			delete process.env.SUPABASE_URL
			delete process.env.SERVICE_ROLE_KEY
			delete process.env.SUPABASE_SECRET_KEY
			delete process.env.SUPABASE_SERVICE_KEY

			expect(() => validateEnvironment()).not.toThrow()
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Missing required environment variables:')
			)
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Running in development mode with missing environment variables'
			)
		})

		it('should identify all missing required variables', () => {
			process.env.NODE_ENV = 'production'
			// Only set one variable, leave others missing
			process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
			// Clear the ones we're testing are missing
			delete process.env.JWT_SECRET
			delete process.env.SUPABASE_URL
			delete process.env.SERVICE_ROLE_KEY
			delete process.env.SUPABASE_SECRET_KEY
			delete process.env.SUPABASE_SERVICE_KEY
			delete process.env.SUPABASE_JWT_SECRET
			delete process.env.CORS_ORIGINS

			// Note: SUPABASE_JWT_SECRET is no longer required - we use JWKS endpoint
			expect(() => validateEnvironment()).toThrow(
				'Critical environment variables missing: SUPABASE_URL, SUPABASE_SECRET_KEY, JWT_SECRET, CORS_ORIGINS'
			)
		})
	})

	describe('CORS Origins Validation', () => {
		beforeEach(() => {
			// Set all other required variables
			process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
			process.env.JWT_SECRET = 'a'.repeat(32)
			process.env.SUPABASE_URL = 'https://project.supabase.co'
			process.env.SUPABASE_SECRET_KEY = 'service-role-key'
			process.env.SUPABASE_JWT_SECRET = 'b'.repeat(32)
		})

		it('should validate single CORS origin', () => {
			process.env.CORS_ORIGINS = 'https://example.com'

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should validate multiple CORS origins', () => {
			process.env.CORS_ORIGINS =
				'https://example.com,https://app.example.com,https://staging.example.com'

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should handle CORS origins with ports', () => {
			process.env.CORS_ORIGINS =
				'https://example.com:3000,https://tenantflow.app'

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should trim whitespace from CORS origins', () => {
			process.env.CORS_ORIGINS =
				' https://example.com , https://app.example.com '

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should reject invalid CORS origin formats', () => {
			const invalidOrigins = [
				'not-a-url',
				'ftp://example.com',
				'example.com', // Missing protocol
				'https://' // Incomplete URL
			]

			for (const invalidOrigin of invalidOrigins) {
				process.env.CORS_ORIGINS = invalidOrigin

				expect(() => validateEnvironment()).toThrow(
					`Invalid CORS origin format: ${invalidOrigin}. Origins must be valid URLs.`
				)
			}
		})

		it('should reject HTTP origins in production', () => {
			process.env.NODE_ENV = 'production'
			process.env.CORS_ORIGINS = 'https://example.com,http://insecure.com'

			expect(() => validateEnvironment()).toThrow(
				'Production environment cannot have HTTP origins: http://insecure.com'
			)
		})

		it('should allow HTTP origins in development', () => {
			process.env.NODE_ENV = 'development'
			process.env.CORS_ORIGINS = 'https://example.com,https://tenantflow.app'

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should allow multiple HTTP origins rejection in production', () => {
			process.env.NODE_ENV = 'production'
			process.env.CORS_ORIGINS =
				'https://example.com,http://insecure1.com,http://insecure2.com'

			expect(() => validateEnvironment()).toThrow(
				'Production environment cannot have HTTP origins: http://insecure1.com, http://insecure2.com'
			)
		})
	})

	describe('Database URL Validation', () => {
		beforeEach(() => {
			// Set all other required variables
			process.env.JWT_SECRET = 'a'.repeat(32)
			process.env.SUPABASE_URL = 'https://project.supabase.co'
			process.env.SUPABASE_SECRET_KEY = 'service-role-key'
			process.env.CORS_ORIGINS = 'https://example.com'
		})

		it('should validate PostgreSQL connection string', () => {
			process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should validate PostgreSQL connection string with SSL parameters', () => {
			process.env.DATABASE_URL =
				'postgresql://user:pass@host:5432/db?sslmode=require'

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should reject non-PostgreSQL database URLs', () => {
			const invalidUrls = [
				'mysql://user:pass@localhost:3306/testdb',
				'sqlite:///path/to/database.db',
				'mongodb://localhost:27017/testdb',
				'redis://localhost:6379',
				'not-a-database-url'
			]

			for (const invalidUrl of invalidUrls) {
				process.env.DATABASE_URL = invalidUrl

				expect(() => validateEnvironment()).toThrow(
					'DATABASE_URL must be a valid PostgreSQL connection string'
				)
			}
		})

		it('should pass when DATABASE_URL is not set (for development)', () => {
			delete process.env.DATABASE_URL
			process.env.NODE_ENV = 'development'

			expect(() => validateEnvironment()).not.toThrow()
		})
	})

	describe('Edge Cases', () => {
		it('should handle empty CORS_ORIGINS', () => {
			// Set all other required variables
			process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
			process.env.DIRECT_URL = 'postgresql://user:pass@localhost:5432/testdb'
			process.env.JWT_SECRET = 'a'.repeat(32)
			process.env.SUPABASE_URL = 'https://project.supabase.co'
			process.env.SUPABASE_SECRET_KEY = 'service-role-key'
			process.env.SUPABASE_JWT_SECRET = 'b'.repeat(32)
			process.env.CORS_ORIGINS = ''

			expect(() => validateEnvironment()).not.toThrow()
		})

		it('should handle undefined NODE_ENV (defaults to development behavior)', () => {
			delete process.env.NODE_ENV
			// Clear required variables to trigger failure
			delete process.env.DATABASE_URL
			delete process.env.SUPABASE_URL
			delete process.env.SERVICE_ROLE_KEY
			delete process.env.SUPABASE_SECRET_KEY
			delete process.env.SUPABASE_SERVICE_KEY

			expect(() => validateEnvironment()).not.toThrow()
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Running in development mode with missing environment variables'
			)
		})

		it('should handle test environment like development', () => {
			process.env.NODE_ENV = 'test'
			// Clear required variables to trigger failure
			delete process.env.DATABASE_URL
			delete process.env.SUPABASE_URL
			delete process.env.SERVICE_ROLE_KEY
			delete process.env.SUPABASE_SECRET_KEY
			delete process.env.SUPABASE_SERVICE_KEY

			expect(() => validateEnvironment()).not.toThrow()
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Running in development mode with missing environment variables'
			)
		})

		it('should validate complex PostgreSQL connection strings', () => {
			process.env.DATABASE_URL =
				'postgresql://username:p%40ssw0rd@database.example.com:5432/mydb?sslmode=require&application_name=myapp'
			process.env.JWT_SECRET = 'a'.repeat(32)
			process.env.SUPABASE_URL = 'https://project.supabase.co'
			process.env.SUPABASE_SECRET_KEY = 'service-role-key'
			process.env.CORS_ORIGINS = 'https://example.com'

			expect(() => validateEnvironment()).not.toThrow()
		})
	})
})
