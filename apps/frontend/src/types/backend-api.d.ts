/**
 * Backend API Type Declarations
 * 
 * This file re-exports the AppRouter type from the shared package
 * to avoid importing backend implementation files
 */

// Import from the shared package which has the compiled types
import type { AppRouter as SharedAppRouter } from '@tenantflow/shared'

// Re-export it
export type AppRouter = SharedAppRouter