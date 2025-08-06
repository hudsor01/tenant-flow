import { z } from 'zod'

/**
 * Environment Configuration Schema using Zod
 *
 * This schema provides:
 * - Runtime type validation for all environment variables
 * - Type-safe configuration throughout the application
 * - Better error messages for configuration issues
 * - Automatic type inference for TypeScript
 */

// Base URL validation schema
const urlSchema = z.string().url('Must be a valid URL')

// PostgreSQL connection string validation
const postgresUrlSchema = z
  .string()
  .refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    'Must be a valid PostgreSQL connection string'
  )

// JWT secret validation (minimum 32 characters for security)
const jwtSecretSchema = z
  .string()
  .min(32, 'JWT secret must be at least 32 characters for security')

// CORS origins validation
const corsOriginsSchema = z
  .string()
  .transform((str) => str.split(',').map(origin => origin.trim()))
  .refine(
    (origins) => origins.every(origin => {
      try {
        new URL(origin)
        return true
      } catch {
        return false
      }
    }),
    'All CORS origins must be valid URLs'
  )
  .superRefine((origins, ctx) => {
    if (process.env.NODE_ENV === 'production') {
      const httpOrigins = origins.filter(origin => origin.startsWith('http://'))
      if (httpOrigins.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`
        })
      }
    }
  })

// Port validation
const portSchema = z
  .string()
  .optional()
  .transform((val) => val ? parseInt(val, 10) : 3001)
  .refine((port) => port > 0 && port < 65536, 'Port must be between 1 and 65535')

// Node environment validation
const nodeEnvSchema = z
  .enum(['development', 'production', 'test'])
  .default('development')


// Main configuration schema
export const configSchema = z.object({
  // Application
  NODE_ENV: nodeEnvSchema,
  PORT: portSchema,

  // Database
  DATABASE_URL: postgresUrlSchema,
  DIRECT_URL: postgresUrlSchema,
  DATABASE_MAX_CONNECTIONS: z.string().optional(),
  DATABASE_CONNECTION_TIMEOUT: z.string().optional(),

  // Authentication
  JWT_SECRET: jwtSecretSchema,
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Supabase
  SUPABASE_URL: urlSchema,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: jwtSecretSchema,

  // CORS
  CORS_ORIGINS: corsOriginsSchema,

  // Rate Limiting
  RATE_LIMIT_TTL: z.string().optional(),
  RATE_LIMIT_LIMIT: z.string().optional(),

  // Stripe (optional in development)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_STARTER: z.string().optional(),
  STRIPE_PRICE_ID_GROWTH: z.string().optional(),
  STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
  STRIPE_PRICE_ID_TENANTFLOW_MAX: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Monitoring
  ENABLE_METRICS: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),

  // File Storage
  STORAGE_PROVIDER: z.enum(['local', 'supabase', 's3']).default('supabase'),
  STORAGE_BUCKET: z.string().default('tenant-flow-storage'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Security
  CSRF_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),

  // Feature Flags
  ENABLE_SWAGGER: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),

  ENABLE_RATE_LIMITING: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .default(true)
})

// Inferred TypeScript type from schema
export type Config = z.infer<typeof configSchema>

// Derived configuration objects for better organization
export const createDerivedConfig = (config: Config) => ({
  database: {
    url: config.DATABASE_URL,
    directUrl: config.DIRECT_URL,
    maxConnections: config.DATABASE_MAX_CONNECTIONS ? parseInt(config.DATABASE_MAX_CONNECTIONS) : 10,
    connectionTimeout: config.DATABASE_CONNECTION_TIMEOUT ? parseInt(config.DATABASE_CONNECTION_TIMEOUT) : 5000
  },

  supabase: {
    url: config.SUPABASE_URL,
    serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: config.SUPABASE_JWT_SECRET
  },

  jwt: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN
  },

  cors: {
    origins: Array.isArray(config.CORS_ORIGINS) ? config.CORS_ORIGINS : [config.CORS_ORIGINS]
  },

  rateLimit: {
    ttl: config.RATE_LIMIT_TTL ? parseInt(config.RATE_LIMIT_TTL) : 60000,
    limit: config.RATE_LIMIT_LIMIT ? parseInt(config.RATE_LIMIT_LIMIT) : 100
  },

  stripe: {
    secretKey: config.STRIPE_SECRET_KEY,
    publishableKey: config.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: config.STRIPE_WEBHOOK_SECRET,
    priceIds: {
      starter: config.STRIPE_PRICE_ID_STARTER,
      growth: config.STRIPE_PRICE_ID_GROWTH,
      business: config.STRIPE_PRICE_ID_BUSINESS,
      tenantflow_max: config.STRIPE_PRICE_ID_TENANTFLOW_MAX
    }
  },

  redis: {
    url: config.REDIS_URL,
    host: config.REDIS_HOST || 'localhost',
    port: config.REDIS_PORT ? parseInt(config.REDIS_PORT) : 6379,
    password: config.REDIS_PASSWORD,
    db: config.REDIS_DB ? parseInt(config.REDIS_DB) : 0
  },

  app: {
    port: config.PORT,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    enableMetrics: config.ENABLE_METRICS,
    enableSwagger: config.ENABLE_SWAGGER,
    enableRateLimiting: config.ENABLE_RATE_LIMITING
  },

  storage: {
    provider: config.STORAGE_PROVIDER,
    bucket: config.STORAGE_BUCKET
  },

  email: {
    smtp: {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ? parseInt(config.SMTP_PORT) : 587,
      user: config.SMTP_USER,
      pass: config.SMTP_PASS
    },
    from: config.FROM_EMAIL
  },

  security: {
    csrfSecret: config.CSRF_SECRET,
    sessionSecret: config.SESSION_SECRET
  }
})

export type DerivedConfig = ReturnType<typeof createDerivedConfig>
