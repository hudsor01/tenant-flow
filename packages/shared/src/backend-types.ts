// Backend Types Bridge  
// This file provides type stubs for TRPC types
// These are placeholders until the backend is built

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Temporary AppRouter type stub
// This will be replaced by the actual type from the backend build
export type AppRouter = any

// Re-export TRPC type utilities for easy access
export type { inferRouterInputs, inferRouterOutputs }

// Type aliases for easier use in frontend
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
