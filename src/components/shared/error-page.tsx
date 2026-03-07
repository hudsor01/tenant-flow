'use client'

import { Button } from '#components/ui/button'
import * as Sentry from '@sentry/nextjs'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorPageProps {
	error: Error & { digest?: string }
	resetAction: () => void
	dashboardHref?: string
}

export function ErrorPage({
	error,
	resetAction,
	dashboardHref = '/dashboard'
}: ErrorPageProps) {
	useEffect(() => {
		Sentry.captureException(error)
	}, [error])

	return (
		<div className="flex min-h-[400px] w-full items-center justify-center p-8">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<AlertCircle className="size-12 text-destructive" />
				<div className="space-y-2">
					<h2 className="typography-h4">Something went wrong</h2>
					<p className="text-muted-foreground">
						An unexpected error occurred. Please try again.
					</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={resetAction} variant="outline" size="sm">
						<RefreshCw className="size-4 mr-2" />
						Try Again
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link href={dashboardHref}>
							<Home className="size-4 mr-2" />
							Go to Dashboard
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
