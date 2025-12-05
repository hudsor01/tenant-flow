import ModalLayout from '#components/layout/modal-layout'
import type { ReactNode } from 'react'

interface RouteLayoutProps {
	children: ReactNode
	modal?: ReactNode
}

/**
 * Generic Route Layout Component
 *
 * Provides modal slot support for route groups that need intercepting routes.
 * Used for owner dashboard sections like properties, units, tenants, leases, maintenance.
 *
 * Configurable props can be added here for route-specific behavior.
 */
export default function RouteLayout({ children, modal }: RouteLayoutProps) {
	return <ModalLayout modal={modal}>{children}</ModalLayout>
}