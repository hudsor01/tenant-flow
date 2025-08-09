'use client'

import React, { Component, ReactNode } from 'react'
import posthog from 'posthog-js'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class PostHogErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to PostHog
    if (typeof window !== 'undefined' && posthog) {
      posthog.capture('error_occurred', {
        error_message: error.message,
        error_stack: error.stack,
        error_type: error.name,
        error_boundary: true,
        component_stack: errorInfo.componentStack,
        error_digest: errorInfo.digest,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      })
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by PostHog Error Boundary:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-300">
                We've encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}