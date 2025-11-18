'use client'

import {
	Alert,
	AlertDescription,
	AlertTitle
} from '#components/ui/alert'
import { Button } from '#components/ui/button'
import { mobileAnalytics } from '#lib/mobile-analytics'
import { Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Component } from 'react'

interface MobileErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
}

interface MobileErrorBoundaryState {
	hasError: boolean
	error?: Error
}

export class MobileErrorBoundary extends Component<
	MobileErrorBoundaryProps,
	MobileErrorBoundaryState
> {
	override state: MobileErrorBoundaryState = { hasError: false }

	static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		mobileAnalytics.track('mobile_error', {
			message: error.message,
			stack: errorInfo.componentStack
		})
	}

	private handleRefresh = () => {
		if (typeof window !== 'undefined') {
			window.location.reload()
		}
	}

	override render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="p-4">
					<Alert variant="destructive" className="mb-4 rounded-2xl">
						<AlertTitle>Something went wrong</AlertTitle>
						<AlertDescription>
							{this.state.error?.message ??
								'We could not load this view. Try refreshing the page.'}
						</AlertDescription>
					</Alert>
					<div className="flex flex-col gap-2">
						<Button className="w-full" onClick={this.handleRefresh}>
							<RefreshCw className="mr-2 size-4" aria-hidden />
							Refresh
						</Button>
						<Button asChild variant="outline" className="w-full">
							<Link href="/manage">
								<Home className="mr-2 size-4" aria-hidden />
								Go Home
							</Link>
						</Button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
