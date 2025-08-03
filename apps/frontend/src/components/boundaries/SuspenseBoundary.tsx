/**
 * Enhanced Suspense Boundaries for React 19
 * Strategic Suspense placement for optimal loading states
 */
import { Suspense, type ReactNode } from 'react'
import { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'

// =====================================================
// 1. LOADING COMPONENTS
// =====================================================

// Generic loading skeleton
function LoadingSkeleton({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

// Card loading state
function CardLoadingSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

// Table loading state
function TableLoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-2 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Form loading state
function FormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// =====================================================
// 2. ERROR FALLBACK COMPONENTS
// =====================================================

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  title?: string
  description?: string
}

function ErrorFallback({ 
  error, 
  resetErrorBoundary, 
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.'
}: ErrorFallbackProps) {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm">{description}</p>
          {import.meta.env.DEV && (
            <details className="text-xs">
              <summary className="cursor-pointer">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
            </details>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetErrorBoundary}
            className="mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Minimal error fallback for small components
function MinimalErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" />
      <span>Failed to load</span>
      <Button variant="ghost" size="sm" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  )
}

// =====================================================
// 3. BOUNDARY COMPONENTS
// =====================================================

export type LoadingVariant = 'skeleton' | 'card' | 'table' | 'form' | 'minimal'

interface SuspenseBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  loadingVariant?: LoadingVariant
  loadingProps?: {
    lines?: number
    count?: number
    rows?: number
    cols?: number
    className?: string
  }
  errorFallback?: React.ComponentType<ErrorFallbackProps>
  errorTitle?: string
  errorDescription?: string
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

// Enhanced Suspense boundary with error handling
export function SuspenseBoundary({
  children,
  fallback,
  loadingVariant = 'skeleton',
  loadingProps = {},
  errorFallback: ErrorFallbackComponent = ErrorFallback,
  errorTitle,
  errorDescription,
  onError,
}: SuspenseBoundaryProps) {
  // Generate loading fallback based on variant
  const loadingFallback = fallback || (() => {
    switch (loadingVariant) {
      case 'card':
        return <CardLoadingSkeleton {...loadingProps} />
      case 'table':
        return <TableLoadingSkeleton {...loadingProps} />
      case 'form':
        return <FormLoadingSkeleton />
      case 'minimal':
        return <div className="p-4 text-center text-muted-foreground">Loading...</div>
      default:
        return <LoadingSkeleton {...loadingProps} />
    }
  })()

  return (
    <ErrorBoundaryWrapper
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorFallbackComponent 
          error={error}
          resetErrorBoundary={resetErrorBoundary}
          title={errorTitle}
          description={errorDescription}
        />
      )}
      onError={onError}
    >
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundaryWrapper>
  )
}

// Specific boundary variants for common use cases
export function DataTableBoundary({ children }: { children: ReactNode }) {
  return (
    <SuspenseBoundary
      loadingVariant="table"
      loadingProps={{ rows: 10, cols: 5 }}
      errorTitle="Failed to load data"
      errorDescription="There was an error loading the table data."
    >
      {children}
    </SuspenseBoundary>
  )
}

export function FormBoundary({ children }: { children: ReactNode }) {
  return (
    <SuspenseBoundary
      loadingVariant="form"
      errorTitle="Failed to load form"
      errorDescription="There was an error loading the form data."
    >
      {children}
    </SuspenseBoundary>
  )
}

export function CardListBoundary({ children, count = 3 }: { children: ReactNode; count?: number }) {
  return (
    <SuspenseBoundary
      loadingVariant="card"
      loadingProps={{ count }}
      errorTitle="Failed to load content"
      errorDescription="There was an error loading the content."
    >
      {children}
    </SuspenseBoundary>
  )
}

export function MinimalBoundary({ children }: { children: ReactNode }) {
  return (
    <SuspenseBoundary
      loadingVariant="minimal"
      errorFallback={MinimalErrorFallback}
    >
      {children}
    </SuspenseBoundary>
  )
}

// =====================================================
// 4. BOUNDARY COMPOSITION HELPERS
// =====================================================

// Note: Utilities are exported from ./index.ts to avoid react-refresh warnings