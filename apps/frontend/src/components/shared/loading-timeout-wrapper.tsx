'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Skeleton } from '#components/ui/skeleton'

interface LoadingTimeoutWrapperProps {
	children: ReactNode
	isLoading: boolean
	error?: Error | null
	onRetry?: () => void
	loadingMessage?: string
	timeoutMs?: number
}

/**
 * LoadingTimeoutWrapper - Ensures loading states resolve within a timeout period
 *
 * Requirements:
 * - 3.1: Display skeleton loaders for a maximum of 3 seconds
 * - 3.2: Display error message with retry option on fetch failure or timeout
 */
export function LoadingTimeoutWrapper({
	children,
	isLoading,
	error,
	onRetry,
	loadingMessage = 'Loading...',
	timeoutMs = 3000
}: LoadingTimeoutWrapperProps) {
	const [hasTimedOut, setHasTimedOut] = useState(false)

	useEffect(() => {
		if (!isLoading) {
			// Reset timeout state when loading completes
			setHasTimedOut(false)
			return
		}

		// Set timeout for loading state
		const timeoutId = setTimeout(() => {
			setHasTimedOut(true)
		}, timeoutMs)

		return () => {
			clearTimeout(timeoutId)
		}
	}, [isLoading, timeoutMs])

	// Show error state if there's an explicit error
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<AlertCircle className="size-12 text-destructive mb-4" />
				<h3 className="typography-large mb-2">
					{error.message || 'Failed to load data'}
				</h3>
				<p className="text-sm text-muted-foreground mb-4">
					Please try again or contact support if the problem persists.
				</p>
				<Button onClick={onRetry} variant="outline">
					Retry
				</Button>
			</div>
		)
	}

	// Show timeout error if loading has exceeded the timeout
	if (hasTimedOut && isLoading) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<AlertCircle className="size-12 text-warning mb-4" />
				<h3 className="typography-large mb-2">
					This is taking longer than expected
				</h3>
				<p className="text-sm text-muted-foreground mb-4">
					The request is taking longer than usual. You can wait or try again.
				</p>
				<Button onClick={onRetry} variant="outline">
					Retry
				</Button>
			</div>
		)
	}

	// Show loading skeleton
	if (isLoading) {
		return (
			<div data-testid="loading-skeleton" className="space-y-4 p-4">
				<div className="flex items-center gap-2">
					<Skeleton className="size-4 rounded-full" />
					<span className="text-sm text-muted-foreground">
						{loadingMessage}
					</span>
				</div>
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-16 w-3/4" />
			</div>
		)
	}

	// Show content when not loading and no error
	return <>{children}</>
}
