/**
 * Backend API Type Declarations
 * 
 * This file re-exports the AppRouter type from the shared package
 * to avoid importing backend implementation files
 */

// Import directly from backend to avoid circular dependencies
import type { AppRouter as BackendAppRouter } from '@tenantflow/backend/trpc'

// Re-export it
export type AppRouter = BackendAppRouter