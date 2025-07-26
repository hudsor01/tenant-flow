/**
 * TRPC Type Export
 * 
 * This file imports TRPC types directly from the backend using
 * TypeScript project references with type-only imports.
 */

// Import AppRouter directly from backend to avoid circular dependency
import type { AppRouter } from '@tenantflow/backend/trpc'
// Import utility types from shared
import type { RouterInputs, RouterOutputs } from '@tenantflow/shared'

// Re-export the types for the frontend
export type { AppRouter }
export type { RouterInputs }
export type { RouterOutputs }