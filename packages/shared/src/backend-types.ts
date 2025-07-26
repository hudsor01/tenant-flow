// Backend Types Bridge  
// This file provides type placeholders to avoid circular dependencies
// Frontend should import AppRouter directly from @tenantflow/backend/trpc

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Type placeholder for AppRouter
// This is intentionally 'any' to avoid circular dependencies
// Consumer packages should import the real AppRouter type directly from @tenantflow/backend/trpc
export type AppRouter = any

// Re-export TRPC type utilities for easy access
export type { inferRouterInputs, inferRouterOutputs }

// Type aliases for easier use in frontend
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
