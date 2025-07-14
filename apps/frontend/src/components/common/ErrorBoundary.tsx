import type { ReactNode } from 'react'
import { Component } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(): State {
		return { hasError: true }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('Error caught by ErrorBoundary:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="flex min-h-screen items-center justify-center bg-gray-50">
					<div className="p-8 text-center">
						<h1 className="mb-4 text-2xl font-bold text-gray-900">
							Something went wrong
						</h1>
						<p className="mb-6 text-gray-600">
							An unexpected error occurred.
						</p>
						<button
							onClick={() => window.location.reload()}
							className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
						>
							Reload Page
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
