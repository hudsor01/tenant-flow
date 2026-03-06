'use client'

import { ErrorPage } from '#components/shared/error-page'

/**
 * Error boundary for owner dashboard routes
 * IMPORTANT: This error component is rendered INSIDE the owner layout which already has
 * sidebar and header. Do NOT duplicate layout components here.
 */
export default function DashboardError({
	error,
	resetAction
}: {
	error: Error & { digest?: string }
	resetAction: () => void
}) {
	return <ErrorPage error={error} resetAction={resetAction} dashboardHref="/dashboard" />
}
