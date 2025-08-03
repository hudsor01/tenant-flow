import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Suspense, useEffect, useState, useTransition } from 'react'
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
import { supabaseSafe } from '@/lib/clients'
import { api } from '@/lib/api/axios-client'
import { useAuth } from '@/hooks/useAuth'
// import { edgePreloadManager } from '@/lib/edge-preloading'
// import { performanceMonitor } from '@/lib/performance-monitor'

// React 19 optimized global loading component with better performance
const GlobalLoading = () => {
  const [showDelayedMessage, setShowDelayedMessage] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Show additional help message after 3 seconds using React 19 concurrent features
    const timer = setTimeout(() => {
      startTransition(() => {
        setShowDelayedMessage(true)
      })
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
        <p className="text-gray-600">Loading TenantFlow...</p>
        {showDelayedMessage && (
          <p className="mt-2 text-sm text-gray-400">
            If this takes too long, check the browser console for errors.
          </p>
        )}
        {/* Removed isPending indicator to avoid unused variable */}
      </div>
    </div>
  )
}

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
    role: ((authUser.role as string) === 'ADMIN' ? 'OWNER' : (authUser.role as string) || 'OWNER') as 'OWNER' | 'MANAGER' | 'TENANT',
    organizationId: authUser.organizationId as string,
    permissions: derivePermissions((authUser.role as string) || 'OWNER', 'professional'), // Default to professional for now
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
    supabase: supabaseSafe.getRawClient(),
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
function derivePermissions(role = 'OWNER', _tier = 'free'): Permission[] {
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
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [, startTransition] = useTransition()
  
  // Create enhanced context immediately - don't wait for useEffect
  const enhancedContext = createEnhancedContext(queryClient, user as unknown as Record<string, unknown> | null, isAuthenticated, isLoading)
  
  // Debug logging in development only
  if (import.meta.env.DEV) {
    console.warn('[Root] Rendering:', {
      pathname: window.location.pathname,
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasEnhancedContext: !!enhancedContext
    })
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      startTransition(() => {
        setTimeout(() => {
          enhancedContext.warmCache([]).catch(console.warn)
        }, 100)
      })
    }
  }, [queryClient, user, isAuthenticated, isLoading, enhancedContext])

  // Add timeout effect to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading || !enhancedContext) {
        console.warn('[Root] Loading timeout reached, forcing render')
        setLoadingTimeout(true)
      }
    }, 8000) // 8 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading, enhancedContext])

  // For public routes (like landing page), don't wait for authentication
  // Only show loading for authenticated routes that actually need user data
  const needsAuth = window.location.pathname.startsWith('/dashboard') || 
                    window.location.pathname.startsWith('/properties') ||
                    window.location.pathname.startsWith('/tenants') ||
                    window.location.pathname.startsWith('/maintenance') ||
                    window.location.pathname.startsWith('/leases') ||
                    window.location.pathname.startsWith('/reports') ||
                    window.location.pathname.startsWith('/settings') ||
                    window.location.pathname.startsWith('/profile') ||
                    window.location.pathname.startsWith('/tenant-');
  
  // Public routes should render immediately without waiting for auth
  const isPublicRoute = window.location.pathname === '/' ||
                        window.location.pathname.startsWith('/pricing') ||
                        window.location.pathname.startsWith('/contact') ||
                        window.location.pathname.startsWith('/auth/');

  // Debug route check in development only
  if (import.meta.env.DEV) {
    console.warn('[Root] Route check:', {
      pathname: window.location.pathname,
      isPublicRoute,
      needsAuth,
      isLoading,
      loadingTimeout,
      shouldShowLoading: !isPublicRoute && needsAuth && isLoading && !loadingTimeout
    })
  }
  
  if (!isPublicRoute && needsAuth && isLoading && !loadingTimeout) {
    return <GlobalLoading />
  }

  // Enhanced context is now created immediately above, no need for fallback
  if (import.meta.env.DEV) {
    console.warn('[Root] Rendering main app with enhanced context:', !!enhancedContext)
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
