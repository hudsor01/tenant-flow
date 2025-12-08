'use client'

import { usePathname } from 'next/navigation'
import { TenantMobileNav } from '#components/dashboard/tenant-mobile-nav'

/**
 * Determines if the current path is a sub-page (not a main nav item)
 */
function isSubPage(pathname: string): boolean {
	const mainPages = [
		'/tenant',
		'/tenant/payments',
		'/tenant/maintenance',
		'/tenant/settings'
	]

	// Exact match for main pages
	if (mainPages.includes(pathname)) {
		return false
	}

	// Check if it's a nested route under a main page
	const isNestedPayments =
		pathname.startsWith('/tenant/payments/') && pathname !== '/tenant/payments'
	const isNestedMaintenance =
		pathname.startsWith('/tenant/maintenance/') &&
		pathname !== '/tenant/maintenance'
	const isNestedSettings =
		pathname.startsWith('/tenant/settings/') && pathname !== '/tenant/settings'

	return isNestedPayments || isNestedMaintenance || isNestedSettings
}

/**
 * Client component for mobile navigation in tenant layout
 * Shows mobile bottom navigation on viewports < 768px
 */
export function TenantMobileNavWrapper() {
	const pathname = usePathname()

	return (
		<div className="md:hidden" data-testid="tenant-mobile-nav-wrapper">
			<TenantMobileNav currentPath={pathname} isSubPage={isSubPage(pathname)} />
		</div>
	)
}
