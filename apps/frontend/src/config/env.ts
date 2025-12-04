/**
 * Frontend Environment Variables
 * Type-safe environment validation using Zod
 *
 * IMPORTANT: This file re-exports from env.server.ts
 * Only import in Server Components, API Routes, and Server Actions
 *
 * For Client Components, use process.env.NEXT_PUBLIC_* directly
 * or import from '#config/env.client' (but be aware it may fail validation at runtime)
 */

// Re-export everything from server env for backward compatibility
// This maintains the existing API where `env` is used in Server Components
export { serverEnv as env, isProduction, isDevelopment, isTest, isIntegrationTest } from './env.server'

// Also export client env for explicit usage
export { clientEnv } from './env.client'
