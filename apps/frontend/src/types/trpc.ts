/**
 * TRPC Type Export
 * 
 * This file imports TRPC types directly from the backend using
 * TypeScript project references with type-only imports.
 */

// Import types directly from backend to avoid circular dependencies
import type { AppRouter } from '@tenantflow/backend/trpc'
import type { RouterInputs, RouterOutputs } from '@tenantflow/shared'

// Re-export the types for the frontend
export type { AppRouter }
export type { RouterInputs }
export type { RouterOutputs }