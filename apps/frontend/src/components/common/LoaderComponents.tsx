/**
 * Loader Components for TanStack Router
 * 
 * Provides reusable loading states, skeleton screens, and error boundaries
 * specifically designed for route loaders and data fetching.
 */

import React from 'react'
import { ErrorBoundaryWrapper } from '@/components/boundaries/ErrorBoundaryWrapper'
import type { LoaderError } from '@/lib/router-context'

// Re-export LoaderError for convenience
export type { LoaderError } from '@/lib/router-context'

// Error adapter component to bridge LoaderError and Error types
const ErrorAdapter: React.FC<{
  error: Error
  resetErrorBoundary: () => void
}> = ({ error, resetErrorBoundary }) => {
  // Check if it's a LoaderError
  if ('type' in error && 'retryable' in error) {
    return <LoaderErrorFallback error={error as LoaderError} resetErrorBoundary={resetErrorBoundary} />
  }
  
  // Convert regular Error to LoaderError format
  const loaderError: LoaderError = {
    type: 'unknown',
    message: error.message,
    retryable: true
  }
  
  return <LoaderErrorFallback error={loaderError} resetErrorBoundary={resetErrorBoundary} />
}

// ===== LOADING STATES =====

/**
 * Page-level loader with skeleton
 */
export const PageLoader: React.FC<{
  message?: string
  showProgress?: boolean
}> = ({ message = 'Loading...', showProgress = false }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="relative">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        {showProgress && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-blue-600 font-medium">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </div>
      <p className="text-gray-600 font-medium">{message}</p>
      <p className="text-sm text-gray-400 mt-1">
        This should only take a moment
      </p>
    </div>
  </div>
)

/**
 * Section loader for partial page updates
 */
export const SectionLoader: React.FC<{
  height?: string
  message?: string
}> = ({ height = 'h-64', message = 'Loading...' }) => (
  <div className={`flex items-center justify-center ${height} bg-gray-50 rounded-lg`}>
    <div className="text-center">
      <div className="w-8 h-8 mx-auto mb-2 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  </div>
)

/**
 * Inline loader for small sections
 */
export const InlineLoader: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  message?: string
}> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  return (
    <div className="flex items-center justify-center py-2">
      <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin`} />
      {message && (
        <span className="ml-2 text-sm text-gray-500">{message}</span>
      )}
    </div>
  )
}

// ===== SKELETON SCREENS =====

/**
 * Property list skeleton
 */
export const PropertyListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
            <div className="flex space-x-4">
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-14" />
            </div>
          </div>
          <div className="w-16 h-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
)

/**
 * Tenant list skeleton
 */
export const TenantListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-1/5" />
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-200 rounded w-16 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

/**
 * Dashboard skeleton
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      ))}
    </div>
    
    {/* Chart Section */}
    <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
    
    {/* Recent Activity */}
    <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ===== ERROR STATES =====

/**
 * Loader error fallback component
 */
export const LoaderErrorFallback: React.FC<{
  error: LoaderError
  resetErrorBoundary: () => void
}> = ({ error, resetErrorBoundary }) => (
  <div className="min-h-[400px] flex items-center justify-center p-8">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Loading Failed
      </h3>
      
      <p className="text-gray-600 mb-4">
        {error.message || 'Please try again or contact support if the problem persists.'}
      </p>
      
      {error.retryable && (
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      )}
      
      {import.meta.env.DEV && error.metadata && (
        <details className="mt-4 text-left">
          <summary className="text-sm text-gray-500 cursor-pointer">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(error.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  </div>
)

/**
 * Network error component
 */
export const NetworkErrorFallback: React.FC<{
  retry: () => void
}> = ({ retry }) => {
  const isOffline = !navigator.onLine
  
  return (
    <div className="min-h-[300px] flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isOffline ? 'You\'re Offline' : 'Connection Problem'}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {isOffline 
            ? 'Check your internet connection and try again.'
            : 'Unable to connect to our servers. Please try again.'
          }
        </p>
        
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

// ===== PROGRESSIVE LOADING WRAPPER =====

/**
 * Progressive loading wrapper that shows skeleton first, then content
 */
export const ProgressiveLoader: React.FC<{
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  error?: LoaderError | null
  onRetry?: () => void
}> = ({ isLoading, skeleton, children, error, onRetry }) => {
  if (error) {
    return (
      <LoaderErrorFallback 
        error={error} 
        resetErrorBoundary={onRetry || (() => {})} 
      />
    )
  }
  
  if (isLoading) {
    return <>{skeleton}</>
  }
  
  return <>{children}</>
}

// ===== ROUTE LOADER WRAPPER =====

/**
 * Wrapper component for route loaders with error boundaries
 */
export const RouteLoaderWrapper: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
}> = ({ 
  children, 
  fallback = <PageLoader />,
  errorFallback = ErrorAdapter 
}) => (
  <ErrorBoundaryWrapper
    FallbackComponent={errorFallback}
    onError={(error, errorInfo) => {
      console.error('Route loader error:', error, errorInfo)
    }}
  >
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  </ErrorBoundaryWrapper>
)

