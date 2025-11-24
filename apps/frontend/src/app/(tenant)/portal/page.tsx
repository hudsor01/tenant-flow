import TenantPortalPage from '../tenant/tenant-portal-page'

/**
 * Tenant Portal Homepage
 * URL: /portal
 *
 * Main tenant dashboard showing lease info, payments, and maintenance.
 * Auth: Protected by middleware role checks
 */
export default function PortalPage() {
	return <TenantPortalPage />
}
