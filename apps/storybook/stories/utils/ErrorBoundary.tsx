import React, { Component, ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

export class StoryErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error(
			'Storybook Error Boundary caught an error:',
			error,
			errorInfo
		)
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4">
						<h3 className="mb-2 font-semibold text-red-800">
							Story Error
						</h3>
						<p className="mb-2 text-sm text-red-700">
							This component failed to render. This might be due
							to:
						</p>
						<ul className="list-inside list-disc space-y-1 text-xs text-red-600">
							<li>Missing imports or dependencies</li>
							<li>Invalid props or missing required props</li>
							<li>
								Component requiring authentication or API
								context
							</li>
						</ul>
						{this.state.error && (
							<details className="mt-3">
								<summary className="cursor-pointer text-xs text-red-800">
									Error Details
								</summary>
								<pre className="mt-1 overflow-auto text-xs text-red-600">
									{this.state.error.message}
								</pre>
							</details>
						)}
					</div>
				)
			)
		}

		return this.props.children
	}
}
