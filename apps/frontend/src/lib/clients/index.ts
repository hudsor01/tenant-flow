/**
 * Centralized API clients for TenantFlow frontend
 */

// Hono RPC client
export { honoClient, getHonoClient, rpc } from './hono-client'

// Supabase clients for authentication and database
export { supabase, supabaseAnon } from './supabase-client'

// HTTP client for generic API calls
export * from './api-client'

// React Query client configuration
export { queryClient } from './query-client'