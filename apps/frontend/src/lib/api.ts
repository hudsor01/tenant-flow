/**
 * Compatibility re-exports for legacy API imports
 * This file maintains backward compatibility for existing imports
 */

// Re-export everything from the clients directory
export * from './clients/index'

// Specifically export commonly used clients
export { trpc } from './utils/trpc'
export { supabase, supabaseAnon } from './clients/supabase-client'
export { queryClient } from './clients/query-client'
export { trpcClient } from './clients/trpc-client'