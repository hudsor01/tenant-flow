/**
 * Modern Dashboard Page - Next.js 15 + React 19
 * Server Component with optimized data loading
 */

import { Suspense } from 'react'
import type { Metadata } from 'next/types'
import { ModernDashboard } from '@/components/dashboard/dashboard-modern'
import { ErrorBoundary } from 'react-error-boundary'

// Static metadata for SEO optimization
export const metadata: Metadata = {
  title: 'Dashboard | TenantFlow',
  description: 'Property management dashboard with real-time insights'
}

// Error fallback component
function DashboardError({ error, resetErrorBoundary }: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="center min-h-screen bg-neutral-50">
      <div className="card text-center">
        <h2 className="text-xl font-semibold text-error mb-2">
          Dashboard Error
        </h2>
        <p className="text-neutral-600 mb-4">
          {error.message || 'Something went wrong loading your dashboard'}
        </p>
        <button 
          onClick={resetErrorBoundary}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

// Loading component for entire page
function DashboardPageLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="p-8 space-fluid-lg">
        <div className="mb-8">
          <div className="w-32 h-8 bg-neutral-200 rounded animate-pulse mb-2"></div>
          <div className="w-48 h-4 bg-neutral-100 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 space-fluid-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <div className="w-16 h-8 bg-neutral-200 rounded animate-pulse mb-2"></div>
              <div className="w-24 h-4 bg-neutral-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Next.js 15 Server Component
 * Automatically optimized, no 'use client' needed
 */
export default function DashboardModernPage() {
  return (
    <ErrorBoundary FallbackComponent={DashboardError}>
      <Suspense fallback={<DashboardPageLoading />}>
        <ModernDashboard />
      </Suspense>
    </ErrorBoundary>
  )
}