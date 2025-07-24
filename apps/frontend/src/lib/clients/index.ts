/**
 * Centralized API clients for TenantFlow frontend
 */

// TRPC React hooks - following official v11 pattern
export { trpc } from '../utils/trpc'

// TRPC client configuration
export { supabase, trpcClient, getTRPCClientConfig, setupNetworkMonitoring } from './trpc-client'

// Supabase clients for authentication and database
export { supabaseAnon } from './supabase-client'

// HTTP client for generic API calls
export * from './api-client'

// React Query client configuration
export { queryClient } from './query-client'

// Router instance
export { router } from '../router-instance'