'use client'

import { Button } from '#components/ui/button'
import * as Sentry from '@sentry/nextjs'
import { Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorFallbackProps {
	error: Error & { digest?: string }
	reset: () => void
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
	useEffect(() => {
		Sentry.captureException(error)
	}, [error])

	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
			<h2 className="text-xl font-semibold">Something went wrong!</h2>
			<p className="text-sm text-muted-foreground">
				We have been notified and are working to fix the issue.
			</p>
			<div className="flex gap-3">
				<Button onClick={() => reset()} variant="outline" size="sm">
					<RefreshCw className="size-4 mr-2" />
					Try again
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href="/">
						<Home className="size-4 mr-2" />
						Go to Dashboard
					</Link>
				</Button>
			</div>
		</div>
	)
}
