/**
 * TRPC Type Export
 * 
 * This file imports TRPC types directly from the backend using
 * TypeScript project references with type-only imports.
 */

// Import types from shared package - this is the proper flow: backend → shared → frontend
import type { AppRouter, RouterInputs, RouterOutputs } from '@tenantflow/shared'

// Re-export the types for the frontend
export type { AppRouter }
export type { RouterInputs }
export type { RouterOutputs }