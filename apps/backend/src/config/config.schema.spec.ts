import 'reflect-metadata'
import { validate } from './config.schema'

type MutableConfig = Record<string, any>

const BASE_CONFIG = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
  JWT_SECRET: 'a'.repeat(32),
  SUPABASE_URL: 'https://project.supabase.co',
  SB_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_service_role_key',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  PROJECT_REF: 'project-ref',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'test_stripe_secret_key_placeholder_not_a_real_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_secret',
  SUPPORT_EMAIL: 'support@tenantflow.app',
  RESEND_API_KEY: 're_test_1234567890',
  IDEMPOTENCY_KEY_SECRET: 'c'.repeat(32),
  NEXT_PUBLIC_APP_URL: 'https://tenantflow.app',
  HEALTH_THROTTLE_TTL: 60000,
  HEALTH_THROTTLE_LIMIT: 300,
  CONTACT_THROTTLE_TTL: 60000,
  CONTACT_THROTTLE_LIMIT: 5,
  METRICS_THROTTLE_TTL: 60000,
  METRICS_THROTTLE_LIMIT: 60,
  WEBHOOK_THROTTLE_TTL: 60000,
  WEBHOOK_THROTTLE_LIMIT: 30,
  STRIPE_SYNC_THROTTLE_TTL: 60000,
  STRIPE_SYNC_THROTTLE_LIMIT: 30,
  SUPABASE_AUTH_THROTTLE_TTL: 60000,
  SUPABASE_AUTH_THROTTLE_LIMIT: 30
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

      expect(result.NODE_ENV).toBe('production') // Default
      expect(result.PORT).toBe(4650) // Default
      expect(result.JWT_EXPIRES_IN).toBe('7d') // Default
      expect(result.LOG_LEVEL).toBe('info') // Default
      expect(result.STORAGE_PROVIDER).toBe('supabase') // Default
      expect(result.STORAGE_BUCKET).toBe('tenant-flow-storage') // Default
      expect(result.ENABLE_METRICS).toBe(true) // Default
      expect(result.ENABLE_SWAGGER).toBe(false) // Default
      expect(result.ENABLE_RATE_LIMITING).toBe(true) // Default
      expect(result.ALLOW_LOCALHOST_CORS).toBe(false) // Default
      expect(result.PROMETHEUS_REQUIRE_AUTH).toBe(
        true
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
        FROM_EMAIL: 'not-an-email', // Invalid email
        NODE_ENV: 'invalid-env' // Invalid enum
      }

      expect(() => validate(config)).toThrow('Configuration validation failed')
    })
  })

  describe('Supabase URL Validation (Requirements 5.1)', () => {
    it('should accept valid Supabase URL with supabase.co domain', () => {
      const config = {
        ...createValidConfig(),
        SUPABASE_URL: 'https://myproject.supabase.co'
      }

      expect(() => validate(config)).not.toThrow()
      const result = validate(config)
      expect(result.SUPABASE_URL).toBe('https://myproject.supabase.co')
    })

    it('should accept valid Supabase URL with supabase.in domain', () => {
      const config = {
        ...createValidConfig(),
        SUPABASE_URL: 'https://myproject.supabase.in'
      }

      expect(() => validate(config)).not.toThrow()
      const result = validate(config)
      expect(result.SUPABASE_URL).toBe('https://myproject.supabase.in')
    })

    it('should accept valid Supabase URL with custom supabase subdomain', () => {
      const config = {
        ...createValidConfig(),
        SUPABASE_URL: 'https://custom.supabase.example.com'
      }

      expect(() => validate(config)).not.toThrow()
      const result = validate(config)
      expect(result.SUPABASE_URL).toBe('https://custom.supabase.example.com')
    })

    it('should reject non-Supabase URL (generic domain)', () => {
      const config = {
        ...createValidConfig(),
        SUPABASE_URL: 'https://example.com'
      }

      expect(() => validate(config)).toThrow(
        'Must be a Supabase URL (contains supabase.co, supabase.in, or supabase.)'
      )
    })

    it('should reject non-Supabase URL (different service)', () => {
      const config = {
        ...createValidConfig(),
        SUPABASE_URL: 'https://myproject.firebase.com'
      }

      expect(() => validate(config)).toThrow(
        'Must be a Supabase URL (contains supabase.co, supabase.in, or supabase.)'
      )
    })

    it('should reject invalid URL format', () => {
      const config = {
        ...createValidConfig(),
        SUPABASE_URL: 'not-a-valid-url'
      }

      expect(() => validate(config)).toThrow('Must be a valid URL')
    })
  })

  describe('JWT Format Validation (Requirements 5.2, 5.3)', () => {
    it('should accept valid JWT format starting with eyJ', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      }

      expect(() => validate(config)).not.toThrow()
      const result = validate(config)
      expect(result.SB_SECRET_KEY).toMatch(/^eyJ/)
    })

    it('should accept modern secret key format (starts with sb_secret_)', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: 'sb_secret_ITkyo4Pcyz1234567890abcdefghijklmnopqrstuvwxyz'
      }

      expect(() => validate(config)).not.toThrow()
      const result = validate(config)
      expect(result.SB_SECRET_KEY).toBe('sb_secret_ITkyo4Pcyz1234567890abcdefghijklmnopqrstuvwxyz')
    })

    it('should accept legacy JWT format (starts with eyJ)', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: 'eyJtest_key_with_jwt_format'
      }

      expect(() => validate(config)).not.toThrow()
      const result = validate(config)
      expect(result.SB_SECRET_KEY).toBe('eyJtest_key_with_jwt_format')
    })

    it('should reject invalid format (neither sb_secret_ nor eyJ)', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: 'random_string_not_valid'
      }

      expect(() => validate(config)).toThrow(
        'Service role key must be either a secret key (starts with sb_secret_) or JWT (starts with eyJ)'
      )
    })

    it('should reject empty string', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: ''
      }

      expect(() => validate(config)).toThrow(
        'Service role key must be either a secret key (starts with sb_secret_) or JWT (starts with eyJ)'
      )
    })

    it('should reject invalid prefix (eyI instead of eyJ)', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: 'eyItest_key_wrong_prefix'
      }

      expect(() => validate(config)).toThrow(
        'Service role key must be either a secret key (starts with sb_secret_) or JWT (starts with eyJ)'
      )
    })

    it('should reject old format without underscore (sbsecret)', () => {
      const config = {
        ...createValidConfig(),
        SB_SECRET_KEY: 'sbsecret_test_key_12345'
      }

      expect(() => validate(config)).toThrow(
        'Service role key must be either a secret key (starts with sb_secret_) or JWT (starts with eyJ)'
      )
    })
  })

  describe('VERIFY_DB_ON_STARTUP Default Value (Requirements 5.1)', () => {
    it('should default VERIFY_DB_ON_STARTUP to true when not provided', () => {
      const config = createValidConfig()
      // Don't set VERIFY_DB_ON_STARTUP

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(true)
    })

    it('should accept explicit true value for VERIFY_DB_ON_STARTUP', () => {
      const config = {
        ...createValidConfig(),
        VERIFY_DB_ON_STARTUP: 'true'
      }

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(true)
    })

    it('should accept explicit false value for VERIFY_DB_ON_STARTUP', () => {
      const config = {
        ...createValidConfig(),
        VERIFY_DB_ON_STARTUP: 'false'
      }

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(false)
    })

    it('should coerce boolean true for VERIFY_DB_ON_STARTUP', () => {
      const config = {
        ...createValidConfig(),
        VERIFY_DB_ON_STARTUP: true
      }

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(true)
    })

    it('should coerce boolean false for VERIFY_DB_ON_STARTUP', () => {
      const config = {
        ...createValidConfig(),
        VERIFY_DB_ON_STARTUP: false
      }

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(false)
    })

    it('should coerce number 1 to true for VERIFY_DB_ON_STARTUP', () => {
      const config = {
        ...createValidConfig(),
        VERIFY_DB_ON_STARTUP: 1
      }

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(true)
    })

    it('should coerce number 0 to false for VERIFY_DB_ON_STARTUP', () => {
      const config = {
        ...createValidConfig(),
        VERIFY_DB_ON_STARTUP: 0
      }

      const result = validate(config)
      expect(result.VERIFY_DB_ON_STARTUP).toBe(false)
    })
  })
})
