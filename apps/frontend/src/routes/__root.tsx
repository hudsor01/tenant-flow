import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { MemorySafeWrapper } from '@/components/common/MemorySafeWrapper'
import { PageTracker } from '@/components/common/PageTracker'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'
import { NotFoundPage } from '@/components/error/NotFoundPage'
import type { EnhancedRouterContext, UserContext, Permission, LoaderError } from '@/lib/router-context'
import { loaderErrorHandler } from '@/lib/loaders/error-handling'
import type { PreloadManager } from '@/lib/loaders/preloading';
import { preloadUtils } from '@/lib/loaders/preloading'
import { supabase } from '@/lib/clients'
import { api } from '@/lib/api/axios-client'
import { useAuth } from '@/hooks/useAuth'

// Global loading component
const GlobalLoading = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      <p className="text-gray-600">Loading TenantFlow...</p>
      <p className="mt-2 text-sm text-gray-400">
        If this takes too long, check the browser console for errors.
      </p>
    </div>
  </div>
)

// Enhanced Router context interface - completely replaces old RouterContext
export interface RouterContext {
  queryClient: QueryClient
  api: typeof api
}

// Create enhanced context provider that implements EnhancedRouterContext
function createEnhancedContext(
  queryClient: QueryClient, 
  authUser: Record<string, unknown> | null, 
  isAuthenticated: boolean, 
  isLoading: boolean
): EnhancedRouterContext {
  // Convert auth user to UserContext format
  const user: UserContext | null = authUser ? {
    id: authUser.id as string,
    email: authUser.email as string,
    role: (authUser.role as string) || 'OWNER',
    organizationId: authUser.organizationId as string,
    permissions: derivePermissions(authUser.role as string, 'professional'), // Default to professional for now
    subscription: {
      tier: 'professional', // Default tier
      status: 'active',
      propertiesLimit: 100,
      tenantsLimit: 500,
      features: ['analytics', 'reports', 'bulk-operations']
    },
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: 'America/New_York'
    }
  } : null

  // Helper functions
  const hasPermission = (permission: Permission): boolean => {
    return user?.permissions.includes(permission) ?? false
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  const canAccessFeature = (feature: string): boolean => {
    return user?.subscription.features.includes(feature) ?? false
  }

  const isWithinLimit = (resource: 'properties' | 'tenants', current: number): boolean => {
    if (!user) return false
    const limit = resource === 'properties' ? user.subscription.propertiesLimit : user.subscription.tenantsLimit
    return current < limit
  }

  const handleError = (error: unknown, context?: string): LoaderError => {
    return loaderErrorHandler.handleError(error, context)
  }

  const createRetryableFn = async <T,>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
    return loaderErrorHandler.createRetryFn(fn, maxRetries)
  }

  let preloadManager: PreloadManager | null = null

  const preloadRoute = async (routePath: string): Promise<void> => {
    if (preloadManager) {
      await preloadManager.preloadRoute(routePath)
    }
  }

  const warmCache = async (queryKeys: readonly unknown[][]): Promise<void> => {
    const promises = queryKeys.map(key =>
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => Promise.resolve(null)
      })
    )
    await Promise.allSettled(promises)
  }

  const context: EnhancedRouterContext = {
    queryClient,
    supabase,
    api,
    user,
    isAuthenticated,
    isLoading,
    handleError,
    createRetryableFn,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessFeature,
    isWithinLimit,
    preloadRoute,
    warmCache
  }

  // Initialize preload manager with context
  if (queryClient && user) {
    preloadManager = preloadUtils.createPreloadManager(queryClient, context)
  }

  return context
}

// Derive permissions based on user role
function derivePermissions(role: string = 'OWNER', _tier: string = 'free'): Permission[] {
  const basePermissions: Permission[] = ['properties:read', 'tenants:read', 'maintenance:read']
  
  if (role === 'OWNER') {
    return [
      ...basePermissions,
      'properties:write',
      'tenants:write', 
      'maintenance:write',
      'analytics:read',
      'billing:read',
      'billing:write'
    ]
  }
  
  if (role === 'MANAGER') {
    return [
      ...basePermissions,
      'properties:write',
      'tenants:write',
      'maintenance:write',
      'analytics:read'
    ]
  }
  
  // TENANT role
  return ['maintenance:read']
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: GlobalErrorBoundary,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [enhancedContext, setEnhancedContext] = useState<EnhancedRouterContext | null>(null)

  useEffect(() => {
    // Initialize enhanced context with real authentication data
    const context = createEnhancedContext(queryClient, user, isAuthenticated, isLoading)
    setEnhancedContext(context)
    
    // If user is authenticated, warm cache with critical data
    if (isAuthenticated && user) {
      // Warm cache in background without blocking
      setTimeout(() => {
        context.warmCache([]).catch(console.warn)
      }, 100)
    }
  }, [queryClient, user, isAuthenticated, isLoading])

  // Show loading while authentication or enhanced context is being initialized
  if (isLoading || !enhancedContext) {
    return <GlobalLoading />
  }

  return (
    <ErrorBoundary>
      <MemorySafeWrapper>
        <PageTracker />
        <Suspense fallback={<GlobalLoading />}>
          <Outlet />
        </Suspense>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </MemorySafeWrapper>
    </ErrorBoundary>
  )
}
