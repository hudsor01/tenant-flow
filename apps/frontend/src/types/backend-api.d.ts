/**
 * Backend API Type Declarations
 * 
 * This file re-exports the AppRouter type from the shared package
 * to avoid importing backend implementation files
 */

// Import from shared package to avoid direct backend imports and collisions
import type { AppRouter as SharedAppRouter } from '@tenantflow/shared'

// Re-export it
export type AppRouter = SharedAppRouter