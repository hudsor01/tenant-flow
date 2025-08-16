import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component } from 'react'
import type { ReactNode } from 'react'

interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
}

interface ErrorBoundaryProps {
	children: ReactNode
}

class ErrorBoundaryComponent extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error }
	}

	override render() {
		if (this.state.hasError) {
			return <GlobalErrorBoundary error={this.state.error} />
		}

		return this.props.children
	}
}

interface GlobalErrorBoundaryProps {
	error?: Error
}

export function GlobalErrorBoundary({ error }: GlobalErrorBoundaryProps) {
	const errorMessage = error?.message || 'An unexpected error occurred'
	const errorStack = error?.stack && process.env.DEV ? error.stack : undefined

	const handleReload = () => {
		window.location.reload()
	}

	const handleGoHome = () => {
		window.location.href = '/'
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
			<div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl md:p-12 dark:bg-slate-800">
				<div className="flex flex-col items-center space-y-6 text-center">
					<div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
						<AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
					</div>

					<div className="space-y-3">
						<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
							Oops! Something went wrong
						</h1>
						<p className="max-w-md text-lg text-slate-600 dark:text-slate-400">
							{errorMessage}
						</p>
					</div>

					{errorStack && (
						<details className="w-full">
							<summary className="cursor-pointer text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
								Show error details
							</summary>
							<pre className="mt-4 overflow-x-auto rounded-lg bg-slate-100 p-4 text-left text-xs dark:bg-slate-900">
								{errorStack}
							</pre>
						</details>
					)}

					<div className="flex flex-col gap-3 pt-4 sm:flex-row">
						<Button
							onClick={handleReload}
							variant="default"
							className="flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Try Again
						</Button>
						<Button
							onClick={handleGoHome}
							variant="outline"
							className="flex items-center gap-2"
						>
							<Home className="h-4 w-4" />
							Go to Dashboard
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

// Export the class component as the main error boundary
export default ErrorBoundaryComponent
