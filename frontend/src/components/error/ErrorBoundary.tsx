import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { logger } from '@/lib/logger'

interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
	errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
	children: React.ReactNode
	fallback?: React.ComponentType<ErrorFallbackProps>
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
	error: Error
	resetError: () => void
	errorInfo?: React.ErrorInfo
}

class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			error
		}
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		logger.error('ErrorBoundary caught an error', error, { errorInfo })

		this.setState({
			error,
			errorInfo
		})

		// Call optional error handler
		this.props.onError?.(error, errorInfo)

		// Log to external service in production
		if (import.meta.env.PROD) {
			// Error tracking placeholder - integrate with Sentry/LogRocket in production
			logger.error(
				'Production error caught by boundary',
				this.state.error,
				{
					error: error.message,
					stack: error.stack,
					componentStack: errorInfo.componentStack
				}
			)
		}
	}

	resetError = () => {
		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined
		})
	}

	render() {
		if (this.state.hasError) {
			const FallbackComponent =
				this.props.fallback || DefaultErrorFallback
			return (
				<FallbackComponent
					error={this.state.error!}
					resetError={this.resetError}
					errorInfo={this.state.errorInfo}
				/>
			)
		}

		return this.props.children
	}
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
	const isDevelopment = import.meta.env.DEV

	return (
		<div className="bg-background flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
						<AlertTriangle className="text-destructive h-6 w-6" />
					</div>
					<CardTitle className="text-lg font-semibold">
						Something went wrong
					</CardTitle>
					<CardDescription>
						An unexpected error occurred. Our team has been notified
						and is working on a fix.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isDevelopment && (
						<div className="bg-muted rounded-md p-3">
							<p className="text-muted-foreground font-mono text-sm">
								<strong>Error:</strong> {error.message}
							</p>
							{error.stack && (
								<details className="mt-2">
									<summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
										Stack trace
									</summary>
									<pre className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">
										{error.stack}
									</pre>
								</details>
							)}
						</div>
					)}
					<div className="flex gap-2">
						<Button onClick={resetError} className="flex-1">
							<RefreshCw className="mr-2 h-4 w-4" />
							Try Again
						</Button>
						<Button
							variant="outline"
							onClick={() => (window.location.href = '/')}
							className="flex-1"
						>
							<Home className="mr-2 h-4 w-4" />
							Go Home
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

// Specific error boundary for page-level components
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={PageErrorFallback}
			onError={(error, errorInfo) => {
				// Log page-level errors with additional context
				logger.error('Page Error', error, {
					url: window.location.href,
					error: error.message,
					stack: error.stack,
					componentStack: errorInfo.componentStack
				})
			}}
		>
			{children}
		</ErrorBoundary>
	)
}

function PageErrorFallback({ resetError }: ErrorFallbackProps) {
	return (
		<div className="container mx-auto px-4 py-16 text-center">
			<div className="mx-auto max-w-md">
				<AlertTriangle className="text-destructive mx-auto mb-4 h-12 w-12" />
				<h1 className="text-foreground mb-2 text-2xl font-bold">
					Page Error
				</h1>
				<p className="text-muted-foreground mb-6">
					This page encountered an error and couldn't load properly.
				</p>
				<div className="flex justify-center gap-2">
					<Button onClick={resetError}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Reload Page
					</Button>
					<Button
						variant="outline"
						onClick={() => (window.location.href = '/')}
					>
						<Home className="mr-2 h-4 w-4" />
						Go Home
					</Button>
				</div>
			</div>
		</div>
	)
}

export { ErrorBoundary, type ErrorBoundaryProps, type ErrorFallbackProps }
