'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		Sentry.captureException(error)
	}, [error])

	return (
		<html lang="en">
			<body>
				<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
					<h2 className="text-xl font-semibold mb-4">Something went wrong!</h2>
					<p className="text-sm text-muted-foreground mb-4">
						We&apos;ve been notified and are working to fix the issue.
					</p>
					<button
						type="button"
						onClick={() => reset()}
						className="min-h-11 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	)
}
