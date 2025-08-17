// Database package - Simple re-export of Supabase types and health utilities
// All types and constants now come from @repo/shared

// Re-export Supabase database types
export * from '@repo/shared/types/supabase-generated'

// Export health check utilities  
export { checkDatabaseConnection } from './health'
export type { DatabaseHealthResult } from './health'
