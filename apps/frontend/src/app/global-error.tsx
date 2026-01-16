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
				<div className="min-h-screen flex flex-col items-center justify-center gap-4 font-sans p-8">
					<h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
					<p className="text-gray-600 mb-4">
						We&apos;ve been notified and are working to fix the issue.
					</p>
					<button
						onClick={() => reset()}
						className="px-6 py-3 text-white border-none rounded-lg text-base cursor-pointer bg-blue-600 hover:bg-blue-700"
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	)
}
