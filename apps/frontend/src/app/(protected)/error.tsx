'use client'

import { Button } from '@/components/ui/button'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

const logger = createLogger({ component: 'ProtectedError' })

export default function ProtectedError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		logger.error('Protected route error occurred', {
			action: 'error_boundary_triggered',
			metadata: { message: error.message, digest: error.digest }
		})
	}, [error])

	return (
		<div className="flex h-screen w-full items-center justify-center">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<AlertCircle className="size-12 text-destructive" />
				<div className="space-y-2">
					<h2 className="text-xl font-semibold">Authentication Error</h2>
					<p className="text-sm text-muted-foreground">
						There was a problem accessing this protected area. Please try
						signing in again.
					</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={reset} variant="outline" size="sm">
						Try Again
					</Button>
					<Button asChild size="sm">
						<a href="/login">Sign In</a>
					</Button>
				</div>
			</div>
		</div>
	)
}
