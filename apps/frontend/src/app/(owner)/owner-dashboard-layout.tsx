import { AppShell } from '#components/shell/AppShell'
import type { ReactNode } from 'react'

/**
 * Owner Dashboard Layout
 *
 * Uses the design-os AppShell pattern:
 * - Sidebar navigation with command palette trigger
 * - Header with breadcrumbs and user menu
 * - Floating quick actions dock
 *
 * Auth is handled by proxy.ts - this is purely presentational.
 */
export async function OwnerDashboardLayout({
	children
}: {
	children: ReactNode
}) {
	return <AppShell>{children}</AppShell>
}
