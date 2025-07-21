/**
 * Compatibility re-exports for legacy API imports
 * This file maintains backward compatibility for existing imports
 */

// Re-export everything from the clients directory
export * from './clients/index'

// Specifically export commonly used clients
export { trpc } from './clients/trpc-client'
export { supabase, supabaseAnon } from './clients/supabase-client'
export { queryClient } from './clients/query-client'

// Re-export createTRPCClient for dynamic imports
export { createTRPCClient } from './clients/trpc-client'