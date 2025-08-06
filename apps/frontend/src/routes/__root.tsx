import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useEffect, useState, useTransition } from 'react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { MemorySafeWrapper } from '@/components/common/MemorySafeWrapper'
import { PageTracker } from '@/components/common/PageTracker'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'
import { NotFoundPage } from '@/components/error/NotFoundPage'
import type { RouterContext } from '@/lib/router-context'
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

// Export the RouterContext type for consistency
export type { RouterContext } from '@/lib/router-context'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: GlobalErrorBoundary,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
  const { isLoading } = useAuth()
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  // Add timeout effect to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[Root] Loading timeout reached, forcing render')
        setLoadingTimeout(true)
      }
    }, 8000) // 8 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  // For public routes (like landing page), don't wait for authentication
  // Only show loading for authenticated routes that actually need user data
  const _needsAuth = window.location.pathname.startsWith('/dashboard') || 
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
                        window.location.pathname.startsWith('/auth/') ||
                        window.location.pathname.startsWith('/about') ||
                        window.location.pathname.startsWith('/terms') ||
                        window.location.pathname.startsWith('/privacy') ||
                        window.location.pathname.startsWith('/blog') ||
                        window.location.pathname.startsWith('/tools');

  // Public routes should render immediately without any auth check
  // Only show loading for authenticated routes when auth is actually needed
  if (!isPublicRoute && isLoading && !loadingTimeout) {
    return <GlobalLoading />
  }

  return (
    <ErrorBoundary>
      <MemorySafeWrapper>
        <PageTracker />
        <Outlet />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </MemorySafeWrapper>
    </ErrorBoundary>
  )
}
