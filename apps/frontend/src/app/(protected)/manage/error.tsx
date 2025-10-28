'use client'

import { Button } from '#components/ui/button'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

const logger = createLogger({ component: 'DashboardError' })

/**
 * Error boundary for /manage routes
 * IMPORTANT: This error component is rendered INSIDE the manage layout which already has
 * sidebar and header. Do NOT duplicate layout components here.
 */
export default function DashboardError({
	error,
	resetAction
}: {
	error: Error & { digest?: string }
	resetAction: () => void
}) {
	useEffect(() => {
		logger.error('Dashboard error occurred', {
			action: 'dashboard_error_boundary_triggered',
			metadata: { message: error.message, digest: error.digest }
		})
	}, [error])

	return (
		<div className="flex h-125 w-full items-center justify-center">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<AlertCircle className="size-12 text-destructive" />
				<div className="space-y-2">
					<h2 className="text-xl font-semibold">Something went wrong</h2>
					<p className="text-sm text-muted-foreground">
						{error.message || 'An unexpected error occurred. Please try again.'}
					</p>
				</div>
				<Button onClick={resetAction} variant="outline" size="sm">
					Try Again
				</Button>
			</div>
		</div>
	)
}
