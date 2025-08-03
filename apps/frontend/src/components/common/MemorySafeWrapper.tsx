import type { ReactNode, ErrorInfo } from 'react'
import React, { Component } from 'react'
import { memoryMonitor } from '@/utils/memoryMonitor'

interface Props {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
	hasError: boolean
	error?: Error
}

/**
 * Memory-safe wrapper component with error boundaries and memory monitoring
 */
export class MemorySafeWrapper extends Component<Props, State> {
	private memoryCheckInterval: NodeJS.Timeout | null = null

	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('MemorySafeWrapper caught an error:', error, errorInfo)

		// Log memory usage when error occurs
		const memoryUsage = memoryMonitor.getCurrentMemoryUsage()
		if (memoryUsage) {
			console.error('Memory usage at error time:', memoryUsage)
		}

		this.props.onError?.(error, errorInfo)
	}

	override componentDidMount() {
		// Monitor memory usage in development
		if (import.meta.env.DEV) {
			this.memoryCheckInterval = setInterval(() => {
				const usage = memoryMonitor.getCurrentMemoryUsage()
				if (usage && usage.used > 200) {
					// Warn if over 200MB
					console.warn(`Component memory usage: ${usage.used}MB`)
				}
			}, 30000) // Check every 30 seconds
		}
	}

	override componentWillUnmount() {
		// Clean up interval
		if (this.memoryCheckInterval) {
			clearInterval(this.memoryCheckInterval)
			this.memoryCheckInterval = null
		}
	}

	override render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="flex min-h-screen items-center justify-center bg-red-50">
						<div className="p-8 text-center">
							<h2 className="mb-4 text-2xl font-bold text-red-600">
								Something went wrong
							</h2>
							<p className="mb-4 text-red-700">
								An error occurred while rendering this
								component.
							</p>
							<button
								onClick={() => window.location.reload()}
								className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
							>
								Reload Page
							</button>
							{import.meta.env.DEV && (
								<details className="mt-4 text-left">
									<summary className="cursor-pointer font-medium text-red-600">
										Error Details (Development)
									</summary>
									<pre className="mt-2 overflow-auto bg-red-100 p-2 text-sm text-red-800">
										{this.state.error?.stack}
									</pre>
								</details>
							)}
						</div>
					</div>
				)
			)
		}

		return this.props.children
	}
}

/**
 * HOC for wrapping components with memory safety
 */
export function withMemorySafety<P extends object>(
	WrappedComponent: React.ComponentType<P>,
	fallback?: ReactNode
) {
	const MemorySafeComponent = (props: P) => (
		<MemorySafeWrapper fallback={fallback}>
			<WrappedComponent {...props} />
		</MemorySafeWrapper>
	)

	MemorySafeComponent.displayName = `MemorySafe(${WrappedComponent.displayName || WrappedComponent.name})`

	return MemorySafeComponent
}
