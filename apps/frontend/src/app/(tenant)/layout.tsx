import { MobileChrome } from '#components/layout/mobile-chrome'
import type { ReactNode } from 'react'

/**
 * Tenant Portal Layout (Next.js 16 Pattern)
 *
 * Auth Strategy:
 * - Proxy enforces auth and role validation
 * - This layout only renders UI components
 * - No auth checks needed (proxy guarantees TENANT role)
 */
export default function TenantLayout({
	children
}: {
	children: ReactNode
}) {
	return <MobileChrome>{children}</MobileChrome>
}
