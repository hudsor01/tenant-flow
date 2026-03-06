'use client'

import { ErrorPage } from '#components/shared/error-page'

export default function BlogError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return <ErrorPage error={error} resetAction={reset} dashboardHref="/" />
}
