import { TenantShell } from '#components/shell/tenant-shell'
import type { ReactNode } from 'react'

/**
 * Tenant Portal Layout
 *
 * Uses the design-os TenantShell pattern:
 * - Sidebar navigation for desktop
 * - Bottom navigation bar for mobile
 * - Header with breadcrumbs and user menu
 *
 * Auth is handled by proxy.ts - this is purely presentational.
 */
export default function TenantLayout({
	children,
	modal
}: {
	children: ReactNode
	modal?: ReactNode
}) {
	return (
		<TenantShell>
			{children}
			{modal}
		</TenantShell>
	)
}
