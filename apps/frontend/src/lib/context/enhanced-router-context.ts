/**
 * Enhanced Router Context Integration
 * 
 * This bridges your existing router context with the new enhanced features
 * without breaking existing functionality.
 */

import type { RouterContext } from '@/routes/__root'
import type { EnhancedRouterContext, UserContext, Permission } from '../router-context'
import { loaderErrorHandler } from '../loaders/error-handling'
import { PreloadManager } from '../loaders/preloading'
import { supabase } from '../clients/supabase-client'

/**
 * Create enhanced context from existing router context
 * This is the bridge function that transforms your existing context
 */
export function createEnhancedContext(
  baseContext: RouterContext,
  user?: UserContext | null
): EnhancedRouterContext {
  return {
    // Keep existing properties
    queryClient: baseContext.queryClient,
    api: baseContext.api,
    
    // Add Supabase client
    supabase,
    
    // User context (will be populated by auth loader)
    user: user || null,
    isAuthenticated: !!user,
    isLoading: false,
    
    // Enhanced error handling
    handleError: (error: unknown, context?: string) => {
      return loaderErrorHandler.handleError(error, context)
    },
    
    createRetryableFn: <T>(fn: () => Promise<T>, maxRetries = 3) => {
      return loaderErrorHandler.createRetryFn(fn, maxRetries)
    },
    
    // Permission checking
    hasPermission: (permission: Permission) => {
      return user?.permissions.includes(permission) || false
    },
    
    hasAnyPermission: (permissions: Permission[]) => {
      return permissions.some(p => user?.permissions.includes(p)) || false
    },
    
    hasAllPermissions: (permissions: Permission[]) => {
      return permissions.every(p => user?.permissions.includes(p)) || false
    },
    
    // Subscription checks
    canAccessFeature: (feature: string) => {
      return user?.subscription.features.includes(feature) || false
    },
    
    isWithinLimit: (resource: 'properties' | 'tenants', current: number) => {
      if (!user) return false
      
      switch (resource) {
        case 'properties':
          return current < user.subscription.propertiesLimit
        case 'tenants':
          return current < user.subscription.tenantsLimit
        default:
          return true
      }
    },
    
    // Preloading utilities
    preloadRoute: async (routePath: string) => {
      const preloadManager = new PreloadManager(baseContext.queryClient, createEnhancedContext(baseContext, user))
      await preloadManager.preloadRoute(routePath)
    },
    
    warmCache: async (queryKeys: readonly unknown[][]) => {
      const promises = queryKeys.map(queryKey => 
        baseContext.queryClient.prefetchQuery({
          queryKey,
          queryFn: () => Promise.resolve(null)
        })
      )
      await Promise.allSettled(promises)
    }
  }
}

/**
 * Hook to get enhanced context in components
 * This allows components to access the enhanced features
 */
export function useEnhancedContext(): EnhancedRouterContext {
  // This would be implemented to get the current enhanced context
  // For now, return a placeholder - you'd integrate this with your context provider
  throw new Error('useEnhancedContext must be implemented with your context provider')
}

/**
 * Migration helper: Convert old loader to enhanced loader
 * Use this to gradually migrate existing loaders
 */
export function migrateLoader<T>(
  oldLoader: (context: RouterContext) => Promise<T>
) {
  return async (context: EnhancedRouterContext): Promise<T> => {
    // Convert enhanced context back to basic context for compatibility
    const basicContext: RouterContext = {
      queryClient: context.queryClient,
      api: context.api
    }
    
    return await oldLoader(basicContext)
  }
}

export default createEnhancedContext