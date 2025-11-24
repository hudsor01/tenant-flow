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
