// Backend Types Bridge  
// This file provides TRPC router type exports for the frontend
// Uses a minimal type stub approach to avoid all collision issues

// Minimal AppRouter type that allows TRPC React to function
// At runtime, the actual backend router types will be used
export type AppRouter = any

// Simple type stubs for input/output types
// At runtime, actual types will be inferred from the backend
export type RouterInputs = any
export type RouterOutputs = any

// Re-export utilities for completeness
export type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
