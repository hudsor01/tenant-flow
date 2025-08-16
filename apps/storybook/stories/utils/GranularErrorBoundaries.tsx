import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Bug, Home } from 'lucide-react'

// Base error boundary types
interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
	errorInfo?: ErrorInfo
	errorId: string
}

interface ErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
}

// Enhanced error boundary with detailed error reporting
class BaseErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = {
			hasError: false,
			errorId: Math.random().toString(36).substr(2, 9)
		}
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error,
			errorId: Math.random().toString(36).substr(2, 9)
		}
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({
			error,
			errorInfo,
			errorId: Math.random().toString(36).substr(2, 9)
		})

		// Log error for debugging
		console.group(`🚨 Storybook Error Boundary [${this.state.errorId}]`)
		console.error('Error:', error)
		console.error('Error Info:', errorInfo)
		console.error('Component Stack:', errorInfo.componentStack)
		console.groupEnd()

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo)
		}

		// Send error to monitoring service in production
		if (process.env.NODE_ENV === 'production') {
			// Example: sendErrorToSentry(error, errorInfo);
		}
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return this.renderDefaultErrorUI()
		}

		return this.props.children
	}

	private renderDefaultErrorUI() {
		return (
			<div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6">
				<div className="flex items-start gap-3">
					<AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-red-600" />
					<div className="flex-1">
						<h3 className="mb-2 text-lg font-semibold text-red-800">
							Component Error Detected
						</h3>
						<p className="mb-4 text-red-700">
							This component encountered an error and could not
							render properly.
						</p>

						<details className="mb-4">
							<summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
								Error Details (ID: {this.state.errorId})
							</summary>
							<div className="mt-2 rounded border bg-white p-3 text-sm">
								<p className="mb-1 font-medium text-gray-800">
									Error Message:
								</p>
								<p className="mb-3 font-mono text-xs text-red-600">
									{this.state.error?.message}
								</p>

								{this.state.error?.stack && (
									<>
										<p className="mb-1 font-medium text-gray-800">
											Stack Trace:
										</p>
										<pre className="max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
											{this.state.error.stack}
										</pre>
									</>
								)}
							</div>
						</details>

						<div className="flex gap-2">
							<button
								onClick={() =>
									this.setState({
										hasError: false,
										error: undefined,
										errorInfo: undefined
									})
								}
								className="flex items-center gap-2 rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
							>
								<RefreshCw className="h-4 w-4" />
								Retry Component
							</button>
							<button
								onClick={() => window.location.reload()}
								className="flex items-center gap-2 rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
							>
								<Home className="h-4 w-4" />
								Reload Storybook
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}
}

// Specialized error boundaries for different component types

// For UI components (buttons, inputs, etc.)
export class UIComponentErrorBoundary extends BaseErrorBoundary {
	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.group('🎨 UI Component Error')
		console.error('UI Component failed to render:', error.message)
		console.error('This is likely a props or styling issue')
		console.groupEnd()
		super.componentDidCatch(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="rounded border border-orange-200 bg-orange-50 p-4 text-center">
					<Bug className="mx-auto mb-2 h-8 w-8 text-orange-600" />
					<p className="font-medium text-orange-800">
						UI Component Error
					</p>
					<p className="text-sm text-orange-700">
						Check component props and styling
					</p>
					<button
						onClick={() => this.setState({ hasError: false })}
						className="mt-2 rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-700"
					>
						Retry
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

// For business logic components (property cards, tenant forms, etc.)
export class BusinessComponentErrorBoundary extends BaseErrorBoundary {
	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.group('🏢 Business Component Error')
		console.error('Business component failed:', error.message)
		console.error(
			'This may be due to data formatting or business logic issues'
		)
		console.groupEnd()
		super.componentDidCatch(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="rounded border border-blue-200 bg-blue-50 p-4 text-center">
					<AlertCircle className="mx-auto mb-2 h-8 w-8 text-blue-600" />
					<p className="font-medium text-blue-800">
						Business Component Error
					</p>
					<p className="text-sm text-blue-700">
						Check data props and business logic
					</p>
					<button
						onClick={() => this.setState({ hasError: false })}
						className="mt-2 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
					>
						Retry
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

// For form components with validation
export class FormComponentErrorBoundary extends BaseErrorBoundary {
	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.group('📝 Form Component Error')
		console.error('Form component failed:', error.message)
		console.error(
			'This may be due to validation rules or form state issues'
		)
		console.groupEnd()
		super.componentDidCatch(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="rounded border border-purple-200 bg-purple-50 p-4 text-center">
					<AlertCircle className="mx-auto mb-2 h-8 w-8 text-purple-600" />
					<p className="font-medium text-purple-800">
						Form Component Error
					</p>
					<p className="text-sm text-purple-700">
						Check validation rules and form state
					</p>
					<button
						onClick={() => this.setState({ hasError: false })}
						className="mt-2 rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
					>
						Retry
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

// For data visualization components (charts, graphs, etc.)
export class DataVisualizationErrorBoundary extends BaseErrorBoundary {
	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.group('📊 Data Visualization Error')
		console.error('Data visualization failed:', error.message)
		console.error(
			'This may be due to invalid data format or missing dependencies'
		)
		console.groupEnd()
		super.componentDidCatch(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="rounded border border-green-200 bg-green-50 p-4 text-center">
					<AlertCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
					<p className="font-medium text-green-800">
						Data Visualization Error
					</p>
					<p className="text-sm text-green-700">
						Check data format and chart configuration
					</p>
					<button
						onClick={() => this.setState({ hasError: false })}
						className="mt-2 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
					>
						Retry
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

// For layout components (grids, containers, etc.)
export class LayoutErrorBoundary extends BaseErrorBoundary {
	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.group('🏗️ Layout Component Error')
		console.error('Layout component failed:', error.message)
		console.error(
			'This may be due to CSS grid/flexbox issues or responsive breakpoints'
		)
		console.groupEnd()
		super.componentDidCatch(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="rounded border border-indigo-200 bg-indigo-50 p-4 text-center">
					<AlertCircle className="mx-auto mb-2 h-8 w-8 text-indigo-600" />
					<p className="font-medium text-indigo-800">
						Layout Component Error
					</p>
					<p className="text-sm text-indigo-700">
						Check CSS layout and responsive design
					</p>
					<button
						onClick={() => this.setState({ hasError: false })}
						className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
					>
						Retry
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	BoundaryType: typeof BaseErrorBoundary = BaseErrorBoundary
) {
	const WrappedComponent = (props: P) => (
		<BoundaryType>
			<Component {...props} />
		</BoundaryType>
	)

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
	return WrappedComponent
}

// Hook for error reporting in functional components
export function useErrorReporting() {
	const reportError = React.useCallback((error: Error, context?: string) => {
		console.group(`🐛 Manual Error Report${context ? ` - ${context}` : ''}`)
		console.error('Error:', error)
		console.error('Stack:', error.stack)
		console.groupEnd()

		// Send to error reporting service
		if (process.env.NODE_ENV === 'production') {
			// Example: reportToErrorService(error, context);
		}
	}, [])

	return { reportError }
}

// Story decorator that automatically applies appropriate error boundary
export const withStoryErrorBoundary =
	(BoundaryType: typeof BaseErrorBoundary = BaseErrorBoundary) =>
	(Story: React.ComponentType) => (
		<BoundaryType>
			<Story />
		</BoundaryType>
	)

export { BaseErrorBoundary as StoryErrorBoundary }
