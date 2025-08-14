/**
 * Specialized error boundary for pricing components
 * Provides graceful fallbacks and error tracking
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PricingErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  enableRetry?: boolean
  showContactSupport?: boolean
}

interface PricingErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  retryCount: number
}

// Error tracking utility
function trackPricingError(error: Error, errorInfo: React.ErrorInfo, errorId: string) {
  // In production, this would send to your error tracking service
  console.error('Pricing Error Boundary:', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    errorId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  })

  // Example: Send to analytics/error tracking
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'exception', {
      description: `Pricing Error: ${error.message}`,
      fatal: false,
      custom_map: {
        error_id: errorId,
        component: 'pricing'
      }
    })
  }
}

export class PricingErrorBoundary extends Component<
  PricingErrorBoundaryProps,
  PricingErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: PricingErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<PricingErrorBoundaryState> {
    const errorId = `pricing_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props
    const { errorId } = this.state

    if (errorId) {
      trackPricingError(error, errorInfo, errorId)
    }

    onError?.(error, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state
    const maxRetries = 3

    if (retryCount >= maxRetries) {
      return
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: retryCount + 1
    })

    // Add exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
    this.retryTimeoutId = setTimeout(() => {
      // Force re-render after delay
      this.forceUpdate()
    }, delay)
  }

  handleContactSupport = () => {
    const { error, errorId } = this.state
    const subject = encodeURIComponent('Pricing Page Error')
    const body = encodeURIComponent(
      `I encountered an error on the pricing page.\n\n` +
      `Error ID: ${errorId}\n` +
      `Error: ${error?.message}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `URL: ${window.location.href}\n\n` +
      `Please help me resolve this issue.`
    )
    
    window.open(`mailto:support@tenantflow.app?subject=${subject}&body=${body}`, '_blank')
  }

  render() {
    const { children, fallback, enableRetry = true, showContactSupport = true } = this.props
    const { hasError, error, errorId, retryCount } = this.state

    if (!hasError) {
      return children
    }

    // Custom fallback provided
    if (fallback) {
      return fallback
    }

    // Default error UI
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">
              Pricing Information Unavailable
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-red-700 text-sm text-center">
              We're having trouble loading the pricing information. This might be a temporary issue.
            </p>
            
            {error && (
              <details className="text-xs text-red-600 bg-red-100 p-2 rounded">
                <summary className="cursor-pointer font-medium">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-1">
                  <div><strong>Error:</strong> {error.message}</div>
                  {errorId && <div><strong>ID:</strong> {errorId}</div>}
                  <div><strong>Attempts:</strong> {retryCount + 1}/4</div>
                </div>
              </details>
            )}

            <div className="flex flex-col space-y-2">
              {enableRetry && retryCount < 3 && (
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              {showContactSupport && (
                <Button
                  onClick={this.handleContactSupport}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              )}
            </div>

            <div className="text-center text-xs text-red-600">
              You can still{' '}
              <a 
                href="/contact" 
                className="underline hover:no-underline"
              >
                contact our sales team
              </a>{' '}
              for pricing information.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

// Static pricing fallback component
export function PricingUnavailable() {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Pricing Temporarily Unavailable
        </h2>
        <p className="text-gray-600 mb-8">
          We're updating our pricing information. Please check back in a few minutes 
          or contact our sales team for immediate assistance.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full">
            <a href="/contact">Contact Sales Team</a>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}