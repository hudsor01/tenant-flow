'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		// Log error to Sentry
		Sentry.captureException(error)
	}, [error])

	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4 font-sans p-8">
			<h2 className="typography-h3 mb-4">Something went wrong!</h2>
			<button
				onClick={() => reset()}
				className="px-6 py-3 text-white border-none rounded-lg text-base cursor-pointer bg-accent-main"
			>
				Try again
			</button>
		</div>
	)
}
