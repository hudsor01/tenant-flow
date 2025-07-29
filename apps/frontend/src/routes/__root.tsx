import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { MemorySafeWrapper } from '@/components/common/MemorySafeWrapper'
import { PageTracker } from '@/components/common/PageTracker'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'
import { NotFoundPage } from '@/components/error/NotFoundPage'

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

// Router context interface for TanStack Router
export interface RouterContext {
  queryClient: QueryClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any // API client instance
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: GlobalErrorBoundary,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
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
