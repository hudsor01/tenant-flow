import { AppShell } from '#components/shell/app-shell'
import { SubscriptionStatusBanner } from '#components/billing/subscription-status-banner'
import type { ReactNode } from 'react'

/**
 * Owner Dashboard Layout
 *
 * Uses the design-os AppShell pattern:
 * - Sidebar navigation with command palette trigger
 * - Header with breadcrumbs and user menu
 * - Floating quick actions dock
 * - SubscriptionStatusBanner at top for past_due/unpaid/canceled states
 *
 * Auth is handled by proxy.ts - this is purely presentational.
 */
export async function OwnerDashboardLayout({
	children
}: {
	children: ReactNode
}) {
	return (
		<AppShell>
			<SubscriptionStatusBanner />
			{children}
		</AppShell>
	)
}
