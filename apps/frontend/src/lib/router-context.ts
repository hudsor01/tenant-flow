/**
 * Enhanced Router Context for TanStack Router
 * 
 * Provides comprehensive context for route loaders including:
 * - Query client for data management
 * - User authentication and permissions
 * - Supabase client for direct database access
 * - Error handling utilities
 */

import type { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { api } from './api/axios-client'
// Database type from Supabase - we'll define a basic type for now
type Database = Record<string, unknown>

// User permission types
export type Permission = 
  | 'properties:read' 
  | 'properties:write' 
  | 'tenants:read' 
  | 'tenants:write'
  | 'maintenance:read' 
  | 'maintenance:write'
  | 'analytics:read'
  | 'billing:read'
  | 'billing:write'

// Subscription tier type
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise'

// Enhanced user context
export interface UserContext {
  id: string
  email: string
  role: 'OWNER' | 'MANAGER' | 'TENANT'
  organizationId?: string
  permissions: Permission[]
  subscription: {
    tier: SubscriptionTier
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
    propertiesLimit: number
    tenantsLimit: number
    features: string[]
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
  }
}

// Loader error types
export interface LoaderError {
  type: 'auth' | 'permission' | 'network' | 'validation' | 'subscription' | 'unknown'
  message: string
  code?: string
  statusCode?: number
  retryable: boolean
  metadata?: Record<string, unknown>
}

// Enhanced router context
export interface EnhancedRouterContext {
  // Core services
  queryClient: QueryClient
  supabase: SupabaseClient<Database>
  api: typeof api // API client for HTTP requests
  
  // Authentication
  user: UserContext | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Error handling
  handleError: (error: unknown, context?: string) => LoaderError
  createRetryableFn: <T>(fn: () => Promise<T>, maxRetries?: number) => Promise<T>
  
  // Permissions
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  
  // Subscription checks
  canAccessFeature: (feature: string) => boolean
  isWithinLimit: (resource: 'properties' | 'tenants', current: number) => boolean
  
  // Preloading utilities
  preloadRoute: (routePath: string) => Promise<void>
  warmCache: (queryKeys: readonly unknown[][]) => Promise<void>
}

// Loader configuration
export interface LoaderConfig {
  // Required permissions
  permissions?: Permission[]
  
  // Required subscription features
  requiredFeatures?: string[]
  
  // Minimum subscription tier
  minimumTier?: SubscriptionTier
  
  // Error handling
  fallbackData?: unknown
  retryAttempts?: number
  retryDelay?: number
  
  // Performance
  parallel?: boolean
  priority?: 'high' | 'medium' | 'low'
  preload?: boolean
  
  // Cache configuration
  cacheStrategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only'
  revalidateOnFocus?: boolean
  staleTime?: number
}

// Loader result with metadata
export interface LoaderResult<T = unknown> {
  data: T
  metadata: {
    loadTime: number
    cacheHit: boolean
    errors?: LoaderError[]
    warnings?: string[]
  }
}

// Search parameter validation schemas
export const searchSchemas = {
  pagination: {
    page: (val: string) => Math.max(1, parseInt(val) || 1),
    limit: (val: string) => Math.min(100, Math.max(1, parseInt(val) || 20)),
    offset: (val: string) => Math.max(0, parseInt(val) || 0)
  },
  
  filters: {
    search: (val: string) => val.trim().slice(0, 100),
    status: (val: string, allowed: string[]) => allowed.includes(val) ? val : undefined,
    dateRange: (val: string) => {
      const range = val.split(',')
      if (range.length === 2 && range[0] && range[1]) {
        const start = new Date(range[0])
        const end = new Date(range[1])
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) ? { start, end } : undefined
      }
      return undefined
    }
  },
  
  sorting: {
    sortBy: (val: string, allowed: string[]) => allowed.includes(val) ? val : undefined,
    sortOrder: (val: string) => ['asc', 'desc'].includes(val) ? val as 'asc' | 'desc' : 'desc'
  }
}

// Loader utilities
export const loaderUtils = {
  /**
   * Create a configured loader function
   */
  createLoader: <T>(
    config: LoaderConfig,
    loaderFn: (context: EnhancedRouterContext) => Promise<T>
  ) => {
    return async (context: EnhancedRouterContext): Promise<LoaderResult<T>> => {
      const startTime = Date.now()
      const errors: LoaderError[] = []
      const warnings: string[] = []
      
      try {
        // Check authentication
        if (!context.isAuthenticated) {
          throw new Error('Authentication required')
        }
        
        // Check permissions
        if (config.permissions && !context.hasAllPermissions(config.permissions)) {
          throw new Error('Insufficient permissions')
        }
        
        // Check subscription tier
        if (config.minimumTier && !isSubscriptionTierSufficient(context.user?.subscription.tier, config.minimumTier)) {
          throw new Error('Subscription upgrade required')
        }
        
        // Check required features
        if (config.requiredFeatures) {
          const missingFeatures = config.requiredFeatures.filter(
            feature => !context.canAccessFeature(feature)
          )
          if (missingFeatures.length > 0) {
            throw new Error(`Missing features: ${missingFeatures.join(', ')}`)
          }
        }
        
        // Execute loader with retry logic
        const data = config.retryAttempts 
          ? await context.createRetryableFn(
              () => loaderFn(context), 
              config.retryAttempts
            )
          : await loaderFn(context)
        
        return {
          data,
          metadata: {
            loadTime: Date.now() - startTime,
            cacheHit: false, // This would be determined by the query client
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
          }
        }
        
      } catch (error) {
        const loaderError = context.handleError(error, 'loader')
        
        // Return fallback data if available
        if (config.fallbackData !== undefined) {
          warnings.push(`Using fallback data due to error: ${loaderError.message}`)
          return {
            data: config.fallbackData as T,
            metadata: {
              loadTime: Date.now() - startTime,
              cacheHit: false,
              errors: [loaderError],
              warnings
            }
          }
        }
        
        throw loaderError
      }
    }
  },
  
  /**
   * Parallel loader execution
   */
  loadParallel: async <T extends Record<string, unknown>>(
    context: EnhancedRouterContext,
    loaders: Record<keyof T, () => Promise<T[keyof T]>>
  ): Promise<T> => {
    const results = await Promise.allSettled(
      Object.entries(loaders).map(async ([key, loader]) => [key, await loader()])
    )
    
    const data = {} as T
    const errors: LoaderError[] = []
    
    results.forEach((result, index) => {
      const entry = Object.entries(loaders)[index]
      if (!entry) return
      const [key] = entry
      
      if (result.status === 'fulfilled' && result.value) {
        const [, value] = result.value as [string, T[keyof T]]
        data[key as keyof T] = value
      } else if (result.status === 'rejected') {
        const error = context.handleError(result.reason, `parallel-loader-${key}`)
        errors.push(error)
        
        // Set null/undefined for failed loads
        data[key as keyof T] = null as T[keyof T]
      }
    })
    
    if (errors.length > 0) {
      console.warn('Some parallel loaders failed:', errors)
    }
    
    return data
  }
}

// Helper functions
function isSubscriptionTierSufficient(
  currentTier: SubscriptionTier | undefined, 
  requiredTier: SubscriptionTier
): boolean {
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    enterprise: 3
  }
  
  return (tierHierarchy[currentTier || 'free'] >= tierHierarchy[requiredTier])
}

// Export types
export type {
  Database,
  User
}