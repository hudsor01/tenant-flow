'use client'

import { Button } from '#components/ui/button'
import { logger } from '@repo/shared/lib/frontend-logger'
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Tenant Error Boundary
 *
 * Catches and handles errors in the tenant portal.
 * Provides user-friendly error UI with retry functionality.
 *
 * Automatically logs errors to console for debugging.
 */
export default function TenantError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	const router = useRouter()

	useEffect(() => {
		// Log error using structured logger
		logger.error('Tenant portal error', {
			action: 'tenant_error_boundary',
			metadata: {
				error: error.message,
				digest: error.digest,
				stack: error.stack
			}
		})
	}, [error])

	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="flex justify-center">
					<AlertCircle className="size-16 text-red-500" />
				</div>

				<div className="space-y-2">
					<h2 className="text-2xl font-bold">Something went wrong!</h2>
					<p className="text-muted-foreground">
						We're sorry, but there was an error loading this page.
					</p>
				</div>

				{error.message && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left">
						<p className="text-sm font-medium text-red-900">Error Details:</p>
						<p className="mt-1 text-sm text-red-700">{error.message}</p>
					</div>
				)}

				<div className="flex gap-4 justify-center">
					<Button onClick={() => reset()}>Try again</Button>
					<Button variant="outline" onClick={() => router.push('/tenant')}>
						Go to Dashboard
					</Button>
				</div>

				<p className="text-xs text-muted-foreground">
					If this problem persists, please contact support.
				</p>
			</div>
		</div>
	)
}
