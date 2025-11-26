import type { ReactNode } from 'react'

/**
 * Tenant Portal Route Group Layout
 *
 * This is a passthrough layout. The actual dashboard layout with sidebar,
 * header, and auth guard is defined in the nested /tenant/layout.tsx file.
 *
 * Structure:
 * - (tenant)/layout.tsx → passthrough (this file)
 * - (tenant)/tenant/layout.tsx → TenantSidebar, SiteHeader, TenantGuard
 */
export default function TenantLayout({
	children
}: {
	children: ReactNode
}) {
	return <>{children}</>
}
