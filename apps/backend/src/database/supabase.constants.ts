/**
 * Supabase dependency injection token for admin client
 */
export const SUPABASE_ADMIN_CLIENT = 'SUPABASE_ADMIN_CLIENT'

/**
 * Supabase RPC retry and timeout constants
 * Extracted for maintainability and testing
 */

/**
 * Maximum number of retry attempts for transient RPC failures
 * @default 3
 */
export const RPC_MAX_RETRIES = 3

/**
 * Initial backoff delay in milliseconds before retry
 * Uses exponential backoff: 500ms, 1000ms, 2000ms...
 * @default 500
 */
export const RPC_BACKOFF_MS = 500

/**
 * Timeout for each RPC attempt in milliseconds
 * @default 10000 (10 seconds)
 */
export const RPC_TIMEOUT_MS = 10_000

/**
 * Supabase Error Codes
 *
 * Standardized error codes for Supabase connectivity and configuration issues.
 * Used for monitoring, alerting, and troubleshooting.
 */
export const SUPABASE_ERROR_CODES = {
  /** Admin client not initialized or unavailable */
  ADMIN_CLIENT_UNAVAILABLE: 'SUP-001',

  /** User client pool initialization failed (missing publishable key) */
  USER_CLIENT_UNAVAILABLE: 'SUP-002',

  /** Configuration validation failed (invalid URL, JWT, or project ref) */
  CONFIG_VALIDATION_FAILED: 'SUP-003',

  /** Startup connectivity verification failed */
  STARTUP_VERIFICATION_FAILED: 'SUP-004',

  /** Health check failed (both RPC and table ping) */
  HEALTH_CHECK_FAILED: 'SUP-005'
} as const

/**
 * Error code type for type safety
 */
export type SupabaseErrorCode = typeof SUPABASE_ERROR_CODES[keyof typeof SUPABASE_ERROR_CODES]
