'use client'

import { Component, type ReactNode } from 'react'
import { logger } from '@/lib/logger'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class DashboardErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		logger.error('Dashboard error:', error, {
			component: 'dashboarderrorboundary',
			errorInfo
		})
	}

	render() {
		if (this.state.hasError) {
			// Check if it's an API error
			const isApiError =
				this.state.error?.message?.includes('404') ||
				this.state.error?.message?.includes('Request failed')

			if (isApiError) {
				// Show a friendly message for API errors
				return (
					<div className="container mx-auto max-w-4xl p-6">
						<Alert className="mb-6">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Limited Functionality</AlertTitle>
							<AlertDescription>
								Some features are currently unavailable. You can
								still explore the application.
							</AlertDescription>
						</Alert>

						<div className="grid gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Quick Actions</CardTitle>
									<CardDescription>
										Get started with these features
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-2">
									<Link href="/properties">
										<Button
											variant="outline"
											className="w-full justify-start"
										>
											View Properties
										</Button>
									</Link>
									<Link href="/tenants">
										<Button
											variant="outline"
											className="w-full justify-start"
										>
											Manage Tenants
										</Button>
									</Link>
									<Link href="/settings">
										<Button
											variant="outline"
											className="w-full justify-start"
										>
											Account Settings
										</Button>
									</Link>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Welcome to TenantFlow</CardTitle>
									<CardDescription>
										Your property management platform
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground mb-4 text-sm">
										We're currently setting up your
										dashboard. In the meantime, you can
										explore the available features using the
										navigation menu.
									</p>
									<Button
										onClick={() => window.location.reload()}
										variant="secondary"
										className="w-full"
									>
										<RefreshCw className="mr-2 h-4 w-4" />
										Retry Loading Dashboard
									</Button>
								</CardContent>
							</Card>
						</div>

						<div className="mt-6 text-center">
							<Link href="/">
								<Button variant="ghost">
									<Home className="mr-2 h-4 w-4" />
									Back to Home
								</Button>
							</Link>
						</div>
					</div>
				)
			}

			// For other errors, show the fallback or default error
			return (
				this.props.fallback || (
					<div className="flex min-h-screen items-center justify-center">
						<Card className="w-full max-w-md">
							<CardHeader>
								<CardTitle>Something went wrong</CardTitle>
								<CardDescription>
									An unexpected error occurred. Please try
									refreshing the page.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Button
									onClick={() => window.location.reload()}
									className="w-full"
								>
									<RefreshCw className="mr-2 h-4 w-4" />
									Refresh Page
								</Button>
								<Link href="/" className="block">
									<Button
										variant="outline"
										className="w-full"
									>
										Go to Home
									</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				)
			)
		}

		return this.props.children
	}
}
