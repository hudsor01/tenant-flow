'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useErrorBoundary } from '#hooks/use-error-boundary'
import type { ReactNode } from 'react'
import { Component } from 'react'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ErrorBoundary' })

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log error locally for immediate debugging
		logger.error('ErrorBoundary - Error caught by boundary', {
			action: 'component_error_boundary',
			metadata: {
				error: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack
			}
		})

		// Store error in global error boundary store
		const errorBoundaryStore = (this as unknown as Record<string, { setError?: (error: Error, source: string) => void }>).errorBoundaryStore
	if (errorBoundaryStore?.setError) {
		errorBoundaryStore.setError(error, 'ErrorBoundary')
	}
	}

	override render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<ErrorBoundaryWithStore error={this.state.error} />
			)
		}

		return this.props.children
	}
}

// Separate component to use hooks within the error boundary
function ErrorBoundaryWithStore({ error }: { error: Error | undefined }) {
	const { clearError, errorState } = useErrorBoundary()

	const handleRetry = () => {
		clearError()
		window.location.reload()
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			    <CardLayout title="Something went wrong" className="max-w-md w-full">
				<div className="flex flex-col items-center space-y-4 text-center">
					<AlertTriangle className="size-12 text-destructive" />
					<div className="space-y-2">
						<h2 className="text-xl font-semibold">Something went wrong</h2>
						<p className="text-muted-foreground">
							An unexpected error occurred. Our team has been notified.
						</p>
						{error?.message && (
							<p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
								{error.message}
							</p>
						)}
						{errorState.errorId && (
							<p className="text-xs text-muted-foreground">
								Error ID: {errorState.errorId}
							</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={handleRetry}>
							<RefreshCw className="size-4 mr-2" />
							Try Again
						</Button>
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
