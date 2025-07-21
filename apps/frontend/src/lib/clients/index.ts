/**
 * Centralized API clients for TenantFlow frontend
 */

// TRPC client for type-safe API communication
export { trpc, trpcClient, createTRPCClient } from './trpc-client'

// Supabase clients for authentication and database
export { supabase, supabaseAnon } from './supabase-client'

// HTTP client for generic API calls
export * from './api-client'

// React Query client configuration
export { queryClient } from './query-client'