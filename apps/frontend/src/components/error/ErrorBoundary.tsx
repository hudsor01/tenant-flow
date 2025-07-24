import React from 'react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react' // ChevronLeft unused
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { logger } from '@/lib/logger'
import { useErrorHandler } from '@/lib/error-handling' // classifyError unused
import { Link } from '@tanstack/react-router'

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

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		logger.error('ErrorBoundary caught an error', error, { 
			componentStack: errorInfo.componentStack || null,
			digest: errorInfo.digest || null
		})

		this.setState({
			error,
			errorInfo
		})

		// Call optional error handler
		this.props.onError?.(error, errorInfo)

		// Log
		if (import.meta.env.PROD) {
			logger.error(
				'Production error caught by boundary',
				this.state.error,
				{
					error: error.message,
					stack: error.stack || null,
					componentStack: errorInfo.componentStack || '' || null
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

	override render() {
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
					errorMessage: error.message,
					errorStack: error.stack || '',
					componentStack: errorInfo.componentStack || ''
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

/**
 * Enhanced Query Error Boundary with React Query integration
 */
interface QueryErrorFallbackProps {
	error: Error
	resetErrorBoundary: () => void
}

function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
	const { handleError } = useErrorHandler()
	const appError = handleError(error)

	return (
		<Card className="mx-auto max-w-md">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
					<AlertTriangle className="h-6 w-6 text-red-600" />
				</div>
				<CardTitle className="text-red-900">Data Loading Error</CardTitle>
				<CardDescription>{appError.userMessage}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{appError.retryable && (
					<Button onClick={resetErrorBoundary} className="w-full" variant="outline">
						<RefreshCw className="mr-2 h-4 w-4" />
						Try again
					</Button>
				)}
				<Button asChild className="w-full" variant="secondary">
					<Link to="/dashboard">
						<Home className="mr-2 h-4 w-4" />
						Go to Dashboard
					</Link>
				</Button>
				{import.meta.env.DEV && (
					<details className="mt-4">
						<summary className="cursor-pointer text-sm text-gray-500">
							Technical Details
						</summary>
						<pre className="mt-2 rounded bg-gray-100 p-2 text-xs">
							{JSON.stringify({ error: appError, original: error.message }, null, 2)}
						</pre>
					</details>
				)}
			</CardContent>
		</Card>
	)
}

/**
 * Query Error Boundary - wraps components that use React Query
 */
interface QueryErrorBoundaryProps {
	children: React.ReactNode
	fallback?: React.ComponentType<QueryErrorFallbackProps>
}

export function QueryErrorBoundary({ 
	children, 
	fallback: Fallback = QueryErrorFallback 
}: QueryErrorBoundaryProps) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }: { reset: () => void }) => (
				<ReactErrorBoundary
					FallbackComponent={(props) => <Fallback {...props} />}
					onReset={reset}
					onError={(error, errorInfo) => {
						logger.error('Query Error Boundary caught an error:', error, { 
							componentStack: errorInfo.componentStack || '',
							digest: errorInfo.digest || ''
						})
					}}
				>
					{children}
				</ReactErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	)
}

/**
 * Section Error Boundary - for individual page sections
 */
interface SectionErrorBoundaryProps {
	children: React.ReactNode
	sectionName: string
	showMinimalFallback?: boolean
}

function SectionErrorFallback({ 
	error, 
	resetErrorBoundary, 
	sectionName,
	showMinimal = false 
}: QueryErrorFallbackProps & { sectionName: string; showMinimal?: boolean }) {
	const { handleError } = useErrorHandler()
	const appError = handleError(error)

	if (showMinimal) {
		return (
			<div className="rounded border border-red-200 bg-red-50 p-4">
				<div className="flex items-center gap-2">
					<AlertTriangle className="h-4 w-4 text-red-600" />
					<span className="text-sm text-red-800">
						Unable to load {sectionName}
					</span>
				</div>
				{appError.retryable && (
					<Button 
						onClick={resetErrorBoundary} 
						size="sm" 
						variant="outline"
						className="mt-2"
					>
						<RefreshCw className="mr-1 h-3 w-3" />
						Retry
					</Button>
				)}
			</div>
		)
	}

	return (
		<Card className="border-red-200">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<AlertTriangle className="h-5 w-5 text-red-600" />
					<CardTitle className="text-base">Error loading {sectionName}</CardTitle>
				</div>
				<CardDescription>{appError.userMessage}</CardDescription>
			</CardHeader>
			{appError.retryable && (
				<CardContent className="pt-0">
					<Button onClick={resetErrorBoundary} size="sm" variant="outline">
						<RefreshCw className="mr-2 h-4 w-4" />
						Try again
					</Button>
				</CardContent>
			)}
		</Card>
	)
}

export function SectionErrorBoundary({ 
	children, 
	sectionName, 
	showMinimalFallback = false 
}: SectionErrorBoundaryProps) {
	return (
		<ReactErrorBoundary
			FallbackComponent={(props) => (
				<SectionErrorFallback 
					{...props} 
					sectionName={sectionName}
					showMinimal={showMinimalFallback}
				/>
			)}
			onError={(error) => {
				logger.error(`Section Error Boundary (${sectionName}) caught an error:`, error)
			}}
		>
			{children}
		</ReactErrorBoundary>
	)
}

/**
 * Network Error Boundary - specifically for network-related errors
 */
export function NetworkErrorBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ReactErrorBoundary
			FallbackComponent={({ error: _error, resetErrorBoundary }) => {
				const isOffline = !navigator.onLine
				
				return (
					<Card className="mx-auto max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
								<AlertTriangle className="h-6 w-6 text-yellow-600" />
							</div>
							<CardTitle className="text-yellow-900">
								{isOffline ? 'You\'re offline' : 'Connection Error'}
							</CardTitle>
							<CardDescription>
								{isOffline 
									? 'Check your internet connection and try again'
									: 'Unable to connect to the server'
								}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={resetErrorBoundary} className="w-full">
								<RefreshCw className="mr-2 h-4 w-4" />
								{isOffline ? 'Try again' : 'Retry connection'}
							</Button>
						</CardContent>
					</Card>
				)
			}}
			onError={(error) => {
				logger.error('Network Error Boundary caught an error:', error)
			}}
		>
			{children}
		</ReactErrorBoundary>
	)
}

export { ErrorBoundary, type ErrorBoundaryProps, type ErrorFallbackProps }
