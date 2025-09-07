/**
 * Database and Entity Types
 * Shared database types that can be used by both frontend and backend
 */

// Use these patterns instead:
// import type { Tables, TablesInsert, TablesUpdate } from '@repo/shared/types/supabase'
// type User = Tables<'User'>
// type UserInsert = TablesInsert<'User'>

// Repository interface removed - use native Supabase client methods directly

// ============================================================================
// Utility Types for Database Operations
// ============================================================================

export type Nullable<T> = T | null | undefined

// REMOVED: Redundant utility types - use native Supabase patterns instead:
// Tables<'TableName'>, TablesInsert<'TableName'>, TablesUpdate<'TableName'>

// Database Health Check Types (from packages/database)
export interface DatabaseHealthResult {
	healthy: boolean
	error?: string
}

// =============================================================================
// ENVIRONMENT & CONFIG TYPES - MIGRATED from backend config files
// =============================================================================

// MIGRATED from apps/backend/src/config/env.validation.ts
export interface RequiredEnvVars {
	DATABASE_URL: string
	DIRECT_URL: string
	JWT_SECRET: string
	SUPABASE_URL: string
	SUPABASE_SERVICE_ROLE_KEY: string
	SUPABASE_JWT_SECRET: string
	CORS_ORIGINS: string
}

// MIGRATED from apps/backend/src/cli/database-optimization.command.ts
export interface DatabaseOptimizationOptions {
	action: 'apply' | 'stats' | 'analyze' | 'health' | 'unused'
	tables?: string
	verbose?: boolean
}

// MIGRATED from apps/backend/src/setup-type-providers.ts
export interface EnvironmentConfig {
	NODE_ENV: string
	PORT: number
	DATABASE_URL?: string
}
