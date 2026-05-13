'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

import { ErrorPage } from '#components/shared/error-page'

export default function RootError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			tags: { boundary: 'root-error' },
			extra: { digest: error.digest }
		})
	}, [error])

	return <ErrorPage error={error} resetAction={reset} dashboardHref="/" />
}
