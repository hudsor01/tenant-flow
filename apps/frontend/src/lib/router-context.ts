/**
 * Router Context Types for TanStack Router
 * 
 * Simple, typed context for route loaders with minimal overhead
 */

import type { QueryClient } from '@tanstack/react-query'
import type { api } from './api/axios-client'

/**
 * Standard router context provided to all route loaders
 * This matches the context configured in router-instance.tsx
 */
export interface RouterContext {
  queryClient: QueryClient
  api: typeof api
}

/**
 * Type for route loader parameters
 */
export interface LoaderParams {
  context: RouterContext
  params: Record<string, string>
  location: {
    search: Record<string, unknown>
    pathname: string
  }
}

/**
 * Generic loader function type
 */
export type LoaderFunction<TData = unknown> = (params: LoaderParams) => Promise<TData>

// Re-export for convenience
export type { QueryClient }