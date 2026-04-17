export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Auth-walled. Block search engines from indexing tenant portal pages.
export const metadata: Metadata = {
	robots: { index: false, follow: false }
}

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
export default function TenantLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
