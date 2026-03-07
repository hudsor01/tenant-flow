'use client'

import { ErrorPage } from '#components/shared/error-page'

export default function RootError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return <ErrorPage error={error} resetAction={reset} dashboardHref="/" />
}
