'use client'

import React, { Component, type ReactNode } from 'react'
import { logger } from '@/lib/logger'
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
				user_agent: navigator.userAgent
			})
		}

		// Also log to console in development
		if (process.env.NODE_ENV === 'development') {
			logger.error('Error caught by PostHog Error Boundary:', error, {
				component: 'components_analytics_posthog_error_boundary.tsx',
				errorInfo
			})
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
								We've encountered an unexpected error. Our team
								has been notified and is working on a fix.
							</p>
							<button
								onClick={() => window.location.reload()}
								className="bg-primary focus:ring-primary w-full rounded-md px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:outline-none"
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
