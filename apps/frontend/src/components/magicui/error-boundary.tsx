'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Component } from 'react'
import { logger } from '@repo/shared'

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
			logger.error('ErrorBoundary - Error caught by boundary', {
				action: 'component_error_boundary',
				metadata: {
					error: error.message,
					stack: error.stack,
					componentStack: errorInfo.componentStack
				}
			})

		// Send to error tracking service
		if (process.env.NODE_ENV === 'production') {
			// Example: Sentry.captureException(error, { extra: errorInfo })
		}
	}

	override render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="min-h-screen flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
								<AlertTriangle className="w-6 h-6 text-destructive" />
							</div>
							<CardTitle>Something went wrong</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-sm text-muted-foreground text-center">
								We encountered an unexpected error. Please try refreshing the
								page.
							</p>

							{process.env.NODE_ENV === 'development' && this.state.error && (
								<details className="text-xs bg-muted p-2 rounded">
									<summary>Error details</summary>
									<pre className="mt-2 whitespace-pre-wrap">
										{this.state.error.message}
										{this.state.error.stack}
									</pre>
								</details>
							)}

							<div className="flex gap-2">
								<Button
									onClick={() => window.location.reload()}
									className="flex-1"
								>
									<RefreshCw className="w-4 h-4 mr-2" />
									Refresh Page
								</Button>
								<Button
									variant="outline"
									onClick={() => this.setState({ hasError: false })}
									className="flex-1"
								>
									Try Again
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)
		}

		return this.props.children
	}
}
