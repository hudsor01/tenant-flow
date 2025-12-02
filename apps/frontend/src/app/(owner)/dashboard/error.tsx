'use client'

import { useEffect } from 'react'
import { Button } from '#components/ui/button'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'DashboardError' })

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		logger.error('Dashboard error occurred', { metadata: { digest: error.digest } }, error)
	}, [error])

	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-(--spacing-4)">
			<h2 className="text-2xl font-bold">Something went wrong!</h2>
			<p className="text-muted-foreground">
				{error.message || 'An error occurred in the dashboard'}
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	)
}
