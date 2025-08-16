'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface ErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
	useEffect(() => {
		// Log the error to your error reporting service
		logger.error('Application error:', error)

		// You can send this to your error tracking service
		if (typeof window !== 'undefined') {
			// Example: Sentry.captureException(error);
		}
	}, [error])

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="mx-auto max-w-md space-y-6 px-4 text-center">
				<div className="space-y-4">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
						<AlertTriangle className="h-8 w-8 text-red-600" />
					</div>

					<div className="space-y-2">
						<h1 className="text-2xl font-semibold text-gray-900">
							Something went wrong
						</h1>
						<p className="text-gray-600">
							We encountered an unexpected error. This has been
							logged and we&apos;ll look into it.
						</p>
					</div>

					{process.env.NODE_ENV === 'development' && (
						<details className="rounded-lg bg-gray-100 p-4 text-left">
							<summary className="cursor-pointer text-sm font-medium text-gray-700">
								Error Details (Development)
							</summary>
							<pre className="mt-2 overflow-auto text-xs text-gray-600">
								{error.message}
								{error.stack && `\n\n${error.stack}`}
							</pre>
						</details>
					)}
				</div>

				<div className="flex flex-col justify-center gap-4 sm:flex-row">
					<button
						onClick={reset}
						className="bg-primary flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition-colors hover:bg-blue-700"
					>
						<RefreshCw className="h-4 w-4" />
						Try Again
					</button>
					<Link
						href="/dashboard"
						className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-200"
					>
						<Home className="h-4 w-4" />
						Go to Dashboard
					</Link>
				</div>

				{error.digest && (
					<div className="text-xs text-gray-500">
						Error ID: {error.digest}
					</div>
				)}
			</div>
		</div>
	)
}
