/**
 * Global error handler component for the TenantFlow application
 * Provides centralized error recovery and user feedback
 * Apple-inspired design with clear action paths
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

interface GlobalErrorHandlerProps {
  error: Error
  reset: () => void
  showFallback?: boolean
}

export function GlobalErrorHandler({
  error,
  reset,
  showFallback = true
}: GlobalErrorHandlerProps) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Log error for monitoring
    console.error('Global Error Handler:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)

    try {
      // Simple retry with delay
      await new Promise(resolve => setTimeout(resolve, 500))
      reset()
      setRetryCount(count => count + 1)
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  const handleGoBack = () => {
    router.back()
  }

  if (!showFallback) {
    return null
  }

  // Determine error severity and messaging
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network')
  const isAuthError = error.message.includes('unauthorized') || error.message.includes('forbidden')
  const isServerError = error.message.includes('500') || error.message.includes('503')

  let title = 'Something went wrong'
  let description = 'An unexpected error occurred. Please try again.'
  let canRetry = true

  if (isNetworkError) {
    title = 'Connection Issue'
    description = 'Please check your internet connection and try again.'
  } else if (isAuthError) {
    title = 'Access Required'
    description = 'Please sign in to continue.'
    canRetry = false
  } else if (isServerError) {
    title = 'Service Temporarily Unavailable'
    description = 'Our servers are experiencing issues. Please try again in a moment.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        {/* Error Content */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {description}
          </p>

          {/* Show retry count if multiple attempts */}
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Retry attempt: {retryCount}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
              size="default"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>

            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Technical Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {error.message}
              </pre>
            </div>
          </details>
        )}
      </Card>
    </div>
  )
}

/**
 * Simplified error fallback for smaller components
 */
export function SimpleErrorFallback({
  error,
  resetErrorBoundary
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  // Log error for monitoring
  useEffect(() => {
    console.error('Error boundary caught error:', error)
  }, [error])
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-foreground">Something went wrong</h3>
        <p className="text-sm text-muted-foreground">
          Please try again or refresh the page.
        </p>
      </div>

      <Button onClick={resetErrorBoundary} size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  )
}