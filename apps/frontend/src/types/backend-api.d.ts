/**
 * Backend API Type Declarations
 * 
 * This file re-exports the AppRouter type from the backend package
 * using type-only imports (which are removed at compile time)
 */

// Import from the backend package using type-only import
import type { AppRouter as SharedAppRouter } from '@tenantflow/backend/trpc'

// Re-export it
export type AppRouter = SharedAppRouter