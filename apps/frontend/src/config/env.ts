/**
 * Frontend Environment Variables - Complete Strategy
 *
 * This file implements a comprehensive environment variable strategy for Next.js:
 * - Zod validation with type safety
 * - Build-time vs runtime handling
 * - Development vs production differences
 * - Testing environment setup
 * - Error handling and fallbacks
 * - Security considerations
 */

import { z } from 'zod'

// ============================================================================
// ENVIRONMENT SCHEMAS
// ============================================================================

/**
 * Base environment variables available in all environments
 */
const baseEnvSchema = z.object({
  // Node.js
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Next.js
  NEXT_PHASE: z.string().optional(), // 'phase-production-build', etc.
})

/**
 * Public environment variables (NEXT_PUBLIC_* prefix)
 * These are embedded in the client bundle and visible to users
 */
const publicEnvSchema = z.object({
  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

  // API
  NEXT_PUBLIC_API_BASE_URL: z.string().url('NEXT_PUBLIC_API_BASE_URL must be a valid URL'),

  // Supabase (Public keys only - safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required'),
  NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM: z.string().default('ES256'),

  // Stripe (Public keys only - safe for client)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().regex(/^pk_(test|live)_/, 'Invalid Stripe publishable key format'),

  // Feature Flags (safe for client)
  NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
})

/**
 * Private environment variables (server-side only)
 * These are NEVER exposed to the client bundle
 */
const privateEnvSchema = z.object({
  // Supabase (Server-side secrets)
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),
  SUPABASE_JWT_ALGORITHM: z.string().default('ES256'),

  // Stripe (Server-side secrets)
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, 'Invalid Stripe secret key format'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),

  // Stripe Price IDs
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().startsWith('price_', 'Invalid Stripe price ID'),
  STRIPE_STARTER_ANNUAL_PRICE_ID: z.string().startsWith('price_', 'Invalid Stripe price ID'),
  STRIPE_GROWTH_MONTHLY_PRICE_ID: z.string().startsWith('price_', 'Invalid Stripe price ID'),
  STRIPE_GROWTH_ANNUAL_PRICE_ID: z.string().startsWith('price_', 'Invalid Stripe price ID'),
  STRIPE_MAX_MONTHLY_PRICE_ID: z.string().startsWith('price_', 'Invalid Stripe price ID'),
  STRIPE_MAX_ANNUAL_PRICE_ID: z.string().startsWith('price_', 'Invalid Stripe price ID'),

  // Email
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // Security Monitoring
  SECURITY_MONITORING_WEBHOOK: z.string().url().optional(),
  SECURITY_MONITORING_TOKEN: z.string().optional(),

  // Testing
  E2E_OWNER_EMAIL: z.string().email().optional(),
  E2E_OWNER_PASSWORD: z.string().min(8).optional(),
  RUN_INTEGRATION_TESTS: z.coerce.boolean().default(false),
  VITEST_INTEGRATION: z.coerce.boolean().default(false),
})

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Detect if we're in build time (Next.js static analysis)
 * During build, process.env might be empty or incomplete
 */
function isBuildTime(): boolean {
  return (
    typeof window === 'undefined' &&
    (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PHASE === 'phase-production-build')
  )
}

/**
 * Validate environment variables with appropriate handling for build time
 */
function validateEnvironment(): z.infer<typeof publicEnvSchema> & z.infer<typeof privateEnvSchema> & z.infer<typeof baseEnvSchema> {
  const isBuild = isBuildTime()

  try {
    // During build time, only validate what's available
    if (isBuild) {
      // Validate base environment
      const baseEnv = baseEnvSchema.parse(process.env)

      // Validate only public env vars during build (these get embedded in bundle)
      const publicEnv = publicEnvSchema.parse(process.env)

      // Return partial environment for build time
      return {
        ...baseEnv,
        ...publicEnv,
        // Private vars are not available during build, provide defaults
        SUPABASE_JWT_SECRET: 'build-time-placeholder',
        SUPABASE_JWT_ALGORITHM: 'ES256',
        STRIPE_SECRET_KEY: 'build-time-placeholder',
        STRIPE_WEBHOOK_SECRET: 'build-time-placeholder',
        RESEND_API_KEY: 'build-time-placeholder',

        // Security monitoring (optional)
        SECURITY_MONITORING_WEBHOOK: undefined,
        SECURITY_MONITORING_TOKEN: undefined,

        // Price IDs with build-time placeholders
        STRIPE_STARTER_MONTHLY_PRICE_ID: 'price_build_time',
        STRIPE_STARTER_ANNUAL_PRICE_ID: 'price_build_time',
        STRIPE_GROWTH_MONTHLY_PRICE_ID: 'price_build_time',
        STRIPE_GROWTH_ANNUAL_PRICE_ID: 'price_build_time',
        STRIPE_MAX_MONTHLY_PRICE_ID: 'price_build_time',
        STRIPE_MAX_ANNUAL_PRICE_ID: 'price_build_time',
      } as z.infer<typeof publicEnvSchema> & z.infer<typeof privateEnvSchema> & z.infer<typeof baseEnvSchema>
    }

    // Runtime validation (development/production)
    const baseEnv = baseEnvSchema.parse(process.env)
    const publicEnv = publicEnvSchema.parse(process.env)
    const privateEnv = privateEnvSchema.parse(process.env)

    return {
      ...baseEnv,
      ...publicEnv,
      ...privateEnv,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      )

      throw new Error(
        `Environment validation failed:\n${errorMessages.join('\n')}\n\n` +
        `Please check your environment variables. ` +
        `${isBuild ? 'Some variables may not be available during build.' : ''}`
      )
    }
    throw error
  }
}

// ============================================================================
// VALIDATED ENVIRONMENT
// ============================================================================

/**
 * Validated and typed environment variables
 * This is the single source of truth for all environment access
 */
export const env = validateEnvironment()

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type of the validated environment
 */
export type Env = typeof env

/**
 * Public environment variables (safe for client bundle)
 */
export type PublicEnv = Pick<Env, keyof z.infer<typeof publicEnvSchema>>

/**
 * Private environment variables (server-side only)
 */
export type PrivateEnv = Omit<Env, keyof z.infer<typeof publicEnvSchema>>

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get public environment variables (safe for client)
 */
export function getPublicEnv(): PublicEnv {
  return {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_BASE_URL: env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM: env.NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING,
    NEXT_PUBLIC_ENABLE_ANALYTICS: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test'
}

/**
 * Check if we're running integration tests
 */
export function isIntegrationTest(): boolean {
  return env.VITEST_INTEGRATION === true
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    isIntegrationTest: isIntegrationTest(),
    isBuildTime: isBuildTime(),
  }
}