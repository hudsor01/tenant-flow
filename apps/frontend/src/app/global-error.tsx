'use client'

import { ErrorFallback } from '#components/error-boundary/error-fallback'

import './globals.css'

export default function GlobalError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html lang="en">
			<body className="font-sans antialiased">
				<ErrorFallback error={error} reset={reset} />
			</body>
		</html>
	)
}
